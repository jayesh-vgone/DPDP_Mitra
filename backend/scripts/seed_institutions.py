"""
Seed demo institutions with known invite codes and institution categories.

Run this AFTER migrate_phase5.py and migrate_phase6a.py.

The ON CONFLICT clause uses DO UPDATE so re-runs are safe and will
correct the category field on already-existing rows.

Usage (from backend/ directory):
    python scripts/seed_institutions.py
"""

import asyncio
from pathlib import Path
import os

import asyncpg
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.environ["DATABASE_URL"]

# category is the new Phase 6a field that controls which question set an
# institution answers. It is distinct from 'type' (free-text display field).
INSTITUTIONS = [
    {
        "name": "Sunrise Public School",
        "type": "School K-12",
        "board": "CBSE",
        "location": "Mumbai, Maharashtra",
        "student_count": 2400,
        "staff_count": 120,
        "invite_code": "SUNRISE-2024",
        "plan": "Institution Pro",
        "category": "school",
    },
    {
        "name": "Delhi College of Commerce",
        "type": "College",
        "board": "UGC",
        "location": "New Delhi, Delhi",
        "student_count": 5800,
        "staff_count": 280,
        "invite_code": "DCC-INVITE",
        "plan": "Institution Pro",
        "category": "higher_ed",
    },
    {
        "name": "Vidya University",
        "type": "University",
        "board": "UGC",
        "location": "Bengaluru, Karnataka",
        "student_count": 15000,
        "staff_count": 900,
        "invite_code": "VIDYA-UNI",
        "plan": "Basic",
        "category": "higher_ed",
    },
    {
        "name": "BrightPath Learning Pvt Ltd",
        "type": "EdTech Company",
        "board": None,
        "location": "Hyderabad, Telangana",
        "student_count": 250000,
        "staff_count": 340,
        "invite_code": "EDTECH-DEMO",
        "plan": "Institution Pro",
        "category": "edtech",
    },
]


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        upserted = 0
        for inst in INSTITUTIONS:
            result = await conn.execute(
                """
                INSERT INTO institutions
                    (name, type, board, location, student_count, staff_count,
                     invite_code, plan, category)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (invite_code) DO UPDATE SET
                    name          = EXCLUDED.name,
                    type          = EXCLUDED.type,
                    board         = EXCLUDED.board,
                    location      = EXCLUDED.location,
                    student_count = EXCLUDED.student_count,
                    staff_count   = EXCLUDED.staff_count,
                    plan          = EXCLUDED.plan,
                    category      = EXCLUDED.category
                """,
                inst["name"],
                inst["type"],
                inst["board"],
                inst["location"],
                inst["student_count"],
                inst["staff_count"],
                inst["invite_code"],
                inst["plan"],
                inst["category"],
            )
            # "INSERT 0 1" on insert, "UPDATE 1" on update
            upserted += 1

        print(f"\n{'='*60}")
        print("  DPDP Mitra -- Demo Institutions Seeded / Updated")
        print(f"{'='*60}")
        print(f"  {upserted} institution(s) upserted\n")
        for inst in INSTITUTIONS:
            print(f"  Institution : {inst['name']}")
            print(f"  Type        : {inst['type']}"
                  + (f" ({inst['board']})" if inst["board"] else ""))
            print(f"  Location    : {inst['location']}")
            print(f"  Category    : {inst['category']}")
            print(f"  Plan        : {inst['plan']}")
            print(f"  INVITE CODE : {inst['invite_code']}")
            print()
        print(f"{'='*60}")
        print("  Use one of the invite codes above to register.")
        print("  Categories: school | higher_ed | edtech\n")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
