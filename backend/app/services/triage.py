"""
Review-queue triage for pending (mostly scraped) calculators.

Pure functions so the rules are easy to test. Nothing here changes data —
the admin UI shows the verdicts and a human still approves or rejects.

Verdicts (most to least severe):
  not_calc   — scraped page text, an accessory, or an organizer/PDA — not a calculator
  duplicate  — same make+model as an approved calc, or a better pending copy
  needs_fix  — name looks truncated by the scraper; needs a human to rename
  fixable    — "(1993)" year stuck on the name, or broken characters (™ saved as \x99)
  ready      — clean name and a year; safe to approve in bulk
  no_year    — clean name but no year; fine to approve, less complete
"""
import re
from dataclasses import dataclass, field

_YEAR_SUFFIX = re.compile(r"\s*\(((?:19|20)\d\d)\)\s*$")
# Trailing words/punctuation that mean the scraper cut the name off mid-phrase
_TRUNCATED_TAIL = re.compile(
    r"(?:\b(?:distributed|by|and|or|der|die|das|the|for|with|of|version|to|und|et)|[&,/(\-])\s*$",
    re.IGNORECASE,
)


# Mis-decoded Windows-1252 bytes (C1 controls) and non-breaking spaces from the scrape.
_BAD_CHARS = re.compile(r"[\x80-\x9f\xa0]")

# Scraped sentence fragments rather than model names
_PROSE = re.compile(
    # lowercase start with 4+ words · "word. Next" sentence break · narrative verbs · bare "calculator"
    r"^[a-z]\S*(?:\s+\S+){3,}|[a-z]{3,}\.\s+[A-Z]|\b(?:manufactur\w*|reveals|switched|ceased|discovered)\b"
    r"|^calculators?$",
)
# Accessories and add-ons sold alongside calculators
_ACCESSORY = re.compile(
    r"\b(?:docking|cradle|keypad|touchpad|clickpad|kbd|navigator|rechargeable|presentation link|"
    r"viewscreen panel|wireless|calculator-based|personal learning tool|color slide|printer)\b",
    re.IGNORECASE,
)
# Organizers, planners, PDAs and spell-checkers
_ORGANIZER = re.compile(
    r"\b(?:pocketmate|organi[sz]er|planner|avigo|spell-checker|day runner)\b|^PS-(?:\d|CARD)",
    re.IGNORECASE,
)


def clean_chars(model: str) -> str:
    """Drop mis-decoded ™/® bytes, turn non-breaking spaces into spaces, collapse runs of spaces."""
    s = model.replace("\xa0", " ")
    s = re.sub(r"[\x80-\x9f]", "", s)
    return re.sub(r"\s{2,}", " ", s).strip()


def not_a_calculator(model: str) -> str | None:
    m = model.strip()
    if _PROSE.search(m):
        return "scraped text, not a model name"
    if _ACCESSORY.search(m):
        return "accessory"
    if _ORGANIZER.search(m):
        return "organizer / PDA"
    return None


def dedupe_key(make: str, model: str) -> str:
    """Case/punctuation-insensitive identity. Keeps '+' — the HP-48G+ is not the HP-48G.
    A leading brand prefix is ignored, so "TI-Voyage 200" and "Voyage 200" match."""
    mk = re.sub(r"[^a-z0-9]", "", make.lower())
    md = re.sub(r"[^a-z0-9+]", "", clean_chars(model).lower())
    if mk and md.startswith(mk) and len(md) > len(mk):
        md = md[len(mk):]
    return f"{mk}|{md}"


def name_issues(model: str) -> list[str]:
    m = model.strip()
    issues = []
    if m.count("(") != m.count(")"):
        issues.append("unclosed bracket")
    if m.count('"') % 2:
        issues.append("unclosed quote")
    if _TRUNCATED_TAIL.search(m) or re.search(r"\bdistributed\b", m, re.IGNORECASE):
        issues.append("cut-off name")
    if len(m) <= 2:
        issues.append("name too short")
    return issues


@dataclass
class Candidate:
    id: str
    make: str
    model: str
    year: int | None
    created_order: int  # lower = older


@dataclass
class Verdict:
    verdict: str
    issues: list[str] = field(default_factory=list)
    duplicate_of: str | None = None          # calculator id
    duplicate_of_label: str | None = None    # "approved" | "pending"
    suggested_model: str | None = None
    suggested_year: int | None = None

    def as_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v not in (None, [])} | {"verdict": self.verdict}


def _quality(c: Candidate) -> tuple:
    """Higher is better — used to pick which pending copy survives a duplicate group."""
    return (not name_issues(c.model), c.year is not None, -c.created_order)


def triage(pending: list[Candidate], approved: list[tuple[str, str, str]]) -> dict[str, Verdict]:
    """approved: (id, make, model). Returns verdicts keyed by pending id."""
    approved_by_key = {}
    for aid, make, model in approved:
        approved_by_key.setdefault(dedupe_key(make, model), aid)

    groups: dict[str, list[Candidate]] = {}
    for c in pending:
        groups.setdefault(dedupe_key(c.make, c.model), []).append(c)

    out: dict[str, Verdict] = {}
    for key, members in groups.items():
        keeper = None
        if key in approved_by_key:
            for c in members:
                out[c.id] = Verdict("duplicate", duplicate_of=approved_by_key[key], duplicate_of_label="approved")
            continue
        if len(members) > 1:
            keeper = max(members, key=_quality)
            for c in members:
                if c is not keeper:
                    out[c.id] = Verdict("duplicate", duplicate_of=keeper.id, duplicate_of_label="pending")

        for c in members:
            if c.id in out:
                continue
            reason = not_a_calculator(c.model)
            if reason:
                out[c.id] = Verdict("not_calc", issues=[reason])
                continue
            issues = name_issues(c.model)
            m = _YEAR_SUFFIX.search(c.model)
            if issues:
                out[c.id] = Verdict("needs_fix", issues=issues)
            elif _BAD_CHARS.search(c.model):
                out[c.id] = Verdict("fixable", issues=["broken characters"], suggested_model=clean_chars(c.model))
            elif m:
                year = int(m.group(1))
                out[c.id] = Verdict(
                    "fixable",
                    issues=["year in name"],
                    suggested_model=_YEAR_SUFFIX.sub("", c.model).strip(),
                    suggested_year=year if c.year is None else None,
                )
            elif c.year is None:
                out[c.id] = Verdict("no_year")
            else:
                out[c.id] = Verdict("ready")
    return out
