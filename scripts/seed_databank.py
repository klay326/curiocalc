"""
CurioCalc — Databank.org seed scraper
Scrapes calculator entries from databank.org and imports them into the database.

Usage:
    python scripts/seed_databank.py --limit 100
    python scripts/seed_databank.py --all
"""
import asyncio
import argparse
import httpx
from bs4 import BeautifulSoup

BASE_URL = "https://www.datamath.org"  # The Datamath Calculator Museum
HEADERS = {"User-Agent": "CurioCalc/0.1 (https://curiocalc.org; open source catalog)"}


async def fetch_page(client: httpx.AsyncClient, url: str) -> BeautifulSoup:
    resp = await client.get(url, headers=HEADERS, follow_redirects=True)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")


async def scrape_index(client: httpx.AsyncClient) -> list[dict]:
    """Get the list of calculator models from the index page."""
    soup = await fetch_page(client, f"{BASE_URL}/")
    entries = []

    # Datamath uses a table-based layout — adapt selectors as needed
    for link in soup.select("a[href*='/Calc/']"):
        href = link.get("href", "")
        name = link.get_text(strip=True)
        if name and href:
            entries.append({
                "name": name,
                "url": f"{BASE_URL}{href}" if href.startswith("/") else href,
            })

    return entries


async def scrape_calculator(client: httpx.AsyncClient, entry: dict) -> dict | None:
    """Scrape details for a single calculator page."""
    try:
        soup = await fetch_page(client, entry["url"])

        # Extract fields — these selectors are approximate; adjust after inspecting the live site
        data = {
            "make": "Texas Instruments",  # Datamath specialises in TI
            "model": entry["name"],
            "source_url": entry["url"],
            "calc_type": "scientific",  # default; refine per entry
            "external_refs": {"datamath_url": entry["url"]},
        }

        # Try to get description from first paragraph
        desc = soup.find("p")
        if desc:
            data["description"] = desc.get_text(strip=True)[:2000]

        # Try to find year
        text = soup.get_text()
        import re
        year_match = re.search(r'\b(19[6-9]\d|20[0-2]\d)\b', text)
        if year_match:
            data["year_introduced"] = int(year_match.group())

        return data

    except Exception as e:
        print(f"  ⚠️  Failed to scrape {entry['url']}: {e}")
        return None


async def import_to_api(session: httpx.AsyncClient, calc_data: dict, api_token: str):
    """POST the scraped data to the CurioCalc API."""
    payload = {
        "make": calc_data.get("make", "Unknown"),
        "model": calc_data.get("model", "Unknown"),
        "calc_type": calc_data.get("calc_type", "other"),
        "description": calc_data.get("description"),
        "year_introduced": calc_data.get("year_introduced"),
        "external_refs": calc_data.get("external_refs", {}),
        "tags": ["datamath-import"],
    }
    resp = await session.post(
        "http://localhost:8000/api/v1/calculators",
        json=payload,
        headers={"Authorization": f"Bearer {api_token}"},
    )
    if resp.status_code == 201:
        print(f"  ✅ Imported: {payload['make']} {payload['model']}")
    else:
        print(f"  ❌ Failed ({resp.status_code}): {payload['model']} — {resp.text[:100]}")


async def main():
    parser = argparse.ArgumentParser(description="Seed CurioCalc from Datamath Museum")
    parser.add_argument("--limit", type=int, default=50, help="Max entries to import")
    parser.add_argument("--all", action="store_true", help="Import all entries")
    parser.add_argument("--token", required=True, help="CurioCalc API bearer token")
    args = parser.parse_args()

    async with httpx.AsyncClient(timeout=30) as client:
        print("🔍 Fetching index...")
        entries = await scrape_index(client)
        print(f"   Found {len(entries)} entries")

        if not args.all:
            entries = entries[: args.limit]

        print(f"📥 Importing {len(entries)} calculators...")
        for i, entry in enumerate(entries, 1):
            print(f"[{i}/{len(entries)}] {entry['name']}")
            data = await scrape_calculator(client, entry)
            if data:
                await import_to_api(client, data, args.token)
            await asyncio.sleep(0.5)  # be polite

    print("\n✅ Done!")


if __name__ == "__main__":
    asyncio.run(main())
