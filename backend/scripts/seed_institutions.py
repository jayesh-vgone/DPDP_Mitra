"""
Seed demo institutions with known invite codes.

Run this AFTER migrate_phase5.py.
Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING.

Usage (from backend/ directory):
    python scripts/seed_institutions.py
"""

import asyncio
from pathlib import Path

import asyncpg
from dotenv import load_dotenv
import os

load_dotenv(Path(__file__).parent.parent / ".env")

DATABASE_URL = os.environ["DATABASE_URL"]

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
    },
]


async def run():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        created = 0
        for inst in INSTITUTIONS:
            result = await conn.execute(
                """
                INSERT INTO institutions
                    (name, type, board, location, student_count, staff_count, invite_code, plan)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (invite_code) DO NOTHING
                """,
                inst["name"],
                inst["type"],
                inst["board"],
                inst["location"],
                inst["student_count"],
                inst["staff_count"],
                inst["invite_code"],
                inst["plan"],
            )
            # asyncpg returns "INSERT 0 N" — parse N
            n = int(result.split()[-1])
            if n > 0:
                created += 1

        print(f"\n{'='*56}")
        print("  DPDP Mitra — Demo Institutions Seeded")
        print(f"{'='*56}")
        print(f"  {created} new institution(s) created (duplicates skipped)\n")
        for inst in INSTITUTIONS:
            print(f"  Institution : {inst['name']}")
            print(f"  Type        : {inst['type']} ({inst['board']})")
            print(f"  Location    : {inst['location']}")
            print(f"  Plan        : {inst['plan']}")
            print(f"  INVITE CODE : {inst['invite_code']}")
            print()
        print(f"{'='*56}")
        print("  Use one of the invite codes above to register.\n")

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run())
