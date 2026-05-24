#!/usr/bin/env python3
"""
Fix missing/wrong images and fetch images for newly added calculators.
Run inside backend container: docker compose exec backend python /scripts/fix_images.py
Or locally: DATABASE_URL=... python scripts/fix_images.py
"""
import asyncio, os, sys, httpx, pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://curiocalc:changeme@localhost:5432/curiocalc",
)

UA = "CurioCalc/0.1 (https://curiocalc.org; klay.adams326@gmail.com) python-httpx"

# Hand-curated image overrides for tricky calculators
# Format: ("make", "model"): [url, ...]
IMAGE_OVERRIDES = {
    # Sharp models
    ("Sharp", "EL-8156"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Sharp_EL-8156.jpg/400px-Sharp_EL-8156.jpg"],
    ("Sharp", "EL-5100"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Sharp_EL-5100S.jpg/400px-Sharp_EL-5100S.jpg"],
    ("Sharp", "EL-9300"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Sharp_EL-9300.jpg/400px-Sharp_EL-9300.jpg"],
    ("Sharp", "EL-W516"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Sharp_EL-W516XBSL.jpg/400px-Sharp_EL-W516XBSL.jpg"],
    # TI
    ("TI", "TI-5100"):     ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/TI-5100.jpg/400px-TI-5100.jpg"],
    # Misc
    ("Calculated Industries", "Construction Master Pro"): [],  # no good image exists
    ("Commodore", "SR-4148R"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Commodore_SR4148R.jpg/400px-Commodore_SR4148R.jpg"],
    # Soviet
    ("Elektronika", "MK-52"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/MK-52_calculator.jpg/400px-MK-52_calculator.jpg"],
    ("Elektronika", "MK-61"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Elektronika_MK-61.jpg/400px-Elektronika_MK-61.jpg"],
    ("Elektronika", "B3-34"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Elektronika_B3-34.jpg/400px-Elektronika_B3-34.jpg"],
    # Historic
    ("Olivetti", "Programma 101"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Olivetti_Programma_101_-_Museo_nazionale_scienza_e_tecnologia_Milano.jpg/400px-Olivetti_Programma_101_-_Museo_nazionale_scienza_e_tecnologia_Milano.jpg"],
    ("HP", "HP-01"):         ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/HP-01_calculator_watch.jpg/400px-HP-01_calculator_watch.jpg"],
    ("HP", "HP-35"):         ["https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/HP-35_Calculator.jpg/400px-HP-35_Calculator.jpg"],
    ("HP", "HP-65"):         ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/HP-65.jpg/400px-HP-65.jpg"],
    ("HP", "HP-15C"):        ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/HP-15C_programmable_calculator.jpg/400px-HP-15C_programmable_calculator.jpg"],
    ("HP", "HP-41C"):        ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HP-41CV_front_and_back.jpg/400px-HP-41CV_front_and_back.jpg"],
    ("HP", "HP-12C"):        ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/HP_12C_programmable_financial_calculator.jpg/400px-HP_12C_programmable_financial_calculator.jpg"],
    ("HP", "HP-48GX"):       ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/HP_48gx.jpg/400px-HP_48gx.jpg"],
    ("TI", "TI-92"):         ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/TI-92.jpg/400px-TI-92.jpg"],
    ("Casio", "fx-7000G"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/CASIO_fx-7000G.jpg/400px-CASIO_fx-7000G.jpg"],
    ("Casio", "MG-880"):     ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Casio_MG-880_2.jpg/400px-Casio_MG-880_2.jpg"],
    ("Canon", "Pocketronic"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Canon_Pocketronic.jpg/400px-Canon_Pocketronic.jpg"],
    ("Friden", "EC-130"):    ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Friden_EC-132.jpg/400px-Friden_EC-132.jpg"],
}

WIKI_SEARCH_HINTS = {
    # (make, model): wikipedia page title or commons search term
    ("Casio", "fx-9860GII"):      "Casio fx-9860 series",
    ("Casio", "Algebra FX 2.0"):  "Casio Algebra FX",
    ("Casio", "ClassPad 300"):    "Casio ClassPad 300",
    ("Casio", "CFX-9850GB Plus"): "Casio CFX-9850",
    ("TI", "TI-Nspire CX CAS"):   "TI-Nspire series",
    ("TI", "TI-Voyage 200"):      "TI-92 series",
    ("HP", "HP-28C"):             "HP-28 series",
    ("HP", "HP-49G"):             "HP 49/50 series",
    ("HP", "HP-41C"):             "HP-41C",
    ("HP", "HP-65"):              "HP-65",
    ("Elektronika", "MK-52"):     "Elektronika MK-52",
}


async def search_commons(client: httpx.AsyncClient, query: str) -> str | None:
    """Search Wikimedia Commons for an image URL."""
    r = await client.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query", "list": "search", "srsearch": query,
            "srnamespace": "6", "srlimit": "3", "format": "json",
        },
        headers={"User-Agent": UA},
    )
    data = r.json()
    results = data.get("query", {}).get("search", [])
    if not results:
        return None

    title = results[0]["title"]  # e.g. "File:HP-65.jpg"
    r2 = await client.get(
        "https://commons.wikimedia.org/w/api.php",
        params={
            "action": "query", "titles": title, "prop": "imageinfo",
            "iiprop": "url", "iiurlwidth": "400", "format": "json",
        },
        headers={"User-Agent": UA},
    )
    pages = r2.json().get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo", [{}])[0]
        return info.get("thumburl") or info.get("url")
    return None


async def get_wiki_image(client: httpx.AsyncClient, title: str) -> str | None:
    """Get the main image for a Wikipedia article."""
    r = await client.get(
        "https://en.wikipedia.org/w/api.php",
        params={
            "action": "query", "titles": title, "prop": "pageimages",
            "piprop": "thumbnail", "pithumbsize": "400", "format": "json",
        },
        headers={"User-Agent": UA},
    )
    pages = r.json().get("query", {}).get("pages", {})
    for page in pages.values():
        thumb = page.get("thumbnail", {})
        if thumb:
            return thumb.get("source")
    return None


async def fix_images():
    engine_url = DATABASE_URL
    if "asyncpg" not in engine_url:
        engine_url = engine_url.replace("postgresql://", "postgresql+asyncpg://")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.models.calculator import Calculator

    engine = create_async_engine(engine_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(Calculator))
        all_calcs = result.scalars().all()
        print(f"Total calculators: {len(all_calcs)}")

        missing = [c for c in all_calcs if not c.images]
        overrides = [(c, IMAGE_OVERRIDES[(c.make, c.model)])
                     for c in all_calcs
                     if (c.make, c.model) in IMAGE_OVERRIDES]

        print(f"Missing images: {len(missing)}")
        print(f"Image overrides to apply: {len(overrides)}")

        updated = 0

        # Apply hand-curated overrides first
        async with httpx.AsyncClient(timeout=15) as client:
            for calc, urls in overrides:
                if urls:
                    # Verify URL is reachable
                    valid = []
                    for url in urls:
                        try:
                            r = await client.head(url, follow_redirects=True)
                            if r.status_code == 200:
                                valid.append(url)
                        except Exception:
                            pass
                    if valid:
                        calc.images = valid
                        updated += 1
                        print(f"  ✓ Override: {calc.make} {calc.model}")
                    else:
                        print(f"  ✗ Override URLs failed: {calc.make} {calc.model}")
                else:
                    # Explicitly clear
                    calc.images = []

            # Fetch images for calculators missing them
            for calc in missing:
                if calc.images:  # already got from override
                    continue

                key = (calc.make, calc.model)
                search_term = WIKI_SEARCH_HINTS.get(key, f"{calc.make} {calc.model} calculator")

                # Try Wikipedia page image first
                img = await get_wiki_image(client, search_term)

                # Fall back to Commons search
                if not img:
                    img = await search_commons(client, search_term)

                if img:
                    calc.images = [img]
                    updated += 1
                    print(f"  ✓ Found: {calc.make} {calc.model} → {img[:60]}…")
                else:
                    print(f"  - No image: {calc.make} {calc.model}")

                await asyncio.sleep(0.3)  # Be polite to Wikimedia

        await session.commit()
        print(f"\n✅ Updated {updated} calculators with images")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(fix_images())
