#!/usr/bin/env python3
"""Idempotent 9-post/day schedule seeder for NEW Neon Postgres, never Supabase."""
import argparse
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from schedule import daily_posts  # noqa: E402

ROME = ZoneInfo("Europe/Rome")

def database_url():
    url = os.environ.get("RMP_NEON_DATABASE_URL", "")
    parsed = urlparse(url)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise RuntimeError("DATABASE_URL missing or invalid scheme")
    if not parsed.hostname or not parsed.hostname.endswith(".neon.tech"):
        raise RuntimeError("DATABASE_URL must target Neon, never the old Supabase")
    if not parsed.password or not parsed.username:
        raise RuntimeError("DATABASE_URL lacks credentials")
    return url

def run(days):
    if not 1 <= days <= 7:
        raise ValueError("days must be 1-7")
    import psycopg
    from psycopg.rows import dict_row
    conn_string = database_url()
    now = datetime.now(ROME).date()
    count = 0
    with psycopg.connect(conn_string, sslmode="require", row_factory=dict_row, connect_timeout=15) as conn:
        with conn.cursor() as cur:
            cur.execute("select enabled,rights_verified,live_test_verified from rmp.settings where singleton=true")
            state = cur.fetchone()
            if not state:
                raise RuntimeError("Neon schema not initialized")
            for step in range(days):
                for item in daily_posts(now + timedelta(days=step)):
                    cur.execute("""
                        insert into rmp.posts
                            (id, platform, local_date, local_time, scheduled_at, caption, status)
                        values (%(id)s, %(platform)s, %(local_date)s, %(local_time)s,
                                %(scheduled_at)s, %(caption)s, 'READY')
                        on conflict (id) do nothing
                        """, item)
                    count += cur.rowcount
    print(f"Neon seed inserted {count} new posts; existing posts preserved.")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--days", type=int, default=7)
    args = p.parse_args()
    run(args.days)
