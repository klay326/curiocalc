#!/usr/bin/env python3
"""Seed 85 Casio calculators into the CurioCalc database."""
import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

sys.path.insert(0, "/app")
from app.models.calculator import Calculator

DATABASE_URL = "postgresql+asyncpg://curiocalc:d5eea1a5ad158fa4e6309ea1ee8b581b@postgres:5432/curiocalc"

# calc_type normalisation map
TYPE_MAP = {
    "basic_arithmetic":       "basic",
    "programmable_scientific": "programmable",
    "pocket_computer":        "pocket",
    "graphing_CAS":           "graphing",
    "financial":              "financial",
    "printing":               "printing",
    "scientific":             "scientific",
    "graphing":               "graphing",
}

CASIO_CALCULATORS = [
    # 1970s ORIGINS
    {"make":"Casio","model":"Casio Mini","year_introduced":1972,"year_discontinued":1975,"calc_type":"basic","display_type":"VFD","power_source":"AC adapter","num_keys":21,"rarity_score":8,"weirdness_score":4,"tags":["vintage","1970s","consumer","historic","Japan"]},
    {"make":"Casio","model":"AL-1000","year_introduced":1970,"year_discontinued":1972,"calc_type":"basic","display_type":"nixie tube","power_source":"AC adapter","num_keys":18,"rarity_score":10,"weirdness_score":7,"tags":["vintage","1970s","nixie","desktop","historic","Japan"]},
    {"make":"Casio","model":"fx-1","year_introduced":1972,"year_discontinued":1975,"calc_type":"scientific","display_type":"VFD","power_source":"AC adapter","num_keys":30,"rarity_score":9,"weirdness_score":5,"tags":["vintage","1970s","scientific","historic","first"]},
    {"make":"Casio","model":"fx-10","year_introduced":1975,"year_discontinued":1978,"calc_type":"scientific","display_type":"LED","power_source":"AC adapter / battery","num_keys":32,"rarity_score":8,"weirdness_score":3,"tags":["vintage","1970s","scientific"]},
    {"make":"Casio","model":"Personal HL-820","year_introduced":1973,"year_discontinued":1976,"calc_type":"basic","display_type":"LCD","power_source":"AA batteries","num_keys":18,"rarity_score":8,"weirdness_score":4,"tags":["vintage","1970s","LCD pioneer","pocket","consumer"]},

    # PROGRAMMABLE KEYSTROKE SERIES
    {"make":"Casio","model":"FX-501P","year_introduced":1978,"year_discontinued":1983,"calc_type":"programmable","display_type":"LCD","power_source":"2x LR44","num_keys":40,"rarity_score":9,"weirdness_score":5,"tags":["programmable","1970s","historic","keystroke","LCD pioneer"]},
    {"make":"Casio","model":"FX-502P","year_introduced":1978,"year_discontinued":1983,"calc_type":"programmable","display_type":"LCD","power_source":"2x LR44","num_keys":40,"rarity_score":8,"weirdness_score":5,"tags":["programmable","1970s","historic","keystroke","LCD pioneer"]},
    {"make":"Casio","model":"FX-601P","year_introduced":1981,"year_discontinued":1989,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":43,"rarity_score":7,"weirdness_score":4,"tags":["programmable","1980s","keystroke","scientific"]},
    {"make":"Casio","model":"FX-602P","year_introduced":1981,"year_discontinued":1989,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":43,"rarity_score":6,"weirdness_score":5,"tags":["programmable","1980s","keystroke","scientific","flagship"]},
    {"make":"Casio","model":"FX-603P","year_introduced":1990,"year_discontinued":1996,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"3x CR-2032","num_keys":44,"rarity_score":10,"weirdness_score":6,"tags":["programmable","1990s","keystroke","scientific","rare"]},
    {"make":"Casio","model":"FX-702P","year_introduced":1981,"year_discontinued":1984,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":56,"rarity_score":8,"weirdness_score":7,"tags":["pocket computer","1980s","BASIC","programmable","Japan"]},

    # PB POCKET COMPUTER SERIES
    {"make":"Casio","model":"PB-100","year_introduced":1983,"year_discontinued":1986,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":50,"rarity_score":7,"weirdness_score":8,"tags":["pocket computer","1980s","BASIC","miniature","Japan"]},
    {"make":"Casio","model":"PB-110","year_introduced":1984,"year_discontinued":1987,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":50,"rarity_score":8,"weirdness_score":7,"tags":["pocket computer","1980s","BASIC","miniature","Japan"]},
    {"make":"Casio","model":"PB-200","year_introduced":1984,"year_discontinued":1988,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":55,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan"]},
    {"make":"Casio","model":"PB-700","year_introduced":1984,"year_discontinued":1988,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"4x AA alkaline","num_keys":64,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan"]},
    {"make":"Casio","model":"PB-1000","year_introduced":1986,"year_discontinued":1990,"calc_type":"pocket","display_type":"LCD dot-matrix touchpad","power_source":"3x AA alkaline","num_keys":16,"rarity_score":9,"weirdness_score":9,"tags":["pocket computer","1980s","touchscreen","BASIC","assembly","historic"]},
    {"make":"Casio","model":"PB-2000C","year_introduced":1987,"year_discontinued":1991,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"4x AA alkaline","num_keys":72,"rarity_score":9,"weirdness_score":9,"tags":["pocket computer","1980s","C language","BASIC","Japan","flagship"]},

    # FX-700P / FX-850P SERIES
    {"make":"Casio","model":"FX-700P","year_introduced":1982,"year_discontinued":1986,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":50,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan"]},
    {"make":"Casio","model":"FX-750P","year_introduced":1984,"year_discontinued":1988,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":52,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan"]},
    {"make":"Casio","model":"FX-795P","year_introduced":1985,"year_discontinued":1990,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":54,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan","Katakana"]},
    {"make":"Casio","model":"FX-850P","year_introduced":1987,"year_discontinued":1999,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032 + backup","num_keys":56,"rarity_score":6,"weirdness_score":7,"tags":["pocket computer","1980s","BASIC","Japan","Kanji","RS-232"]},
    {"make":"Casio","model":"FX-860P","year_introduced":1988,"year_discontinued":1995,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032 + backup","num_keys":56,"rarity_score":8,"weirdness_score":6,"tags":["pocket computer","1980s","BASIC","Japan","Europe"]},
    {"make":"Casio","model":"FX-880P","year_introduced":1989,"year_discontinued":1999,"calc_type":"pocket","display_type":"LCD dot-matrix","power_source":"2x CR-2032 + backup","num_keys":56,"rarity_score":7,"weirdness_score":7,"tags":["pocket computer","1980s","BASIC","Japan","flagship"]},

    # GRAPHING — FIRST GENERATION (1985–1993)
    {"make":"Casio","model":"fx-6000G","year_introduced":1985,"year_discontinued":1990,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":48,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic"]},
    {"make":"Casio","model":"fx-6500G","year_introduced":1985,"year_discontinued":1991,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":48,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic"]},
    {"make":"Casio","model":"fx-7200G","year_introduced":1985,"year_discontinued":1992,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":50,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic"]},
    {"make":"Casio","model":"fx-7500G","year_introduced":1985,"year_discontinued":1992,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":50,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic","Japan"]},
    {"make":"Casio","model":"fx-8000G","year_introduced":1985,"year_discontinued":1993,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":54,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic","flagship"]},
    {"make":"Casio","model":"fx-8500G","year_introduced":1985,"year_discontinued":1993,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":54,"rarity_score":8,"weirdness_score":4,"tags":["graphing","1985","first generation","historic","flagship"]},
    {"make":"Casio","model":"fx-6300G","year_introduced":1990,"year_discontinued":1995,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":42,"rarity_score":6,"weirdness_score":3,"tags":["graphing","1990s","budget","Power Graphic"]},
    {"make":"Casio","model":"CFX-9800G","year_introduced":1994,"year_discontinued":1998,"calc_type":"graphing","display_type":"color LCD","power_source":"CR-2032 + 4x AAA","num_keys":54,"rarity_score":8,"weirdness_score":6,"tags":["graphing","1990s","3-color","historic","CFX"]},
    {"make":"Casio","model":"CFX-9850G","year_introduced":1996,"year_discontinued":2000,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":56,"rarity_score":5,"weirdness_score":4,"tags":["graphing","1990s","3-color","CFX","icon menu"]},
    {"make":"Casio","model":"fx-9750G","year_introduced":1996,"year_discontinued":2004,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":54,"rarity_score":4,"weirdness_score":2,"tags":["graphing","1990s","monochrome","budget","student"]},
    {"make":"Casio","model":"fx-9950G","year_introduced":1996,"year_discontinued":2002,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":56,"rarity_score":6,"weirdness_score":3,"tags":["graphing","1990s","3-color","CFX","high memory"]},
    {"make":"Casio","model":"Algebra FX 1.0","year_introduced":1999,"year_discontinued":2003,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":56,"rarity_score":7,"weirdness_score":6,"tags":["graphing","1990s","flash memory","hackable","Algebra FX"]},
    {"make":"Casio","model":"fx-9970G","year_introduced":1998,"year_discontinued":2001,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":56,"rarity_score":9,"weirdness_score":8,"tags":["graphing","CAS","1990s","Japan only","3-color","rare"]},

    # fx-9860G FAMILY
    {"make":"Casio","model":"fx-9860G","year_introduced":2005,"year_discontinued":2010,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":4,"weirdness_score":3,"tags":["graphing","2000s","USB","SDK","eActivity"]},
    {"make":"Casio","model":"fx-9860G SD","year_introduced":2005,"year_discontinued":2010,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":6,"weirdness_score":6,"tags":["graphing","2000s","SD card","USB","unique feature"]},
    {"make":"Casio","model":"fx-9860G Slim","year_introduced":2007,"year_discontinued":2012,"calc_type":"graphing","display_type":"LCD dot-matrix backlit","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":6,"weirdness_score":6,"tags":["graphing","2000s","clamshell","backlit","slim"]},
    {"make":"Casio","model":"fx-7400GII","year_introduced":2009,"year_discontinued":2016,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":54,"rarity_score":3,"weirdness_score":2,"tags":["graphing","2000s","budget","student"]},
    {"make":"Casio","model":"fx-9750GII","year_introduced":2009,"year_discontinued":2017,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":3,"weirdness_score":3,"tags":["graphing","2000s","student","hackable"]},
    {"make":"Casio","model":"fx-9860GII (Power Graphic 3)","year_introduced":2009,"year_discontinued":2020,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":3,"weirdness_score":2,"tags":["graphing","2000s","USB","SDK","mainstream"]},
    {"make":"Casio","model":"fx-9860GII SD","year_introduced":2009,"year_discontinued":2015,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":6,"weirdness_score":5,"tags":["graphing","2000s","SD card","unique","collector"]},
    {"make":"Casio","model":"fx-9860GIII","year_introduced":2020,"year_discontinued":None,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":2,"weirdness_score":2,"tags":["graphing","2020s","MicroPython","modern"]},
    {"make":"Casio","model":"fx-9750GIII","year_introduced":2020,"year_discontinued":None,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":2,"weirdness_score":2,"tags":["graphing","2020s","budget","MicroPython","student"]},

    # FRENCH MARKET (GRAPH SERIES)
    {"make":"Casio","model":"Graph 75","year_introduced":2009,"year_discontinued":2017,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":5,"weirdness_score":3,"tags":["graphing","2000s","France","regional","exam"]},
    {"make":"Casio","model":"Graph 95","year_introduced":2009,"year_discontinued":2020,"calc_type":"graphing","display_type":"LCD dot-matrix backlit","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":6,"weirdness_score":4,"tags":["graphing","2000s","France","regional","backlit","exam"]},
    {"make":"Casio","model":"Graph 90+E","year_introduced":2017,"year_discontinued":None,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":61,"rarity_score":5,"weirdness_score":3,"tags":["graphing","2010s","color","France","regional","MicroPython"]},

    # FX-CG PRIZM COLOR SERIES
    {"make":"Casio","model":"fx-CG10","year_introduced":2011,"year_discontinued":2017,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":62,"rarity_score":5,"weirdness_score":5,"tags":["graphing","2010s","color","Prizm","historic","North America"]},
    {"make":"Casio","model":"fx-CG20","year_introduced":2011,"year_discontinued":2017,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":62,"rarity_score":5,"weirdness_score":5,"tags":["graphing","2010s","color","Prizm","historic","Europe"]},
    {"make":"Casio","model":"fx-CG50","year_introduced":2017,"year_discontinued":None,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":62,"rarity_score":2,"weirdness_score":2,"tags":["graphing","2010s","color","Prizm","MicroPython","3D"]},
    {"make":"Casio","model":"fx-CG500","year_introduced":2017,"year_discontinued":None,"calc_type":"graphing","display_type":"color LCD touchscreen","power_source":"4x AAA alkaline","num_keys":None,"rarity_score":5,"weirdness_score":7,"tags":["graphing","CAS","2010s","color","touchscreen","exam approved"]},
    {"make":"Casio","model":"fx-CG100","year_introduced":2024,"year_discontinued":None,"calc_type":"graphing","display_type":"color LCD","power_source":"4x AAA alkaline","num_keys":54,"rarity_score":3,"weirdness_score":5,"tags":["graphing","2020s","color","Python only","USB-C","ClassWiz CG"]},

    # CLASSPAD CAS SERIES
    {"make":"Casio","model":"ClassPad 330","year_introduced":2007,"year_discontinued":2012,"calc_type":"graphing","display_type":"LCD touchscreen","power_source":"4x AAA alkaline","num_keys":16,"rarity_score":5,"weirdness_score":7,"tags":["CAS","2000s","touchscreen","stylus","ClassPad"]},
    {"make":"Casio","model":"ClassPad 330 Plus","year_introduced":2012,"year_discontinued":2016,"calc_type":"graphing","display_type":"LCD touchscreen","power_source":"4x AAA alkaline","num_keys":16,"rarity_score":5,"weirdness_score":6,"tags":["CAS","2010s","touchscreen","stylus","ClassPad","USB"]},
    {"make":"Casio","model":"fx-CP400","year_introduced":2013,"year_discontinued":2020,"calc_type":"graphing","display_type":"color LCD touchscreen","power_source":"4x AAA alkaline","num_keys":30,"rarity_score":6,"weirdness_score":8,"tags":["CAS","2010s","color","touchscreen","ClassPad","portrait"]},
    {"make":"Casio","model":"Algebra FX 2.0 Plus","year_introduced":2001,"year_discontinued":2003,"calc_type":"graphing","display_type":"LCD dot-matrix","power_source":"4x AAA alkaline","num_keys":56,"rarity_score":7,"weirdness_score":6,"tags":["graphing","CAS","2000s","flash memory","Algebra FX"]},

    # fx-82 SCIENTIFIC SERIES
    {"make":"Casio","model":"fx-82","year_introduced":1982,"year_discontinued":1985,"calc_type":"scientific","display_type":"LCD","power_source":"2x AA alkaline","num_keys":34,"rarity_score":7,"weirdness_score":2,"tags":["scientific","1980s","classic","education","original"]},
    {"make":"Casio","model":"fx-82 SOLAR","year_introduced":1992,"year_discontinued":1998,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar only","num_keys":36,"rarity_score":5,"weirdness_score":5,"tags":["scientific","1990s","solar","education","no off button"]},
    {"make":"Casio","model":"fx-82MS","year_introduced":2001,"year_discontinued":2013,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":2,"weirdness_score":1,"tags":["scientific","2000s","2-line","education","best seller"]},
    {"make":"Casio","model":"fx-82ES","year_introduced":2004,"year_discontinued":2010,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":3,"weirdness_score":2,"tags":["scientific","2000s","natural display","education","historic"]},
    {"make":"Casio","model":"fx-82EX","year_introduced":2015,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":2,"weirdness_score":2,"tags":["scientific","2010s","ClassWiz","QR code","education"]},

    # fx-991 AND HIGH-END SCIENTIFIC
    {"make":"Casio","model":"fx-991S","year_introduced":1994,"year_discontinued":1997,"calc_type":"scientific","display_type":"LCD","power_source":"solar + LR44","num_keys":44,"rarity_score":6,"weirdness_score":3,"tags":["scientific","1990s","VPAM","flagship","education"]},
    {"make":"Casio","model":"fx-991MS","year_introduced":2001,"year_discontinued":2004,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":3,"weirdness_score":2,"tags":["scientific","2000s","2-line","education","flagship"]},
    {"make":"Casio","model":"fx-991ES","year_introduced":2004,"year_discontinued":2010,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":3,"weirdness_score":3,"tags":["scientific","2000s","natural display","historic","flagship"]},
    {"make":"Casio","model":"fx-991ES Plus","year_introduced":2010,"year_discontinued":2015,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":2,"weirdness_score":2,"tags":["scientific","2010s","natural display","education","exam approved"]},
    {"make":"Casio","model":"fx-991EX","year_introduced":2015,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":2,"weirdness_score":3,"tags":["scientific","2010s","ClassWiz","QR code","spreadsheet","flagship"]},
    {"make":"Casio","model":"fx-991CW","year_introduced":2022,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":2,"weirdness_score":3,"tags":["scientific","2020s","ClassWiz","grayscale","modern"]},

    # fx-570 AND INTERNATIONAL VARIANTS
    {"make":"Casio","model":"fx-570ES","year_introduced":2004,"year_discontinued":2010,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":3,"weirdness_score":2,"tags":["scientific","2000s","natural display","Asia","international"]},
    {"make":"Casio","model":"fx-570EX","year_introduced":2015,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":3,"weirdness_score":2,"tags":["scientific","2010s","ClassWiz","Asia","Vietnam","exam"]},
    {"make":"Casio","model":"fx-115ES Plus","year_introduced":2010,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":2,"weirdness_score":2,"tags":["scientific","2010s","natural display","USA","SAT","ACT"]},
    {"make":"Casio","model":"fx-260 Solar II","year_introduced":2004,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD","power_source":"solar only","num_keys":33,"rarity_score":2,"weirdness_score":2,"tags":["scientific","2000s","solar","GED","USA","exam"]},
    {"make":"Casio","model":"fx-300ES Plus","year_introduced":2010,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":1,"weirdness_score":1,"tags":["scientific","2010s","natural display","USA","student","exam"]},

    # PROGRAMMABLE SCIENTIFIC (NON-POCKET-COMPUTER)
    {"make":"Casio","model":"fx-3650P II","year_introduced":2012,"year_discontinued":None,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":4,"weirdness_score":4,"tags":["programmable","2010s","natural display","keystroke","Asia"]},
    {"make":"Casio","model":"fx-5800P","year_introduced":2007,"year_discontinued":None,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"2x CR-2032","num_keys":44,"rarity_score":6,"weirdness_score":5,"tags":["programmable","2000s","natural display","engineering","surveying"]},
    {"make":"Casio","model":"fx-50F Plus","year_introduced":2005,"year_discontinued":None,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":5,"weirdness_score":4,"tags":["programmable","2000s","Hong Kong","Asia","exam","keystroke"]},
    {"make":"Casio","model":"fx-3800P","year_introduced":1998,"year_discontinued":2006,"calc_type":"programmable","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":6,"weirdness_score":4,"tags":["programmable","1990s","keystroke","Asia"]},

    # FINANCIAL
    {"make":"Casio","model":"FC-100V","year_introduced":2004,"year_discontinued":None,"calc_type":"financial","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":4,"weirdness_score":3,"tags":["financial","2000s","TVM","Japan","certification"]},
    {"make":"Casio","model":"FC-200V","year_introduced":2004,"year_discontinued":None,"calc_type":"financial","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":44,"rarity_score":4,"weirdness_score":3,"tags":["financial","2000s","TVM","IRR","NPV","Japan","CFA"]},

    # PRINTING
    {"make":"Casio","model":"HR-100TM","year_introduced":2003,"year_discontinued":None,"calc_type":"printing","display_type":"LCD","power_source":"AC adapter + AA","num_keys":38,"rarity_score":1,"weirdness_score":2,"tags":["printing","2000s","desktop","accounting","USA"]},
    {"make":"Casio","model":"HR-8TM Plus","year_introduced":2010,"year_discontinued":None,"calc_type":"printing","display_type":"LCD","power_source":"AC adapter + AA backup","num_keys":40,"rarity_score":2,"weirdness_score":2,"tags":["printing","2010s","portable","accounting","thermal"]},

    # SPECIALTY
    {"make":"Casio","model":"OH-300ES","year_introduced":2004,"year_discontinued":2012,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":8,"weirdness_score":9,"tags":["scientific","2000s","overhead projector","classroom","transparent","rare"]},
    {"make":"Casio","model":"fx-82NL","year_introduced":2023,"year_discontinued":None,"calc_type":"scientific","display_type":"LCD dot-matrix","power_source":"solar + LR44","num_keys":40,"rarity_score":4,"weirdness_score":6,"tags":["scientific","2020s","semi-graphing","QR code","modern"]},

    # BASIC/CONSUMER
    {"make":"Casio","model":"SL-300VC","year_introduced":2004,"year_discontinued":None,"calc_type":"basic","display_type":"LCD","power_source":"solar only","num_keys":20,"rarity_score":1,"weirdness_score":1,"tags":["basic","2000s","solar","slim","pocket","consumer"]},
    {"make":"Casio","model":"MS-20UC","year_introduced":2016,"year_discontinued":None,"calc_type":"basic","display_type":"LCD","power_source":"solar + LR44","num_keys":29,"rarity_score":1,"weirdness_score":1,"tags":["basic","2010s","desk","consumer","colorful"]},
]


async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Fetch existing make+model combos to skip duplicates
        result = await session.execute(
            text("SELECT make || '|' || model FROM calculators WHERE make = 'Casio'")
        )
        existing = {row[0] for row in result}
        print(f"Existing Casio entries: {len(existing)}")

        added = 0
        skipped = 0
        for data in CASIO_CALCULATORS:
            key = f"{data['make']}|{data['model']}"
            if key in existing:
                print(f"  SKIP  {data['model']}")
                skipped += 1
                continue

            calc = Calculator(
                make=data["make"],
                model=data["model"],
                year_introduced=data.get("year_introduced"),
                year_discontinued=data.get("year_discontinued"),
                calc_type=data.get("calc_type", "other"),
                display_type=(data.get("display_type") or "")[:50] or None,
                power_source=data.get("power_source"),
                num_keys=data.get("num_keys"),
                rarity_score=data.get("rarity_score"),
                weirdness_score=data.get("weirdness_score"),
                tags=data.get("tags", []),
                images=[],
                external_refs={},
                is_verified=False,
            )
            session.add(calc)
            print(f"  ADD   {data['model']}")
            added += 1

        await session.commit()
        print(f"\nDone: {added} added, {skipped} skipped")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
