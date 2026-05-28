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
    # ── HP Classics (Woodstock/LED era) ──────────────────────────────────
    ("HP", "HP-35"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/HP_35_Calculator.jpg/480px-HP_35_Calculator.jpg"],
    ("HP", "HP-45"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/HP-45.jpg/480px-HP-45.jpg"],
    ("HP", "HP-55"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/HP-55.jpg/480px-HP-55.jpg"],
    ("HP", "HP-65"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/HP-65_Mint_in_Box_%28cropped%29.jpg/480px-HP-65_Mint_in_Box_%28cropped%29.jpg"],
    ("HP", "HP-67"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Scientific_calculator_HP-67_without_backcover_and_batteries.jpg/480px-Scientific_calculator_HP-67_without_backcover_and_batteries.jpg"],
    ("HP", "HP-80"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Vintage_Hewlett-Packard_Model_HP-80_Electronic_Pocket_Calculator_Red_LED_Display.jpg/480px-thumbnail.jpg"],
    ("HP", "HP-25"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/HP-25.jpg/480px-HP-25.jpg"],
    ("HP", "HP-21"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/HP-21.jpg/480px-HP-21.jpg"],
    ("HP", "HP-91"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/HP-91_calculator.jpg/480px-HP-91_calculator.jpg"],
    ("HP", "HP-97"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/HP-97.jpg/480px-HP-97.jpg"],
    # ── HP Voyager series ─────────────────────────────────────────────────
    ("HP", "HP-11C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HP_11c.jpg/480px-HP_11c.jpg"],
    ("HP", "HP-12C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Financial_Calculator_Hewlett-Packard_HP-12C_built_from_1981.jpg/480px-thumbnail.jpg"],
    ("HP", "HP-15C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/HP-15C_Programmable_Scientific_Calculator_introduced_1982.jpg/480px-thumbnail.jpg"],
    ("HP", "HP-16C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Hewlett-Packard_Model_HP-16C.jpg/480px-thumbnail.jpg"],
    ("HP", "HP-10C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/HP-10C.jpg/480px-HP-10C.jpg"],
    # ── HP Coconut ───────────────────────────────────────────────────────
    ("HP", "HP-41C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/HP-41C.jpg/480px-HP-41C.jpg"],
    ("HP", "HP-41CV"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/HP-41CV_front_and_back.jpg/480px-HP-41CV_front_and_back.jpg"],
    ("HP", "HP-41CX"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/HP-41CX.jpg/480px-HP-41CX.jpg"],
    # ── HP Pioneer / Clamshell ────────────────────────────────────────────
    ("HP", "HP-28C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/HP-28C.jpg/480px-HP-28C.jpg"],
    ("HP", "HP-28S"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/HP-28S.jpg/480px-HP-28S.jpg"],
    ("HP", "HP-42S"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/HP42S.jpg/480px-HP42S.jpg"],
    ("HP", "HP-32S"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/HP-32S.jpg/480px-HP-32S.jpg"],
    ("HP", "HP-32SII"):["https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/HP_32sii_RPN_Scientific_Calculator.jpg/480px-HP_32sii_RPN_Scientific_Calculator.jpg"],
    ("HP", "HP-34C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/HP-34C_programmable_RPN_calculator_-_edit.jpg/480px-HP-34C_programmable_RPN_calculator_-_edit.jpg"],
    # ── HP Graphing ───────────────────────────────────────────────────────
    ("HP", "HP-48SX"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/HP-48GX_calculator_%2823588938468%29.jpg/480px-HP-48GX_calculator_%2823588938468%29.jpg"],
    ("HP", "HP-48GX"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/HP-48GX_calculator_%2823588938468%29.jpg/480px-HP-48GX_calculator_%2823588938468%29.jpg"],
    ("HP", "HP-48G"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/HP-48GX_calculator_%2823588938468%29.jpg/480px-HP-48GX_calculator_%2823588938468%29.jpg"],
    ("HP", "HP-49G"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/HP49G.jpg/480px-HP49G.jpg"],
    ("HP", "HP-50G"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/HP_50g_calculator.png/480px-HP_50g_calculator.png"],
    ("HP", "HP-Prime"):["https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/HP_Prime_Graphing_Calculator.jpg/480px-HP_Prime_Graphing_Calculator.jpg"],
    # ── HP Other ─────────────────────────────────────────────────────────
    ("HP", "HP-01"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/HP-01_Calculator_Watch_%28cropped%29.jpg/480px-HP-01_Calculator_Watch_%28cropped%29.jpg"],
    ("HP", "HP-71B"):  ["https://upload.wikimedia.org/wikipedia/commons/9/98/HP-71B_Calculator.jpg"],
    ("HP", "HP-19C"):  ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/HP-19C.jpg/480px-HP-19C.jpg"],
    ("HP", "HP-35S"):  ["https://upload.wikimedia.org/wikipedia/commons/4/4a/Hp-35s.jpg"],
    ("HP", "HP-12C Platinum"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/HP_12C_Platinum-_diagonal_view.jpg/480px-HP_12C_Platinum-_diagonal_view.jpg"],
    ("HP", "HP-17BII"):["https://upload.wikimedia.org/wikipedia/commons/f/f8/Hp-17bii.jpg"],
    # ── Sharp ────────────────────────────────────────────────────────────
    ("Sharp", "EL-8156"):  [],
    ("Sharp", "EL-5100"):  [],
    # ── Soviet ───────────────────────────────────────────────────────────
    ("Elektronika", "MK-52"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/MK-52_calculator.jpg/480px-MK-52_calculator.jpg"],
    ("Elektronika", "MK-61"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Elektronika_MK-61.jpg/480px-Elektronika_MK-61.jpg"],
    ("Elektronika", "B3-34"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Elektronika_B3-34.jpg/480px-Elektronika_B3-34.jpg"],
    # ── Historic ─────────────────────────────────────────────────────────
    ("Olivetti", "Programma 101"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Olivetti_Programma_101_-_Museo_nazionale_scienza_e_tecnologia_Milano.jpg/480px-Olivetti_Programma_101_-_Museo_nazionale_scienza_e_tecnologia_Milano.jpg"],
    ("Canon", "Pocketronic"): ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Canon_Pocketronic.jpg/480px-Canon_Pocketronic.jpg"],
    # ── TI ───────────────────────────────────────────────────────────────
    ("TI", "TI-92"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/TI-92.jpg/480px-TI-92.jpg"],
    # ── Casio ────────────────────────────────────────────────────────────
    ("Casio", "fx-7000G"):   ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/CASIO_fx-7000G.jpg/480px-CASIO_fx-7000G.jpg"],
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


def is_bad_image(url: str) -> bool:
    """Reject Internet Archive PDF scans and other non-photo artifacts."""
    bad = ['.pdf', 'page1-', '/IA_', 'thumbnail.pdf', 'IA_%29', '.djvu',
           'Handy_list', 'Naval_applications', 'algorith', '_algorithms_']
    return any(b in url for b in bad)


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

    # Try first non-junk result
    title = None
    for res in results:
        t = res["title"]
        if not any(bad in t for bad in ['.pdf', '.djvu', 'algorithm', 'Naval', 'Handy_list']):
            title = t
            break
    if not title:
        return None
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

                if img and not is_bad_image(img):
                    calc.images = [img]
                    updated += 1
                    print(f"  ✓ Found: {calc.make} {calc.model} → {img[:60]}…")
                else:
                    if img:
                        print(f"  ✗ Rejected bad image: {calc.make} {calc.model}")
                    else:
                        print(f"  - No image: {calc.make} {calc.model}")

                await asyncio.sleep(0.3)  # Be polite to Wikimedia

        await session.commit()
        print(f"\n✅ Updated {updated} calculators with images")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(fix_images())
