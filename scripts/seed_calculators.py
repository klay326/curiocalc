"""
CurioCalc — curated calculator seed data
Run: python scripts/seed_calculators.py --api http://localhost:8000
"""
import asyncio, argparse, httpx

CALCULATORS = [
  # ── Iconic / Hall of Fame ──────────────────────────────────────────────
  {"make":"Texas Instruments","model":"TI-84 Plus","year_introduced":2004,"calc_type":"graphing","display_type":"LCD","power_source":"4x AAA + lithium backup","num_keys":40,"country_of_origin":"China","description":"The calculator that defined high school math for a generation. Still required on most standardized tests decades after launch. Has an entire homebrew game development community.","tags":["iconic","school","graphing","TI"],"external_refs":{}},
  {"make":"Hewlett-Packard","model":"HP-12C","year_introduced":1981,"calc_type":"financial","display_type":"LCD","power_source":"CR2032","num_keys":33,"country_of_origin":"USA","description":"The gold standard of financial calculators. Uses RPN (Reverse Polish Notation) which baffles newcomers but devotees swear by it. Still sold new today, essentially unchanged after 40+ years. Required tool for CFA exam.","fun_facts":"The HP-12C is the longest-selling calculator in history. Traders and bankers who grew up on it refuse to switch even when better options exist.","tags":["iconic","financial","RPN","HP","still-in-production"],"rarity_score":3.0,"weirdness_score":4.0},
  {"make":"Hewlett-Packard","model":"HP-35","year_introduced":1972,"calc_type":"scientific","display_type":"LED","power_source":"rechargeable","num_keys":35,"country_of_origin":"USA","description":"The world's first scientific pocket calculator. Before the HP-35, scientists carried slide rules. HP's engineers initially thought only 10,000 would sell — they sold 300,000 in the first year. Named after its 35 keys.","fun_facts":"NASA engineers used HP-35s on Apollo missions. A surviving example sold at auction for over $10,000.","tags":["historic","first","scientific","LED","HP","collectible"],"rarity_score":9.0,"weirdness_score":3.0},
  {"make":"Casio","model":"fx-7000G","year_introduced":1985,"calc_type":"graphing","display_type":"LCD","power_source":"2x CR2032","num_keys":79,"country_of_origin":"Japan","description":"The world's first graphing calculator. Casio changed education forever with this device, though it looks primitive next to modern graphing calcs.","fun_facts":"Has just 422 bytes of RAM. That's less than a single tweet.","tags":["historic","first","graphing","Casio","collectible"],"rarity_score":7.5,"weirdness_score":2.0},
  {"make":"Texas Instruments","model":"TI-30","year_introduced":1976,"calc_type":"scientific","display_type":"LED","power_source":"9V battery","num_keys":40,"country_of_origin":"USA","description":"The calculator that made scientific calculation affordable for students. At launch it cost $24.95 — down from the $100+ price of competitors. Millions sold.","tags":["iconic","scientific","TI","LED","student"],"rarity_score":4.0},

  # ── Bizarre / Unusual ──────────────────────────────────────────────────
  {"make":"Casio","model":"VL-1 VL-Tone","year_introduced":1981,"calc_type":"novelty","display_type":"LCD","power_source":"2x AA","num_keys":49,"country_of_origin":"Japan","description":"A fully functional calculator that is also a fully functional synthesizer with 73 preset rhythms and a mini keyboard. One of the most surreal consumer electronics products ever made. Devo used it on their 1982 album.","fun_facts":"The VL-Tone was the instrument that Trio used on 'Da Da Da', one of the most recognizable synth riffs of the 80s.","tags":["bizarre","synthesizer","music","novelty","Casio","legendary"],"rarity_score":7.0,"weirdness_score":10.0},
  {"make":"Hewlett-Packard","model":"HP-01","year_introduced":1977,"calc_type":"novelty","display_type":"LED","power_source":"rechargeable","num_keys":28,"country_of_origin":"USA","description":"A calculator built into a wristwatch, with tiny stylus-operated keys. Told time, performed scientific calculations, had a timer and alarm. Required a toothpick to press the keys. Cost $695 at launch ($3,000+ in today's money).","fun_facts":"The HP-01 came with a special stylus stored in the watch band because the keys were too small for human fingers.","tags":["bizarre","watch","wearable","LED","HP","collectible","luxury"],"rarity_score":9.5,"weirdness_score":9.0},
  {"make":"Pulsar","model":"Time Computer Calculator","year_introduced":1975,"calc_type":"novelty","display_type":"LED","power_source":"battery","country_of_origin":"USA","description":"A 14-karat gold calculator watch that required pressing a button to see the time (to save battery). Only a few thousand were ever made. The most expensive consumer electronics product of its time. James Bond wore one in 'Live and Let Die'.","fun_facts":"Pulsar made only ~4,000 of these. Mint examples regularly sell for $3,000–$8,000 at auction.","tags":["bizarre","watch","gold","LED","luxury","James-Bond","ultra-rare"],"rarity_score":10.0,"weirdness_score":9.5},
  {"make":"Casio","model":"SL-800","year_introduced":1983,"calc_type":"novelty","display_type":"LCD","power_source":"solar","country_of_origin":"Japan","description":"A credit card-sized solar calculator just 0.8mm thin — thinner than most credit cards. Fully functional despite being essentially a laminate. No battery whatsoever.","fun_facts":"The SL-800 was so thin it would flex when you pressed the keys. Casio had to design special flexible circuits.","tags":["bizarre","thin","solar","credit-card","Casio","design"],"rarity_score":6.0,"weirdness_score":7.5},
  {"make":"Sharp","model":"EL-8156","year_introduced":1976,"calc_type":"scientific","display_type":"LCD","power_source":"solar","country_of_origin":"Japan","description":"The world's first solar-powered calculator. No batteries required — just light. Considered an engineering marvel at the time.","tags":["historic","first","solar","Sharp"],"rarity_score":8.0,"weirdness_score":5.0},
  {"make":"Casio","model":"PB-100","year_introduced":1981,"calc_type":"programmable","display_type":"LCD","power_source":"2x LR44","country_of_origin":"Japan","description":"A pocket programmable computer/calculator hybrid the size of a TV remote. Could store up to 10 programs. The thing that made nerdy kids in 1981 feel like hackers.","tags":["programmable","pocket-computer","Casio","geek"],"rarity_score":6.5,"weirdness_score":5.0},
  {"make":"Bowmar","model":"901B","year_introduced":1971,"calc_type":"other","display_type":"LED","power_source":"rechargeable","num_keys":16,"country_of_origin":"USA","description":"The Bowmar Brain — the first commercially successful pocket electronic calculator sold in the United States. Cost $240 at launch (over $1,700 today). Could only add, subtract, multiply, and divide. Had an 8-digit display. The company went bankrupt when Texas Instruments undercut their prices.","fun_facts":"The 'Bowmar Brain' nickname stuck even though Bowmar never used it officially. Bowmar's bankruptcy is a classic case study in being first to market but failing to compete on cost.","tags":["historic","first","LED","collectible","Bowmar","rare"],"rarity_score":9.0,"weirdness_score":3.0},

  # ── Modern Favorites ──────────────────────────────────────────────────
  {"make":"Hewlett-Packard","model":"HP-48GX","year_introduced":1993,"calc_type":"graphing","display_type":"LCD","power_source":"3x AAA","num_keys":49,"country_of_origin":"Singapore","description":"The pinnacle of HP's calculator engineering. Used RPN, had a built-in equation library, could connect to other HP-48s via infrared, and had an expansion port. Engineers loved it so much they're still using them 30 years later.","fun_facts":"The HP-48 series has an active homebrew community that still writes new software for it. There are HP-48 emulators for everything including smartwatches.","tags":["graphing","RPN","HP","engineering","cult-classic"],"rarity_score":5.0,"weirdness_score":3.0},
  {"make":"Casio","model":"fx-CG50","year_introduced":2017,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA","num_keys":62,"country_of_origin":"Japan","description":"The first mainstream graphing calculator with a natural color display. Can render 3D graphs in full color. Makes the TI-84 look like a relic.","tags":["graphing","color","modern","Casio"]},
  {"make":"Texas Instruments","model":"TI-Nspire CX CAS","year_introduced":2011,"calc_type":"graphing","display_type":"color LCD","power_source":"lithium rechargeable","num_keys":85,"country_of_origin":"China","description":"Has a full Computer Algebra System — it can solve equations symbolically, not just numerically. Banned from some exams because it's almost too powerful.","tags":["graphing","CAS","color","TI","powerful"]},
  {"make":"Calculated Industries","model":"Construction Master Pro","year_introduced":1998,"calc_type":"other","display_type":"LCD","power_source":"9V","country_of_origin":"USA","description":"A calculator designed exclusively for construction math. Handles feet-inch-fraction calculations natively, computes board feet, roof pitches, stair layouts, and arc lengths. Contractors swear by it. Utterly useless for anything else.","fun_facts":"The Construction Master is so specialized it has keys labeled 'Rise', 'Run', 'Pitch', and 'Hip/Val' (for hip and valley roof calculations).","tags":["specialty","construction","trade","unusual"],"weirdness_score":6.0},
  {"make":"Texas Instruments","model":"Speak & Math","year_introduced":1980,"calc_type":"novelty","display_type":"LED","power_source":"4x C batteries","country_of_origin":"USA","description":"An educational toy that spoke math problems aloud using Texas Instruments' revolutionary speech synthesis chip. Said things like 'Can you solve this?' and 'Fantastic!' Kids in 1980 thought it was magic.","fun_facts":"TI's speech synthesis tech used in the Speak & Math was so advanced the chip was later used in voice mail systems and navigation devices.","tags":["novelty","educational","speech","LED","TI","toy","80s"],"weirdness_score":7.0},
  {"make":"Sharp","model":"EL-8","year_introduced":1969,"calc_type":"other","display_type":"Nixie tube","power_source":"AC adapter","country_of_origin":"Japan","description":"One of the first true electronic pocket calculators. Uses Nixie tubes for its display — glowing orange digits in glass tubes. Weighs over a pound. The 'pocket' in 'pocket calculator' was aspirational.","fun_facts":"The EL-8 cost about $395 at launch — around $3,200 in today's money. It could only do 4 functions.","tags":["historic","nixie","vintage","Sharp","heavy","rare"],"rarity_score":8.5,"weirdness_score":6.0,"display_type":"Nixie tube"},
  {"make":"Sinclair","model":"Cambridge","year_introduced":1973,"calc_type":"scientific","display_type":"LED","power_source":"9V","num_keys":19,"country_of_origin":"UK","description":"The cheapest scientific calculator ever made at the time — Clive Sinclair's stripped-down answer to the HP-35. Had only one display register and no stack. Infamous for being both affordable and unreliable.","fun_facts":"The Sinclair Cambridge's limited memory meant you had to remember intermediate results yourself. The manual included workarounds for its own bugs.","tags":["scientific","UK","Sinclair","budget","LED","historic"],"rarity_score":7.0,"weirdness_score":4.0},
  {"make":"National Semiconductor","model":"Mathematician NS-4515","year_introduced":1974,"calc_type":"scientific","display_type":"LED","power_source":"4x AA","country_of_origin":"USA","description":"National Semiconductor's attempt to compete with HP and TI in the scientific calculator market. Interesting historically because NS was primarily a chip company — this was their brief hardware era.","tags":["scientific","LED","rare","historic","National-Semiconductor"],"rarity_score":8.0},
  {"make":"Casio","model":"Databank DB-800","year_introduced":1993,"calc_type":"databank","display_type":"LCD","power_source":"CR2032","country_of_origin":"Japan","description":"A calculator watch with a full QWERTY keyboard (operated by stylus), 50-page phone book, scheduler, memo pad, calculator, and clock. The original wrist-worn PDA. Looked completely ridiculous and was incredible.","fun_facts":"The DB-800 keyboard was so tiny (about 15mm wide) that Casio included a special stylus. Some people learned to type on it with a fingernail.","tags":["databank","watch","wearable","QWERTY","bizarre","Casio"],"rarity_score":6.0,"weirdness_score":8.5},
]

async def seed(api_url: str, token: str):
    async with httpx.AsyncClient(timeout=30, base_url=api_url) as client:
        headers = {"Authorization": f"Bearer {token}"}
        ok, fail = 0, 0
        for c in CALCULATORS:
            r = await client.post("/api/v1/calculators", json=c, headers=headers)
            if r.status_code == 201:
                data = r.json()
                print(f"  ✅  {data['make']} {data['model']}")
                ok += 1
            else:
                print(f"  ❌  {c['make']} {c['model']} — {r.status_code} {r.text[:60]}")
                fail += 1
        print(f"\n{ok} added, {fail} failed")

async def main():
    p = argparse.ArgumentParser()
    p.add_argument("--api", default="http://localhost:8000")
    p.add_argument("--email", default="admin@curiocalc.org")
    p.add_argument("--password", default="changeme123")
    args = p.parse_args()

    async with httpx.AsyncClient(timeout=15, base_url=args.api) as client:
        r = await client.post("/api/v1/auth/login",
            data={"username": args.email, "password": args.password},
            headers={"Content-Type": "application/x-www-form-urlencoded"})
        if r.status_code != 200:
            print(f"Login failed: {r.text}")
            return
        token = r.json()["access_token"]
        print(f"Logged in ✅  Seeding {len(CALCULATORS)} calculators…\n")

    await seed(args.api, token)

if __name__ == "__main__":
    asyncio.run(main())
