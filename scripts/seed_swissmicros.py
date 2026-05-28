#!/usr/bin/env python3
"""Seed SwissMicros calculators. Run inside backend container."""
import asyncio, os, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent / "backend"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://curiocalc:changeme@localhost:5432/curiocalc",
)

CALCS = [
    # ── Early card-size Voyager clones (2012-2015) ──────────────────────────
    {
        "make": "SwissMicros", "model": "DM-10L",
        "year_introduced": 2012, "year_discontinued": 2014,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "SwissMicros' debut product: a credit-card-sized clone of the HP-10C scientific calculator milled from solid aluminum. Ran a faithful HP-10C ROM emulation on an ARM Cortex-M0 microcontroller.",
        "fun_facts": "Thinner than a credit card and machined from a single block of aluminum — one of the first serious modern homages to the HP Voyager series.",
        "tags": ["rpn", "scientific", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.0, "weirdness_score": 7.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM-11L",
        "year_introduced": 2012, "year_discontinued": 2014,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Card-sized homage to the HP-11C programmable scientific calculator, machined from aluminum and running an ARM-based HP-11C ROM emulation. Offered keystroke programming and trig/log functions.",
        "fun_facts": "The HP-11C original is a collector favorite; the DM-11L let fans carry a working clone in their wallet.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.0, "weirdness_score": 6.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM-12L",
        "year_introduced": 2012, "year_discontinued": 2014,
        "calc_type": "financial", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 37,
        "description": "A card-sized tribute to the HP-12C financial calculator, offering RPN TVM, cash flow, and amortization calculations in a machined aluminum card body. Ran HP-12C ROM emulation.",
        "fun_facts": "The HP-12C has been in continuous production since 1981; the DM-12L offered a premium Swiss-machined alternative for finance professionals.",
        "tags": ["rpn", "financial", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.0, "weirdness_score": 5.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM-15L",
        "year_introduced": 2012, "year_discontinued": 2015,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Card-sized homage to the legendary HP-15C advanced scientific calculator, widely regarded as one of the greatest RPN calculators ever made. Ran HP-15C ROM emulation with complex number and matrix support.",
        "fun_facts": "The HP-15C is so beloved that HP re-released it in 2011; the DM-15L offered a machined-aluminum premium version for serious collectors.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end"],
        "rarity_score": 7.0, "weirdness_score": 6.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM-16L",
        "year_introduced": 2013, "year_discontinued": 2015,
        "calc_type": "programmable", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Card-sized homage to the HP-16C computer scientist's calculator, designed for programmers needing hex/octal/binary arithmetic and bit-manipulation in a machined aluminum card form factor.",
        "fun_facts": "The HP-16C is the rarest and most sought-after Voyager — original units sell for $300+ used. The DM-16L made its functions accessible again.",
        "tags": ["rpn", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.0, "weirdness_score": 7.0, "images": [],
    },
    # ── Second generation – full-size (2014-2017) ────────────────────────────
    {
        "make": "SwissMicros", "model": "DM41",
        "year_introduced": 2014, "year_discontinued": 2017,
        "calc_type": "programmable", "display_type": "LCD",
        "power_source": "Battery (AAA x3)", "num_keys": 49,
        "description": "A full-size homage to the HP-41C/CV/CX series running an ARM-based Nut processor emulation. Featured an alphanumeric LCD and supported HP-41 program modules.",
        "fun_facts": "The HP-41C was used aboard the Space Shuttle; the DM41 brought that legendary programmability back in a modern CNC-machined aluminum chassis.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end"],
        "rarity_score": 7.0, "weirdness_score": 7.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM41L",
        "year_introduced": 2015, "year_discontinued": 2017,
        "calc_type": "programmable", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 49,
        "description": "A card-sized version of the DM41, shrinking the HP-41 emulation into SwissMicros' signature slim aluminum card body. All HP-41C functions in something that fits in a shirt pocket.",
        "fun_facts": "Achieving a full HP-41 alphanumeric display in credit-card form required a tiny but highly readable custom LCD.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.0, "weirdness_score": 8.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM1",
        "year_introduced": 2016, "year_discontinued": 2017,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (SR41/LR41)", "num_keys": 28,
        "description": "An homage to the ultra-rare HP-01 calculator watch, the DM1 was a tiny wrist-worn calculator concept in a highly limited run.",
        "fun_facts": "The original HP-01 (1977) was HP's only calculator watch; working examples sell for over $1,000. The DM1 revisited this concept with modern ARM hardware.",
        "tags": ["rpn", "scientific", "swiss", "high-end", "limited-edition"],
        "rarity_score": 9.0, "weirdness_score": 9.0, "images": [],
    },
    # ── DM42 generation – E Ink era (2017–present) ──────────────────────────
    {
        "make": "SwissMicros", "model": "DM42",
        "year_introduced": 2017,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "Battery (CR2032 x2)", "num_keys": 43,
        "description": "SwissMicros' landmark product and the world's first calculator with an E Ink display, inspired by the HP-42S. Runs Free42 natively with a large crisp display and blazing ARM Cortex-M7 performance. Fully open-source hardware and firmware.",
        "fun_facts": "The DM42 is widely considered the finest RPN scientific calculator available new in the 2020s, and its Free42 firmware runs faster than the original HP-42S by many orders of magnitude.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 3.0, "weirdness_score": 6.0,
        "images": ["https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/DM42_calculator.jpg/480px-DM42_calculator.jpg"],
    },
    {
        "make": "SwissMicros", "model": "DM42N",
        "year_introduced": 2021,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "USB-C rechargeable", "num_keys": 43,
        "description": "Updated DM42 with USB-C rechargeable LiPo battery instead of coin cells. Runs the same Free42/DMCP firmware with modern charging convenience.",
        "fun_facts": "The 'N' stands for 'new' — USB-C charging brought the DM42 experience fully into the modern era.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 2.5, "weirdness_score": 5.5, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM42 Silver Edition",
        "year_introduced": 2018, "year_discontinued": 2019,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "Battery (CR2032 x2)", "num_keys": 43,
        "description": "Limited commemorative DM42 with brushed silver anodized aluminum body in premium packaging. Functionally identical to the standard DM42.",
        "fun_facts": "Limited production run; quickly sold out and now commands a premium among SwissMicros collectors.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.5, "weirdness_score": 4.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM42 Black Edition",
        "year_introduced": 2019, "year_discontinued": 2020,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "Battery (CR2032 x2)", "num_keys": 43,
        "description": "Limited-edition DM42 with matte black anodized aluminum body. Sold out rapidly and is a sought-after collector variant.",
        "fun_facts": "The black anodizing was achieved through a special finishing process distinct from SwissMicros' natural aluminum finish.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 8.5, "weirdness_score": 4.0, "images": [],
    },
    # ── DM41X family ────────────────────────────────────────────────────────
    {
        "make": "SwissMicros", "model": "DM41X",
        "year_introduced": 2019,
        "calc_type": "programmable", "display_type": "E Ink",
        "power_source": "Battery (CR2032 x2)", "num_keys": 49,
        "description": "A modern take on the HP-41CX using the E Ink platform. Runs an accurate HP-41CX emulation plus the DB48X/newRPL firmware, giving it capabilities far beyond the original.",
        "fun_facts": "The DM41X can run original HP-41C FOCAL programs as well as the modern newRPL OS, bridging 40 years of HP calculator history on one device.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 4.0, "weirdness_score": 7.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM41XN",
        "year_introduced": 2022,
        "calc_type": "programmable", "display_type": "E Ink",
        "power_source": "USB-C rechargeable", "num_keys": 49,
        "description": "Rechargeable USB-C variant of the DM41X with built-in LiPo battery. Runs both HP-41CX emulation and the DB48X/newRPL open-source firmware.",
        "fun_facts": "With DB48X, the DM41XN runs a modern RPL-like language that unifies HP-41 and HP-48 paradigms, making it one of the most versatile RPN calculators ever produced.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 3.0, "weirdness_score": 7.0, "images": [],
    },
    # ── DM15/DM15+ family ────────────────────────────────────────────────────
    {
        "make": "SwissMicros", "model": "DM15",
        "year_introduced": 2020, "year_discontinued": 2022,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Refined successor to the DM-15L with updated ARM hardware, improved key feel, and better display. Runs HP-15C emulation at speeds far exceeding the original.",
        "fun_facts": "Runs thousands of times faster than the original HP-15C, making previously slow matrix operations nearly instantaneous.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end"],
        "rarity_score": 6.0, "weirdness_score": 5.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM15+",
        "year_introduced": 2022,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Upgraded DM15 with improved display contrast, refined keycaps, and faster ARM processor. Full HP-15C emulation with complex numbers, matrix operations, and numerical integration.",
        "fun_facts": "The '+' suffix signals SwissMicros' continuous refinement philosophy — each generation brings measurably better key feel and display clarity.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 4.0, "weirdness_score": 5.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM15L",
        "year_introduced": 2020, "year_discontinued": 2022,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Second-generation slim card-sized HP-15C emulator with updated ARM hardware and improved build quality over the original DM-15L.",
        "fun_facts": "The card format returned by popular demand from customers who loved the original DM-15L's wallet-sized portability.",
        "tags": ["rpn", "scientific", "programmable", "swiss", "high-end", "limited-edition"],
        "rarity_score": 7.0, "weirdness_score": 6.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM15L+",
        "year_introduced": 2023,
        "calc_type": "scientific", "display_type": "LCD",
        "power_source": "Battery (CR2032)", "num_keys": 35,
        "description": "Latest iteration of the card-sized HP-15C emulator with improved display, refined keypad, and the latest ARM firmware. Combines the beloved slim form factor with modern performance.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 3.0, "weirdness_score": 5.0, "images": [],
    },
    # ── DM32 (2022) ──────────────────────────────────────────────────────────
    {
        "make": "SwissMicros", "model": "DM32",
        "year_introduced": 2022,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "USB-C rechargeable", "num_keys": 37,
        "description": "Inspired by the HP-32SII, the DM32 is a compact RPN scientific calculator running open-source calc32/Free42 firmware on an ARM Cortex-M7. Features a large E Ink display, USB-C charging, and equation solving.",
        "fun_facts": "The DM32 runs a higher-resolution E Ink panel than the DM42 and its open firmware supports equation solving and numerical integration natively.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 3.0, "weirdness_score": 5.0, "images": [],
    },
    # ── DM16 (2023) ──────────────────────────────────────────────────────────
    {
        "make": "SwissMicros", "model": "DM16",
        "year_introduced": 2023,
        "calc_type": "programmable", "display_type": "E Ink",
        "power_source": "USB-C rechargeable", "num_keys": 37,
        "description": "Modern reimagining of the HP-16C computer scientist's calculator with E Ink display and USB-C charging. Runs DB16X firmware extending the HP-16C with modern programming features.",
        "fun_facts": "The DM16 is powered by DB16X firmware that adds a proper programming language on top of the HP-16C integer/bit-manipulation core — the most powerful programmable integer calculator ever made.",
        "tags": ["rpn", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 3.0, "weirdness_score": 7.0, "images": [],
    },
    # ── Community firmware editions ──────────────────────────────────────────
    {
        "make": "SwissMicros", "model": "WP43S",
        "year_introduced": 2021, "year_discontinued": 2023,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "Battery (CR2032 x2)", "num_keys": 43,
        "description": "Collaboration between SwissMicros and the WP43S community project. Ran WP43S open-source firmware — a next-generation RPN/RPL scientific calculator OS with 128-bit precision arithmetic and hundreds of built-in functions.",
        "fun_facts": "WP43S firmware provides over 1,000 mathematical functions, far exceeding any vintage HP calculator. The project later evolved into the C43/WP43C.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end", "limited-edition"],
        "rarity_score": 6.0, "weirdness_score": 8.0, "images": [],
    },
    {
        "make": "SwissMicros", "model": "DM43",
        "year_introduced": 2022, "year_discontinued": 2024,
        "calc_type": "scientific", "display_type": "E Ink",
        "power_source": "USB-C rechargeable", "num_keys": 43,
        "description": "Rechargeable USB-C variant of the WP43S platform, combining DM42N hardware with WP43C/C47 community firmware. Offered 128-bit decimal floating point and a massive built-in function library.",
        "fun_facts": "The DM43 bridged the community firmware project with SwissMicros' newer power architecture.",
        "tags": ["rpn", "scientific", "programmable", "modern", "swiss", "high-end"],
        "rarity_score": 5.0, "weirdness_score": 7.0, "images": [],
    },
]


async def seed():
    engine_url = DATABASE_URL
    if "asyncpg" not in engine_url:
        engine_url = engine_url.replace("postgresql://", "postgresql+asyncpg://")

    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.models.calculator import Calculator

    engine = create_async_engine(engine_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    added = skipped = 0
    async with async_session() as session:
        for data in CALCS:
            exists = await session.execute(
                select(Calculator).where(
                    Calculator.make == data["make"],
                    Calculator.model == data["model"],
                )
            )
            if exists.scalar_one_or_none():
                print(f"  skip: {data['make']} {data['model']}")
                skipped += 1
                continue
            calc = Calculator(
                make=data["make"], model=data["model"],
                year_introduced=data.get("year_introduced"),
                year_discontinued=data.get("year_discontinued"),
                calc_type=data.get("calc_type", "scientific"),
                display_type=data.get("display_type"),
                power_source=data.get("power_source"),
                num_keys=data.get("num_keys"),
                description=data.get("description"),
                fun_facts=data.get("fun_facts"),
                tags=data.get("tags", []),
                rarity_score=data.get("rarity_score"),
                weirdness_score=data.get("weirdness_score"),
                images=data.get("images", []),
                external_refs=[],
                is_verified=True,
            )
            session.add(calc)
            print(f"  + {data['make']} {data['model']} ({data.get('year_introduced','?')})")
            added += 1
        await session.commit()
    await engine.dispose()
    print(f"\n✅ Added {added}, skipped {skipped}")

if __name__ == "__main__":
    asyncio.run(seed())
