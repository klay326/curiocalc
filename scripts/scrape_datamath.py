#!/usr/bin/env python3
"""
Scrape all TI calculator models from datamath.org and seed into DB.
Run inside the backend container after copying:
  docker cp scripts/scrape_datamath.py curiocalc-backend-1:/app/scrape_datamath.py
  docker exec curiocalc-backend-1 python /app/scrape_datamath.py

Or locally with DB access:
  DATABASE_URL=... python scripts/scrape_datamath.py
"""
import asyncio
import os
import re
import sys
import pathlib

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://curiocalc:changeme@localhost:5432/curiocalc",
)

BASE = "http://www.datamath.org"
# Must use a real browser UA — site returns parking page for bots
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Referer": BASE + "/",
}

ALBUM_PAGES = [
    "/Album_Basic.htm",
    "/Album_Desktop.htm",
    "/Album_Sci.htm",
    "/Album_Graph.htm",
    "/Album_Edu.htm",
    "/Album_Speech.htm",
    "/Album_Personal.htm",
    "/Album_Others.htm",
]

ALBUM_TYPE_MAP = {
    "Album_Basic": "basic",
    "Album_Desktop": "desktop",
    "Album_Sci": "scientific",
    "Album_Graph": "graphing",
    "Album_Edu": "educational",
    "Album_Speech": "novelty",
    "Album_Personal": "other",
    "Album_Others": "other",
}


def normalize_display_type(raw: str) -> str:
    r = raw.lower()
    if "led" in r:
        return "LED"
    if "lcd" in r or "liquid" in r:
        return "LCD"
    if "vfd" in r or "vacuum" in r or "fluorescent" in r:
        return "VFD"
    if "plasma" in r:
        return "VFD"
    if "nixie" in r:
        return "nixie"
    if "electroluminescent" in r or " el " in r:
        return "EL"
    return "LCD"


def normalize_power(raw: str) -> str:
    r = raw.lower()
    if "solar" in r and ("battery" in r or "lithium" in r or "aa" in r):
        return "solar+battery"
    if "solar" in r or "light" in r:
        return "solar"
    if "ac" in r and "battery" not in r:
        return "AC"
    return "battery"


def normalize_country(raw: str) -> str:
    mapping = {
        "U.S.A.": "USA", "U.S.A": "USA", "United States": "USA",
        "Made in U.S.A.": "USA", "Made in USA": "USA",
        "Taiwan, R.O.C.": "Taiwan", "Taiwan R.O.C.": "Taiwan",
        "People's Republic of China": "China", "P.R.C.": "China",
    }
    r = raw.strip()
    return mapping.get(r, r) if r else "USA"


def infer_calc_type(model_name: str, album_type: str) -> str:
    mn = model_name.upper()
    patterns = [
        (r"TI-5[0-9]{3}|5[0-9]{3}\s*SV|PRINTING|PRINTER", "printing"),
        (r"TI-(81|82|83|84|85|86|89|92)|VOYAGE|NSPIRE|CC-40|CC-70|GRAPHING", "graphing"),
        (r"TI-(57|58|59|66|68|74|95)|PC-[0-9]|SR-52|SR-56|SR-60|PROGRAMMABLE", "programmable"),
        (r"MBA|BUSINESS ANALYST|FINANCIAL|BA-?II|MONEY|INVEST", "financial"),
        (r"SPEAK|LITTLE PROFESSOR|DATAMAN|MATH MAGIC|QUIZ", "novelty"),
        (r"SR-[0-9]+|TI-(30|35|45|55|56)|TI-[0-9]{4}[A-Z]*", "scientific"),
    ]
    for pattern, ctype in patterns:
        if re.search(pattern, mn):
            return ctype
    return album_type


def infer_tags(model_name: str, desc: str, calc_type: str, year: int | None) -> list[str]:
    tags = []
    mn = model_name.lower()
    dl = (desc or "").lower()

    if calc_type == "graphing":        tags.append("graphing")
    if calc_type == "programmable":    tags.append("programmable")
    if "rpn" in dl or "reverse polish" in dl: tags.append("rpn")
    if "solar" in dl:                  tags.append("solar")
    if "led" in dl:                    tags.append("led")
    if "speech" in dl or "speak" in mn or "voice" in dl: tags.append("speech")
    if "game" in dl or "game" in mn:   tags.append("game")
    if "qwerty" in dl:                 tags.append("qwerty")
    if "cas" in dl or "algebra" in dl: tags.append("cas")
    if "space" in dl or "nasa" in dl or "shuttle" in dl: tags.append("space")
    if "pocket" in dl:                 tags.append("pocket")
    if year and year < 1975:           tags.extend(["vintage", "historic"])
    elif year and year < 1985:         tags.append("vintage")

    return list(dict.fromkeys(tags))


def infer_rarity(model_name: str, year: int | None, calc_type: str, desc: str) -> float:
    score = 3.0
    dl = (desc or "").lower()
    if year:
        if year < 1973:    score += 5.0
        elif year < 1976:  score += 3.5
        elif year < 1980:  score += 2.5
        elif year < 1985:  score += 1.5
        elif year < 1990:  score += 0.5
    if "prototype" in dl or "rare" in dl: score += 2.0
    if "first" in dl and "world" in dl:   score += 2.0
    if calc_type in ("novelty", "desktop"): score += 1.0
    if "space" in dl or "nasa" in dl:     score += 1.0
    return round(min(score, 9.9), 1)


def infer_weirdness(model_name: str, calc_type: str, desc: str) -> float:
    score = 2.0
    dl = (desc or "").lower()
    mn = model_name.lower()
    if calc_type == "novelty":          score += 4.0
    if "speak" in mn or "speech" in dl: score += 4.0
    if "watch" in dl:                   score += 3.5
    if "game" in dl or "game" in mn:    score += 3.0
    if "qwerty" in dl:                  score += 2.5
    if "touch" in dl or "stylus" in dl: score += 2.0
    if "magnetic card" in dl:           score += 1.5
    if calc_type == "printing":         score += 1.0
    return round(min(score, 9.9), 1)


def extract_model_name(raw: str) -> str:
    """
    'Texas Instruments TI-2500 / Datamath Version 1'  →  'TI-2500'
    'Texas Instruments SR-50 (Version 1)'             →  'SR-50'
    'Texas Instruments TI-84 Plus Silver Edition'     →  'TI-84 Plus Silver Edition'
    """
    s = raw.strip()
    for prefix in ("Texas Instruments ", "TI "):
        if s.startswith(prefix):
            s = s[len(prefix):]
            break
    # Strip " / Datamath..." section
    s = re.sub(r"\s*/\s*Datamath.*$", "", s, flags=re.IGNORECASE)
    # Strip version suffixes
    s = re.sub(r"\s*\(?version\s+\d+[^)]*\)?$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*\(prototype[^)]*\)", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s*\(pre-?production[^)]*\)", "", s, flags=re.IGNORECASE)
    # Strip trailing junk
    s = s.strip(" /,.-")
    return s


def parse_alternating_fields(lines: list[str]) -> dict[str, str]:
    """
    Datamath pages have fields like:
        "Date of introduction:"
        "September 21, 1972"
    Parse these label→value pairs.
    """
    fields: dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        # A label line ends with ":" and is short (< 60 chars)
        if line.endswith(":") and len(line) < 60:
            label = line[:-1].strip().lower()
            # Value is the next non-empty line(s) that don't look like another label
            values = []
            j = i + 1
            while j < len(lines) and j < i + 4:
                next_line = lines[j].strip()
                if next_line and not (next_line.endswith(":") and len(next_line) < 60):
                    # Skip lines that are clearly not values (navigation text, etc.)
                    if len(next_line) > 0 and not next_line.startswith("<!--"):
                        values.append(next_line)
                        # Only take the first value line for most fields
                        # But for multiline values (e.g. size), stop if we see another label
                        break
                elif next_line.endswith(":"):
                    break
                j += 1
            if values:
                fields[label] = " ".join(values)
        i += 1
    return fields


async def fetch(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        r = await client.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        if r.status_code == 200:
            return r.content.decode("latin-1", errors="replace")
        return None
    except Exception as e:
        print(f"  ERR fetching {url}: {e}")
        return None


async def collect_album_links(client: httpx.AsyncClient) -> list[tuple[str, str]]:
    """Return list of (absolute_url, album_type) for all individual calc pages."""
    all_links: list[tuple[str, str]] = []

    for album_path in ALBUM_PAGES:
        album_name = album_path.lstrip("/").replace(".htm", "")
        default_type = ALBUM_TYPE_MAP.get(album_name, "other")

        html = await fetch(client, BASE + album_path)
        if not html:
            print(f"  Skipping album (failed): {album_path}")
            continue

        soup = BeautifulSoup(html, "html.parser")
        count = 0
        for a in soup.find_all("a", href=True):
            href = a["href"]
            # Match relative .htm links that point to sub-directories (1 or 2 levels)
            # e.g. "BASIC/DATAMATH/ti-2500-1.htm" or "Graphing/CC-40P.htm"
            # Exclude: anchors (#), external, index.htm, Album_*.htm, Featured_*.htm
            if not href.startswith(("http", "#", "mailto", "javascript")):
                if href.lower().endswith(".htm") and "/" in href:
                    basename = href.split("/")[-1].lower()
                    if basename not in ("index.htm",) and not basename.startswith(("album_", "featured_", "index_")):
                        full_url = BASE + "/" + href.lstrip("/")
                        all_links.append((full_url, default_type))
                        count += 1

        print(f"  {album_name}: {count} links")

    print(f"Total raw links: {len(all_links)}")
    return all_links


def deduplicate_links(links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Keep only one page per unique base model slug."""
    seen: dict[str, tuple[str, str]] = {}

    def version_key(url: str) -> int:
        # prefer lower version numbers; no version suffix = 0
        m = re.search(r"-[vV]?(\d+)[a-zA-Z]?\.htm$", url)
        if m:
            return int(m.group(1))
        return 0

    for url, album_type in links:
        filename = url.split("/")[-1].lower()
        # Normalize slug: strip version suffix like -1, -v1, -V1D2
        base_slug = re.sub(r"-[vV]?\d+[a-zA-Z0-9]*\.htm$", ".htm", filename)
        base_slug = re.sub(r"\.htm$", "", base_slug)

        if base_slug not in seen:
            seen[base_slug] = (url, album_type)
        else:
            # Prefer lower version
            if version_key(url) < version_key(seen[base_slug][0]):
                seen[base_slug] = (url, album_type)

    return list(seen.values())


async def parse_calc_page(client: httpx.AsyncClient, url: str, album_type: str) -> dict | None:
    """Fetch and parse one calculator page. Returns None if not a TI calc or unparseable."""
    html = await fetch(client, url)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")

    # Get all text lines, stripped
    all_text = soup.get_text(separator="\n")
    lines = [l.strip() for l in all_text.split("\n")]
    nonempty = [l for l in lines if l]

    # Find the "Texas Instruments <Model>" line
    ti_line = None
    ti_idx = -1
    for i, line in enumerate(nonempty):
        if line.startswith("Texas Instruments ") and len(line) < 120:
            ti_line = line
            ti_idx = i
            break

    if not ti_line:
        return None  # Not a TI page (or non-TI brand on Others album)

    model_name = extract_model_name(ti_line)
    if not model_name or len(model_name) < 2:
        return None

    # Parse structured fields from lines after the title
    fields_lines = nonempty[ti_idx + 1 : ti_idx + 80]
    fields = parse_alternating_fields(fields_lines)

    # --- Extract fields ---
    date_str = fields.get("date of introduction", "")
    year = None
    if date_str:
        m = re.search(r"\b(19|20)\d{2}\b", date_str)
        if m:
            year = int(m.group(0))

    display_raw = fields.get("display technology", fields.get("display type", ""))
    display_type = normalize_display_type(display_raw) if display_raw else "LCD"

    power_raw = fields.get("power source", fields.get("batteries", ""))
    power = normalize_power(power_raw) if power_raw else "battery"

    country_raw = fields.get("origin of manufacture", "")
    country = normalize_country(country_raw) if country_raw else "USA"

    # Description: look for longer paragraph text
    description = ""
    for p in soup.find_all("p"):
        text = p.get_text(separator=" ", strip=True)
        # Skip nav paragraphs and short ones
        if len(text) > 100 and "Texas Instruments" not in text[:20]:
            description = text[:800]
            break

    # Fallback: look for a long line not in structured fields zone
    if not description:
        for line in nonempty[ti_idx + 20:]:
            if len(line) > 100 and not line.endswith(":") and "/" not in line[:10]:
                description = line[:800]
                break

    # Infer all the scored/tagged fields
    calc_type = infer_calc_type(model_name, album_type)
    tags = infer_tags(model_name, description, calc_type, year)
    rarity = infer_rarity(model_name, year, calc_type, description)
    weirdness = infer_weirdness(model_name, calc_type, description)

    # Landmark overrides
    LANDMARK = {
        "TI-2500":          (9.0, 6.0),
        "SR-50":            (8.5, 5.5),
        "SR-51":            (8.0, 5.0),
        "SR-52":            (8.5, 6.0),
        "SR-56":            (7.5, 5.5),
        "TI-57":            (7.0, 5.0),
        "TI-58":            (7.5, 5.5),
        "TI-59":            (8.0, 6.0),
        "TI-30":            (4.5, 2.0),
        "TI-81":            (5.5, 3.0),
        "TI-82":            (4.0, 2.5),
        "TI-83":            (3.5, 2.0),
        "TI-83 Plus":       (3.0, 1.5),
        "TI-84 Plus":       (2.5, 1.5),
        "TI-89":            (5.0, 4.5),
        "TI-89 Titanium":   (4.5, 4.0),
        "TI-92":            (6.5, 7.5),
        "Little Professor":  (6.5, 7.0),
        "Speak & Math":     (7.0, 9.0),
        "Dataman":          (7.0, 8.0),
        "CC-40":            (6.0, 5.0),
    }
    if model_name in LANDMARK:
        rarity, weirdness = LANDMARK[model_name]

    return {
        "make": "TI",
        "model": model_name,
        "year_introduced": year,
        "calc_type": calc_type,
        "display_type": display_type,
        "power_source": power,
        "country_of_origin": country,
        "description": description or f"Texas Instruments {model_name}.",
        "tags": tags,
        "rarity_score": rarity,
        "weirdness_score": weirdness,
        "images": [],
        "external_refs": [{"label": "Datamath Museum", "url": url}],
        "status": "pending",
    }


async def run_scraper():
    print("=" * 60)
    print("CurioCalc — Datamath.org TI Calculator Scraper")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=20) as client:
        print("\n[1/4] Collecting album links...")
        raw_links = await collect_album_links(client)

        print("\n[2/4] Deduplicating...")
        unique_links = deduplicate_links(raw_links)
        print(f"Unique calculator pages: {len(unique_links)}")

        print("\n[3/4] Parsing calculator pages...")
        calcs: list[dict] = []
        errors = 0
        seen_models: set[str] = set()

        for i, (url, album_type) in enumerate(unique_links):
            data = await parse_calc_page(client, url, album_type)
            if data is None:
                errors += 1
                continue

            key = data["model"].lower().strip()
            if key in seen_models:
                continue
            seen_models.add(key)
            calcs.append(data)

            if (i + 1) % 50 == 0:
                print(f"  {i+1}/{len(unique_links)} pages → {len(calcs)} unique calcs")

            await asyncio.sleep(0.2)  # polite crawl delay

        print(f"\nParsed {len(calcs)} unique TI calculators ({errors} skipped/failed)")

        # Show sample
        if calcs:
            print("\nSample calcs found:")
            for c in calcs[:5]:
                print(f"  {c['model']} ({c.get('year_introduced','?')}) — {c['calc_type']}")

    print("\n[4/4] Seeding to database...")
    await seed_to_db(calcs)


async def seed_to_db(calcs: list[dict]):
    engine_url = DATABASE_URL
    if "asyncpg" not in engine_url:
        engine_url = engine_url.replace("postgresql://", "postgresql+asyncpg://")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, and_
    from app.models.calculator import Calculator

    engine = create_async_engine(engine_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    added = 0
    skipped = 0

    async with async_session() as session:
        for data in calcs:
            result = await session.execute(
                select(Calculator).where(
                    and_(
                        Calculator.make == data["make"],
                        Calculator.model == data["model"],
                    )
                ).limit(1)
            )
            if result.scalar_one_or_none():
                skipped += 1
                continue

            session.add(Calculator(**data))
            added += 1

        await session.commit()

    await engine.dispose()
    print(f"\n✅ Done! Added {added} new TI calculators, skipped {skipped} already in DB")
    print(f"   Total attempted: {len(calcs)}")


if __name__ == "__main__":
    asyncio.run(run_scraper())
