"""
CurioCalc — Wikipedia image fetcher
Finds the best image for each calculator from Wikimedia and patches the record.

Run: python scripts/fetch_wiki_images.py --api https://api.curiocalc.org
"""
import asyncio
import argparse
import httpx

WIKI_API = "https://en.wikipedia.org/w/api.php"

# Explicit Wikipedia page titles for calculators where the default search
# might not find the right article
WIKI_OVERRIDES: dict[str, str] = {
    "TI-84 Plus":               "TI-84 Plus",
    "HP-12C":                   "HP-12C",
    "HP-35":                    "HP-35",
    "fx-7000G":                 "Casio fx-7000G",
    "TI-30":                    "TI-30",
    "VL-1 VL-Tone":             "Casio VL-Tone",
    "HP-01":                    "HP-01",
    "Pulsar Time Computer Calculator": "Pulsar (watch)",
    "SL-800":                   "Casio SL-800",
    "EL-8156":                  "Sharp EL-8156",
    "PB-100":                   "Casio PB-100",
    "901B":                     "Bowmar Brain",
    "HP-48GX":                  "HP 48 series",
    "fx-CG50":                  "Casio fx-CG50",
    "TI-Nspire CX CAS":         "TI-Nspire series",
    "Construction Master Pro":  "Calculated Industries",
    "Speak & Math":             "Speak & Spell (toy)",
    "EL-8":                     "Sharp EL-8",
    "Cambridge":                "Sinclair Cambridge",
    "Mathematician NS-4515":    "National Semiconductor",
    "Databank DB-800":          "Casio Databank",
}


async def get_wiki_image(client: httpx.AsyncClient, title: str) -> str | None:
    """Return the best thumbnail URL for a Wikipedia page title, or None."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": 600,
        "pilimit": 1,
    }
    try:
        r = await client.get(WIKI_API, params=params, timeout=10)
        r.raise_for_status()
        pages = r.json().get("query", {}).get("pages", {})
        for page in pages.values():
            thumb = page.get("thumbnail", {}).get("source")
            if thumb:
                return thumb
    except Exception as e:
        print(f"    Wikipedia error for '{title}': {e}")
    return None


async def run(api_url: str, email: str, password: str, dry_run: bool):
    async with httpx.AsyncClient(timeout=30, base_url=api_url) as client:
        # Login
        r = await client.post(
            "/api/v1/auth/login",
            data={"username": email, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if r.status_code != 200:
            print(f"Login failed: {r.text}")
            return
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in ✅\n")

        # Fetch all calculators
        r = await client.get("/api/v1/calculators?limit=200")
        calcs = r.json()
        print(f"Found {len(calcs)} calculators\n")

    # For Wikipedia fetches, use a separate client (no base_url)
    async with httpx.AsyncClient(timeout=30) as wiki_client:
        async with httpx.AsyncClient(timeout=30, base_url=api_url) as api_client:
            headers_auth = {"Authorization": f"Bearer {token}"}

            for calc in calcs:
                calc_id = calc["id"]
                make = calc["make"]
                model = calc["model"]

                # Skip if already has images
                if calc.get("images"):
                    print(f"  ⏭   {make} {model} — already has image")
                    continue

                # Determine search title
                wiki_title = WIKI_OVERRIDES.get(model) or f"{make} {model}"

                print(f"  🔍  {make} {model}  →  searching '{wiki_title}'")
                img_url = await get_wiki_image(wiki_client, wiki_title)

                if not img_url:
                    # Fallback: try just make + model without override
                    fallback = f"{make} {model}"
                    if fallback != wiki_title:
                        print(f"       ↳ fallback search '{fallback}'")
                        img_url = await get_wiki_image(wiki_client, fallback)

                if img_url:
                    print(f"       ✅  {img_url[:80]}…")
                    if not dry_run:
                        patch = await api_client.patch(
                            f"/api/v1/calculators/{calc_id}",
                            json={"images": [img_url]},
                            headers=headers_auth,
                        )
                        if patch.status_code != 200:
                            print(f"       ❌  PATCH failed: {patch.status_code} {patch.text[:60]}")
                else:
                    print(f"       ⚠️   No image found")

    print("\nDone!")


async def main():
    p = argparse.ArgumentParser()
    p.add_argument("--api", default="https://api.curiocalc.org")
    p.add_argument("--email", default="admin@curiocalc.org")
    p.add_argument("--password", default="changeme123")
    p.add_argument("--dry-run", action="store_true", help="Fetch images but don't patch records")
    args = p.parse_args()
    await run(args.api, args.email, args.password, args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())
