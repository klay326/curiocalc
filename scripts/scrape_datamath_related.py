#!/usr/bin/env python3
"""
Scrape all calculators from datamath.org/Album_Related.htm (80 non-TI brands).
Facts only — no descriptions scraped to avoid copyright concerns.

Run:
  docker cp scripts/scrape_datamath_related.py curiocalc-backend-1:/app/scrape_datamath_related.py
  docker exec curiocalc-backend-1 python /app/scrape_datamath_related.py
"""
import asyncio, os, re, sys, pathlib

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://curiocalc:changeme@localhost:5432/curiocalc",
)

BASE = "http://www.datamath.org"
ALBUM_URL = BASE + "/Album_Related.htm"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": BASE + "/",
}

# Map directory name → canonical make
BRAND_MAP = {
    "HewlettPackard":    "HP",
    "NationalSemi":      "National Semiconductor",
    "FaberCastel":       "Faber-Castell",
    "OfficeDepot":       "Office Depot",
    "CyberneticSystems": "Cybernetic Systems",
    "RFT":               "RFT",
    "MBO":               "MBO",
    "IMA":               "IMA",
    "KMC":               "KMC",
    "APF":               "APF",
    "ITT":               "ITT",
    "TA":                "TA",
}

# Common brand title prefixes to strip when extracting model name
# e.g., "Hewlett-Packard HP-35" → strip "Hewlett-Packard " → "HP-35"
BRAND_PREFIXES = {
    "HP":                     ["Hewlett-Packard ", "HP "],
    "Canon":                  ["Canon "],
    "Casio":                  ["CASIO ", "Casio "],
    "Sharp":                  ["SHARP ", "Sharp "],
    "Bowmar":                 ["Bowmar "],
    "Commodore":              ["Commodore "],
    "Heathkit":               ["Heathkit "],
    "Sinclair":               ["Sinclair "],
    "Toshiba":                ["Toshiba "],
    "Sanyo":                  ["Sanyo "],
    "Rockwell":               ["Rockwell "],
    "National Semiconductor": ["National Semiconductor "],
    "Litronix":               ["Litronix "],
    "Lloyds":                 ["Lloyds "],
    "Royal":                  ["Royal "],
    "Unisonic":               ["Unisonic "],
    "Olympia":                ["Olympia "],
    "Panasonic":              ["Panasonic "],
    "Brother":                ["Brother "],
    "Aurora":                 ["Aurora "],
    "Craig":                  ["Craig "],
    "Aristo":                 ["Aristo "],
    "Citizen":                ["Citizen "],
}


def canonical_make(dir_name: str) -> str:
    """Convert directory name to canonical brand name."""
    return BRAND_MAP.get(dir_name, dir_name)


def extract_model(title_line: str, make: str) -> str | None:
    """
    Strip brand prefix from title line to get model name.
    'Hewlett-Packard HP-35' → 'HP-35'
    'Canon Pocketronic'     → 'Pocketronic'
    'CASIO fx-7000G'        → 'fx-7000G'
    """
    s = title_line.strip()
    # Replace non-breaking spaces
    s = s.replace("\xa0", " ").strip()

    # Try known prefixes for this make
    for prefix in BRAND_PREFIXES.get(make, []):
        if s.lower().startswith(prefix.lower()):
            return s[len(prefix):].strip()

    # Generic: strip the first word(s) if they match the make
    # Try progressively longer word combos
    words = s.split()
    for n in range(min(4, len(words)), 0, -1):
        candidate_prefix = " ".join(words[:n])
        if candidate_prefix.lower().replace("-", "").replace(" ", "") == make.lower().replace("-", "").replace(" ", ""):
            model = " ".join(words[n:]).strip()
            if model:
                return model

    # Last resort: if title starts with make name (case-insensitive), strip it
    if s.lower().startswith(make.lower()):
        return s[len(make):].strip(" -/")

    # If nothing worked, return the whole thing (we'll filter too-short results)
    return s


def normalize_display(raw: str) -> str:
    r = raw.lower()
    if "led" in r:       return "LED"
    if "lcd" in r:       return "LCD"
    if "vfd" in r or "fluorescent" in r or "vacuum" in r: return "VFD"
    if "plasma" in r:    return "VFD"
    if "thermal" in r or "paper" in r: return "thermal"
    return "LCD"


def normalize_power(raw: str) -> str:
    r = raw.lower()
    if "solar" in r and ("battery" in r or "aa" in r or "cell" in r):
        return "solar+battery"
    if "solar" in r:  return "solar"
    if "ac" in r and "battery" not in r: return "AC"
    return "battery"


def normalize_country(raw: str) -> str:
    m = {
        "U.S.A.": "USA", "U.S.A": "USA", "United States": "USA",
        "Made in U.S.A.": "USA", "Made in USA": "USA",
        "Taiwan, R.O.C.": "Taiwan", "Taiwan R.O.C.": "Taiwan",
        "People's Republic of China": "China", "P.R.C.": "China",
        "West Germany": "Germany", "East Germany": "Germany",
    }
    r = raw.strip()
    return m.get(r, r) if r else None


def infer_calc_type(make: str, model: str) -> str:
    mn = model.upper()
    mk = make.upper()
    if re.search(r"HP-(2[0-9]|3[0-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|8[0-9]|9[0-9])", model):
        if re.search(r"HP-(4[1-9]|[5-9][0-9]|28|38|48|49|50)", model):
            return "programmable"
        return "scientific"
    if re.search(r"HP-(12|17|18|19|2[0-9]B|30B|37|38|10B|10b)", model, re.IGNORECASE):
        return "financial"
    if re.search(r"HP-(75|71|85|87|9[0-9]|41)", model):
        return "programmable"
    if re.search(r"FX-|ALGEBRA|CLASSPAD|GRAPH", mn): return "graphing"
    if re.search(r"PRINT|PRINTER|ADDING", mn):        return "printing"
    if re.search(r"SPEAK|PROFESSOR|DATAMAN", mn):     return "novelty"
    if re.search(r"BUSINESS|FINANCIAL|MONEY|MBA|PROFIT|INVESTOR", mn): return "financial"
    if re.search(r"PROGRAMM|PC-[0-9]", mn):           return "programmable"
    return "scientific"


def infer_tags(make: str, model: str, calc_type: str, year: int | None) -> list[str]:
    tags = []
    mn = model.lower()
    if make == "HP": tags.append("rpn")
    if calc_type == "programmable": tags.append("programmable")
    if calc_type == "graphing":     tags.append("graphing")
    if calc_type == "financial":    tags.append("financial")
    if "solar" in mn:               tags.append("solar")
    if year and year < 1975:        tags.extend(["vintage", "historic"])
    elif year and year < 1985:      tags.append("vintage")
    if "led" in mn:                 tags.append("led")
    return list(dict.fromkeys(tags))


def infer_rarity(make: str, model: str, year: int | None) -> float:
    score = 3.0
    if year:
        if year < 1973:   score += 5.0
        elif year < 1976: score += 3.5
        elif year < 1980: score += 2.5
        elif year < 1985: score += 1.5
        elif year < 1990: score += 0.5
    # Well-known landmark HP models
    landmarks = {
        "HP-35": 9.0, "HP-65": 9.5, "HP-01": 9.8, "HP-41C": 7.5,
        "HP-41CV": 7.0, "HP-41CX": 7.5, "HP-48GX": 6.5, "HP-12C": 4.5,
        "HP-15C": 8.5, "HP-16C": 8.5,
    }
    if model in landmarks:
        return landmarks[model]
    return round(min(score, 9.9), 1)


def parse_alternating_fields(lines: list[str]) -> dict[str, str]:
    fields: dict[str, str] = {}
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if line.endswith(":") and len(line) < 60:
            label = line[:-1].strip().lower()
            j = i + 1
            while j < len(lines):
                nxt = lines[j].strip()
                if nxt and not (nxt.endswith(":") and len(nxt) < 60):
                    fields[label] = nxt
                    break
                elif nxt.endswith(":"):
                    break
                j += 1
        i += 1
    return fields


async def fetch(client: httpx.AsyncClient, url: str) -> str | None:
    try:
        r = await client.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        return r.content.decode("latin-1", errors="replace") if r.status_code == 200 else None
    except Exception as e:
        print(f"  ERR {url}: {e}")
        return None


async def collect_links(client: httpx.AsyncClient) -> list[tuple[str, str]]:
    """Return (full_url, dir_brand) for all calc pages in Album_Related."""
    html = await fetch(client, ALBUM_URL)
    if not html:
        raise RuntimeError("Could not fetch Album_Related.htm")

    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if (href.lower().endswith(".htm")
                and href.startswith("Related/")
                and href.count("/") == 2
                and "index" not in href.lower()
                and "featured" not in href.lower()):
            parts = href.split("/")
            dir_brand = parts[1]
            full_url = BASE + "/" + href
            links.append((full_url, dir_brand))

    return links


def deduplicate(links: list[tuple[str, str]]) -> list[tuple[str, str]]:
    seen: dict[str, tuple[str, str]] = {}
    for url, brand in links:
        filename = url.split("/")[-1].lower()
        slug = re.sub(r"\.htm$", "", filename)
        slug = re.sub(r"[-_]v?\d+[a-z]?$", "", slug)  # strip version suffix
        key = f"{brand}:{slug}"
        if key not in seen:
            seen[key] = (url, brand)
        else:
            # prefer lower version number
            def ver(u):
                m = re.search(r"[-_](\d+)[a-z]?\.htm$", u, re.IGNORECASE)
                return int(m.group(1)) if m else 0
            if ver(url) < ver(seen[key][0]):
                seen[key] = (url, brand)
    return list(seen.values())


async def parse_page(client: httpx.AsyncClient, url: str, dir_brand: str) -> dict | None:
    html = await fetch(client, url)
    if not html:
        return None

    soup = BeautifulSoup(html, "html.parser")
    all_text = soup.get_text(separator="\n")
    lines = [l.strip() for l in all_text.split("\n")]
    nonempty = [l for l in lines if l]

    make = canonical_make(dir_brand)

    # Find the title line — first line that starts with a known brand variant
    title_line = None
    title_idx = -1
    brand_variants = [make] + [p.rstrip() for p in BRAND_PREFIXES.get(make, [])]
    # Also try common capitalizations
    for prefix in [
        make, make.upper(), make.lower(),
        "Hewlett-Packard", "CASIO", "SHARP", "Sharp",
        dir_brand,
    ] + brand_variants:
        for i, line in enumerate(nonempty):
            clean = line.replace("\xa0", " ").strip()
            if clean.lower().startswith(prefix.lower()) and 3 < len(clean) < 100:
                # Make sure it's not a navigation/header line
                if "MUSEUM" not in clean.upper() and "DATAMATH" not in clean.upper() and "ZOOM" not in clean.upper():
                    title_line = clean
                    title_idx = i
                    break
        if title_line:
            break

    if not title_line:
        return None

    model = extract_model(title_line, make)
    if not model or len(model) < 2:
        return None

    # Strip version suffixes from model
    model = re.sub(r"\s*\([^)]*version\s+\d+[^)]*\)$", "", model, flags=re.IGNORECASE).strip()
    model = re.sub(r"\s*\(prototype[^)]*\)", "", model, flags=re.IGNORECASE).strip()
    model = model.replace("\xa0", " ").strip()

    # Parse facts from alternating lines
    fields = parse_alternating_fields(nonempty[title_idx + 1: title_idx + 60])

    date_str = fields.get("date of introduction", "")
    year = None
    if date_str:
        m = re.search(r"\b(19|20)\d{2}\b", date_str)
        if m:
            year = int(m.group(0))

    display_raw = fields.get("display technology", fields.get("display type", ""))
    display_type = normalize_display(display_raw) if display_raw else "LCD"

    power_raw = fields.get("power source", fields.get("batteries", ""))
    power = normalize_power(power_raw) if power_raw else "battery"

    country_raw = fields.get("origin of manufacture", "")
    country = normalize_country(country_raw)

    calc_type = infer_calc_type(make, model)
    tags = infer_tags(make, model, calc_type, year)
    rarity = infer_rarity(make, model, year)
    weirdness = 2.0  # default neutral; community can vote

    return {
        "make": make,
        "model": model,
        "year_introduced": year,
        "calc_type": calc_type,
        "display_type": display_type,
        "power_source": power,
        "country_of_origin": country,
        "description": None,   # intentionally blank — no scraped text
        "tags": tags,
        "rarity_score": rarity,
        "weirdness_score": weirdness,
        "images": [],
        "external_refs": [{"label": "Datamath Museum", "url": url}],
    }


async def run():
    print("=" * 60)
    print("CurioCalc — Datamath Related Album Scraper (facts only)")
    print("=" * 60)

    async with httpx.AsyncClient(timeout=20) as client:
        print("\n[1/3] Collecting links from Album_Related.htm...")
        raw = await collect_links(client)
        print(f"  Raw links: {len(raw)}")

        print("[2/3] Deduplicating...")
        unique = deduplicate(raw)
        print(f"  Unique pages: {len(unique)}")

        # Show brand breakdown
        from collections import Counter
        brand_counts = Counter(b for _, b in unique)
        print("  Top brands:", sorted(brand_counts.items(), key=lambda x: -x[1])[:10])

        print("\n[3/3] Parsing pages (facts only)...")
        calcs: list[dict] = []
        seen_models: set[tuple] = set()
        errors = 0

        for i, (url, dir_brand) in enumerate(unique):
            data = await parse_page(client, url, dir_brand)
            if not data:
                errors += 1
                continue

            key = (data["make"].lower(), data["model"].lower().strip())
            if key in seen_models:
                continue
            seen_models.add(key)
            calcs.append(data)

            if (i + 1) % 50 == 0:
                print(f"  {i+1}/{len(unique)} → {len(calcs)} unique calcs")

            await asyncio.sleep(0.2)

        print(f"\nParsed {len(calcs)} unique calcs ({errors} failed/skipped)")

        # Show HP models found
        hp = [c for c in calcs if c["make"] == "HP"]
        print(f"\nHP models found: {len(hp)}")
        for c in sorted(hp, key=lambda x: x.get("year_introduced") or 9999):
            print(f"  {c['model']} ({c.get('year_introduced','?')}) [{c['calc_type']}]")

    print("\n[4/4] Seeding to database...")
    await seed(calcs)


async def seed(calcs: list[dict]):
    db = DATABASE_URL
    if "asyncpg" not in db:
        db = db.replace("postgresql://", "postgresql+asyncpg://")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select, and_
    from app.models.calculator import Calculator

    engine = create_async_engine(db, echo=False)
    S = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    added = skipped = 0
    async with S() as s:
        for data in calcs:
            exists = (await s.execute(
                select(Calculator).where(
                    and_(Calculator.make == data["make"], Calculator.model == data["model"])
                )
            )).scalar_one_or_none()
            if exists:
                skipped += 1
                continue
            s.add(Calculator(**data))
            added += 1
        await s.commit()

    await engine.dispose()
    print(f"\n✅ Added {added} new calculators, skipped {skipped} already in DB")


if __name__ == "__main__":
    asyncio.run(run())
