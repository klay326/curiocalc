#!/usr/bin/env python3
"""
Comprehensive HP calculator seed — adds all major HP models missing from the DB.
Run: docker exec curiocalc-backend-1 python /app/seed_hp.py
"""
import asyncio, os, sys
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://curiocalc:changeme@localhost:5432/curiocalc")

HP_CALCS = [
    # ── Classic / Woodstock series ─────────────────────────────────────────
    {"model": "HP-21",   "year_introduced": 1975, "year_discontinued": 1977, "calc_type": "scientific",
     "display_type": "LED", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "woodstock"],
     "rarity_score": 6.5, "fun_facts": "Entry-level of the Woodstock series. No trigonometry — just the basics done right in RPN."},
    {"model": "HP-22",   "year_introduced": 1975, "year_discontinued": 1977, "calc_type": "financial",
     "display_type": "LED", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "financial", "woodstock"],
     "rarity_score": 7.0, "fun_facts": "HP's first dedicated financial calculator at consumer prices. Predecessor to the legendary HP-12C."},
    {"model": "HP-25",   "year_introduced": 1975, "year_discontinued": 1978, "calc_type": "programmable",
     "display_type": "LED", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "programmable", "woodstock"],
     "rarity_score": 7.0, "fun_facts": "49-step programmable scientific. Hugely popular in engineering and science — many people wrote their first 'program' on one."},
    {"model": "HP-25C",  "year_introduced": 1976, "year_discontinued": 1978, "calc_type": "programmable",
     "display_type": "LED", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "programmable", "continuous-memory"],
     "rarity_score": 7.5, "fun_facts": "The 'C' stands for Continuous Memory — programs survive power-off. Premium upgrade to the HP-25."},
    {"model": "HP-27",   "year_introduced": 1976, "year_discontinued": 1978, "calc_type": "scientific",
     "display_type": "LED", "power_source": "battery", "num_keys": 43, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "financial", "woodstock"],
     "rarity_score": 7.5, "fun_facts": "Combined scientific and financial functions in one calculator — unusual for the era."},
    {"model": "HP-29C",  "year_introduced": 1977, "year_discontinued": 1979, "calc_type": "programmable",
     "display_type": "LED", "power_source": "battery", "num_keys": 38, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "programmable", "continuous-memory"],
     "rarity_score": 7.5},
    {"model": "HP-55",   "year_introduced": 1975, "year_discontinued": 1977, "calc_type": "scientific",
     "display_type": "LED", "power_source": "battery", "num_keys": 49, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "timer", "woodstock"],
     "rarity_score": 8.0, "fun_facts": "Had a built-in stopwatch/timer — unusual for a calculator. Made for lab work where you needed to time experiments."},
    {"model": "HP-70",   "year_introduced": 1974, "year_discontinued": 1976, "calc_type": "financial",
     "display_type": "LED", "power_source": "battery", "num_keys": 22, "country_of_origin": "USA",
     "tags": ["rpn", "led", "classic", "financial"],
     "rarity_score": 7.5, "fun_facts": "HP's first financial calculator. Simple and focused — only 22 keys but covered all the important time-value-of-money functions."},
    {"model": "HP-97",   "year_introduced": 1976, "year_discontinued": 1984, "calc_type": "printing",
     "display_type": "LED", "power_source": "AC/battery", "num_keys": 50, "country_of_origin": "USA",
     "tags": ["rpn", "led", "printing", "programmable", "magnetic-cards"],
     "rarity_score": 8.5, "fun_facts": "Desktop sibling of the HP-67. Built-in thermal printer plus magnetic card reader. The ultimate professional RPN machine of the 1970s."},

    # ── Spice series (1977–1981) ───────────────────────────────────────────
    {"model": "HP-31E",  "year_introduced": 1978, "year_discontinued": 1981, "calc_type": "scientific",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice"],
     "rarity_score": 6.0},
    {"model": "HP-32E",  "year_introduced": 1978, "year_discontinued": 1981, "calc_type": "scientific",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "statistics"],
     "rarity_score": 6.0, "fun_facts": "Added statistics functions over the HP-31E. Popular with students for its compact Spice form factor."},
    {"model": "HP-33E",  "year_introduced": 1978, "year_discontinued": 1981, "calc_type": "programmable",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "programmable"],
     "rarity_score": 6.5},
    {"model": "HP-33C",  "year_introduced": 1979, "year_discontinued": 1981, "calc_type": "programmable",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "programmable", "continuous-memory"],
     "rarity_score": 6.5},
    {"model": "HP-37E",  "year_introduced": 1978, "year_discontinued": 1981, "calc_type": "financial",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "financial"],
     "rarity_score": 6.5},
    {"model": "HP-38E",  "year_introduced": 1979, "year_discontinued": 1981, "calc_type": "financial",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "financial", "programmable"],
     "rarity_score": 6.5},
    {"model": "HP-38C",  "year_introduced": 1979, "year_discontinued": 1981, "calc_type": "financial",
     "display_type": "LED", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "led", "spice", "financial", "continuous-memory"],
     "rarity_score": 7.0},

    # ── Coconut / Voyager (missing) ────────────────────────────────────────
    {"model": "HP-41CV", "year_introduced": 1980, "year_discontinued": 1990, "calc_type": "programmable",
     "display_type": "LCD", "power_source": "battery", "num_keys": 49, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "programmable", "expandable", "coconut", "alphanumeric"],
     "rarity_score": 8.0, "fun_facts": "Quad memory version of the HP-41C. Same radical alphanumeric LCD and module ports that made the 41C legendary, but with 4× the memory."},
    {"model": "HP-10C",  "year_introduced": 1982, "year_discontinued": 1984, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "battery", "num_keys": 35, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "voyager"],
     "rarity_score": 7.0, "fun_facts": "The entry-level Voyager. No programming, but the same gorgeous slim form as its famous siblings."},

    # ── Clamshell / Pioneer series ─────────────────────────────────────────
    {"model": "HP-18C",  "year_introduced": 1986, "year_discontinued": 1990, "calc_type": "financial",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "clamshell", "financial", "pioneer"],
     "rarity_score": 7.5, "fun_facts": "First HP calculator with a touch-sensitive menu strip. Opened like a book — truly unique industrial design."},
    {"model": "HP-28S",  "year_introduced": 1988, "year_discontinued": 1992, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 64, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "cas", "graphing", "clamshell"],
     "rarity_score": 8.0, "fun_facts": "The first HP calculator with a Computer Algebra System (CAS). Opened like a book with two keyboard panels. Hugely influential on all later HP graphing calcs."},
    {"model": "HP-17B",  "year_introduced": 1987, "year_discontinued": 1989, "calc_type": "financial",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "financial", "pioneer"],
     "rarity_score": 6.5},
    {"model": "HP-19B",  "year_introduced": 1988, "year_discontinued": 1990, "calc_type": "financial",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "financial", "clamshell"],
     "rarity_score": 7.0, "fun_facts": "Clamshell financial calculator. Ran a version of HP's RPL programming language."},
    {"model": "HP-19BII","year_introduced": 1990, "year_discontinued": 2003, "calc_type": "financial",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "financial"],
     "rarity_score": 6.5},
    {"model": "HP-20S",  "year_introduced": 1988, "year_discontinued": 2003, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "battery", "num_keys": 37, "country_of_origin": "USA",
     "tags": ["lcd", "scientific", "pioneer"],
     "rarity_score": 5.5},
    {"model": "HP-21S",  "year_introduced": 1988, "year_discontinued": 1990, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "battery", "num_keys": 37, "country_of_origin": "USA",
     "tags": ["lcd", "statistics", "pioneer"],
     "rarity_score": 6.0},
    {"model": "HP-22S",  "year_introduced": 1988, "year_discontinued": 1990, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["lcd", "scientific", "pioneer"],
     "rarity_score": 6.0},
    {"model": "HP-27S",  "year_introduced": 1988, "year_discontinued": 1992, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "scientific", "pioneer", "solver"],
     "rarity_score": 6.5, "fun_facts": "Included an equation solver that could solve for any variable — revolutionary for its time."},
    {"model": "HP-32S",  "year_introduced": 1988, "year_discontinued": 1991, "calc_type": "programmable",
     "display_type": "LCD", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "programmable", "pioneer"],
     "rarity_score": 7.0, "fun_facts": "Spiritual successor to the HP-15C in the Pioneer series. Collectors prize it for its perfect size and proper RPN feel."},
    {"model": "HP-32SII","year_introduced": 1991, "year_discontinued": 2002, "calc_type": "programmable",
     "display_type": "LCD", "power_source": "battery", "num_keys": 34, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "programmable", "pioneer"],
     "rarity_score": 7.5, "fun_facts": "The HP-32SII is one of the most beloved HP calculators ever — perfect RPN programmable at a sensible size. Still sought after by engineers decades later."},

    # ── Graphing series ────────────────────────────────────────────────────
    {"model": "HP-48S",  "year_introduced": 1990, "year_discontinued": 1993, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 64, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "graphing", "rpl", "saturn"],
     "rarity_score": 7.5, "fun_facts": "The entry 48 — same Saturn CPU, same RPL language as the 48SX but without the card slots."},
    {"model": "HP-48SX", "year_introduced": 1990, "year_discontinued": 1993, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 64, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "graphing", "rpl", "expandable", "saturn"],
     "rarity_score": 8.0, "fun_facts": "Two expansion card slots made the 48SX endlessly customizable. Physics students, engineers, and hobbyists loaded it with everything from surveying programs to games."},
    {"model": "HP-48G",  "year_introduced": 1993, "year_discontinued": 2003, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 64, "country_of_origin": "USA",
     "tags": ["rpn", "lcd", "graphing", "rpl", "saturn"],
     "rarity_score": 7.0},
    {"model": "HP-49G+", "year_introduced": 2003, "year_discontinued": 2008, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 49, "country_of_origin": "China",
     "tags": ["rpn", "lcd", "graphing", "cas", "arm"],
     "rarity_score": 6.0, "fun_facts": "First HP graphing calc with an ARM processor. Faster than its predecessor but the keyboard quality divided opinion."},
    {"model": "HP-38G",  "year_introduced": 1995, "year_discontinued": 1999, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 40, "country_of_origin": "Singapore",
     "tags": ["lcd", "graphing", "algebraic"],
     "rarity_score": 6.0, "fun_facts": "HP's attempt at a classroom graphing calc to compete with TI. Used algebraic entry, not RPN — controversial among HP fans."},
    {"model": "HP-39G",  "year_introduced": 1999, "year_discontinued": 2003, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 40, "country_of_origin": "Singapore",
     "tags": ["lcd", "graphing", "algebraic"],
     "rarity_score": 5.5},
    {"model": "HP-39GS", "year_introduced": 2006, "year_discontinued": 2013, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "country_of_origin": "China",
     "tags": ["lcd", "graphing", "algebraic"],
     "rarity_score": 4.5},
    {"model": "HP-40G",  "year_introduced": 2000, "year_discontinued": 2003, "calc_type": "graphing",
     "display_type": "LCD", "power_source": "battery", "num_keys": 40, "country_of_origin": "Singapore",
     "tags": ["lcd", "graphing", "cas"],
     "rarity_score": 6.0, "fun_facts": "Added a CAS to the HP-39G chassis. Rare — discontinued quickly and replaced by the HP-40GS."},

    # ── Modern ─────────────────────────────────────────────────────────────
    {"model": "HP-15C Limited Edition", "year_introduced": 2011, "year_discontinued": 2011,
     "calc_type": "programmable", "display_type": "LCD", "power_source": "battery",
     "country_of_origin": "China",
     "tags": ["rpn", "lcd", "voyager", "limited-edition", "reissue"],
     "rarity_score": 8.5, "fun_facts": "HP reissued the iconic HP-15C for a limited run in 2011. Collectors grabbed them instantly — it sold out in days. 900× faster than the original."},
    {"model": "HP-12C 30th Anniversary", "year_introduced": 2011, "year_discontinued": 2012,
     "calc_type": "financial", "display_type": "LCD", "power_source": "battery",
     "country_of_origin": "China",
     "tags": ["rpn", "lcd", "financial", "limited-edition", "anniversary"],
     "rarity_score": 7.5},
    {"model": "HP-300S+", "year_introduced": 2013, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "solar+battery", "country_of_origin": "China",
     "tags": ["lcd", "scientific", "natural-display"],
     "rarity_score": 3.0},
    {"model": "HP-10s+", "year_introduced": 2013, "calc_type": "scientific",
     "display_type": "LCD", "power_source": "solar+battery", "country_of_origin": "China",
     "tags": ["lcd", "scientific"],
     "rarity_score": 2.5},
    {"model": "HP-Prime G2", "year_introduced": 2019, "calc_type": "graphing",
     "display_type": "color LCD", "power_source": "rechargeable", "country_of_origin": "China",
     "tags": ["lcd", "graphing", "cas", "touchscreen", "color"],
     "rarity_score": 5.0, "fun_facts": "Faster ARM processor and brighter screen vs the original Prime. One of the most powerful calculators ever made, rivaling smartphones in raw compute."},
]


async def main():
    if "asyncpg" not in DATABASE_URL:
        url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    else:
        url = DATABASE_URL

    import asyncpg
    url_pg = url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url_pg)

    added, skipped = 0, 0
    for calc in HP_CALCS:
        # Check if already exists
        existing = await conn.fetchval(
            "SELECT id FROM calculators WHERE make='HP' AND model=$1", calc["model"]
        )
        if existing:
            skipped += 1
            continue

        import uuid, json
        tags = calc.pop("tags", [])
        fun_facts = calc.pop("fun_facts", None)
        rarity = calc.pop("rarity_score", None)

        await conn.execute("""
            INSERT INTO calculators (
                id, make, model, year_introduced, year_discontinued, calc_type,
                display_type, power_source, num_keys, country_of_origin,
                fun_facts, rarity_score, tags, images, external_refs,
                is_verified, created_at, updated_at
            ) VALUES (
                $1,'HP',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,'[]'::json,'[]'::json,
                false, NOW(), NOW()
            )
        """,
            uuid.uuid4(),
            calc["model"],
            calc.get("year_introduced"),
            calc.get("year_discontinued"),
            calc.get("calc_type", "scientific"),
            calc.get("display_type"),
            calc.get("power_source"),
            calc.get("num_keys"),
            calc.get("country_of_origin"),
            fun_facts,
            rarity,
            json.dumps(tags),
        )
        added += 1
        print(f"  ✓ Added: HP {calc['model']}")

    await conn.close()
    print(f"\n✅ Added {added} HP calculators, skipped {skipped} already present")

if __name__ == "__main__":
    asyncio.run(main())
