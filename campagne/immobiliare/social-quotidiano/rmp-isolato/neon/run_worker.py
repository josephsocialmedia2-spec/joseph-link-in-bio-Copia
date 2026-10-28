#!/usr/bin/env python3
"""Neon PostgreSQL adapter for existing REAL MEDIA PRO social worker.

STAGING ONLY: requires NEW Neon Free account, a DATABASE_URL secret, verified
Meta/LinkedIn OAuth and media rights. Does not deploy or activate any schedule.
Database credentials and social tokens NEVER enter browser JavaScript.
"""
import sys
from datetime import date, datetime, time
from decimal import Decimal
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from neon.seed import database_url, run as seed_neon
import worker as base

TABLES = {
    "rmp_settings": "settings",
    "rmp_accounts": "accounts",
    "rmp_quotas": "quotas",
    "rmp_posts": "posts",
    "rmp_events": "events",
}
UPDATE_FIELDS = {
    "posts": frozenset({"status","attempts","claimed_at","published_at",
                       "remote_id","permalink","last_error","updated_at"}),
    "accounts": frozenset({"account_id","display_name","verified","verified_at","last_error"}),
    "settings": frozenset({"live_test_verified"}),
}
base.REQUIRED_QUOTAS = ("github_actions", "neon_database", "neon_object_storage", "meta", "linkedin")

def safe_row(record):
    if record is None:
        return None
    return {
        k: (v.isoformat() if isinstance(v, (datetime, date, time)) else
            float(v) if isinstance(v, Decimal) else v)
        for k, v in dict(record).items()
    }

def exact_filter(q, key):
    vals = q.get(key, [])
    if len(vals) != 1 or not vals[0].startswith("eq."):
        raise base.Blocked("Missing exact database filter: "+key)
    return vals[0][3:]

def pg_db(path, method="GET", data=None, extra=""):
    """Whitelist original worker's REST operations; parameterize all values.

    All requests are server-side transactions against the private rmp schema.
    """
    from psycopg import connect, sql
    from psycopg.rows import dict_row
    if "?" in path:
        short, tail = path.split("?", 1)
    else:
        short, tail = path, ""
    tab = TABLES.get(short)
    if not tab:
        raise base.Blocked("Unknown Neon table")
    query = parse_qs((tail+"&" if tail and extra else tail)+extra.lstrip("?"),
                     keep_blank_values=True)
    out = []
    with connect(database_url(), sslmode="require",
                 connect_timeout=15, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            if method == "GET":
                if tab == "settings" and query.get("singleton") == ["eq.true"]:
                    cur.execute("select * from rmp.settings where singleton=true")
                elif tab == "accounts":
                    cur.execute("select * from rmp.accounts order by platform")
                elif tab == "quotas":
                    cur.execute("select * from rmp.quotas order by provider")
                elif tab == "posts" and query.get("status") == ["in.(CLAIMED,UNCERTAIN)"]:
                    cur.execute("""select * from rmp.posts
                        where status in ('CLAIMED','UNCERTAIN')
                        order by scheduled_at asc limit 100""")
                elif tab == "posts" and query.get("status") == ["eq.READY"]:
                    lower = query.get("scheduled_at", [])
                    # parse_qs gives two values for gte / lte
                    limits = [v.split(".",1) for v in lower]
                    byop = {op:ts for op,ts in limits if op in ("gte","lte")}
                    if set(byop) != {"gte","lte"}:
                        raise base.Blocked("Due-query requires bounded window")
                    cur.execute("""select * from rmp.posts
                        where status='READY' and scheduled_at >= %s::timestamptz
                           and scheduled_at <= %s::timestamptz
                        order by scheduled_at asc limit 30""",
                        (byop["gte"],byop["lte"]))
                elif tab == "posts" and "scheduled_at" in query:
                    value = exact_filter(query,"scheduled_at")
                    if query.get("select") != ["platform,status"]:
                        raise base.Blocked("Unexpected post lookup")
                    cur.execute("""select platform,status from rmp.posts
                                   where scheduled_at=%s::timestamptz
                                   order by platform""",(value,))
                else:
                    raise base.Blocked("Neon SQL adapter rejected unrecognized GET")
                out = [safe_row(row) for row in cur.fetchall()]
            elif method == "PATCH":
                if tab not in UPDATE_FIELDS or not isinstance(data,dict) or not data:
                    raise base.Blocked("Unapproved table update")
                if not set(data).issubset(UPDATE_FIELDS[tab]):
                    raise base.Blocked("Unapproved column update")
                if tab == "posts":
                    column="id"
                    val=exact_filter(query,"id")
                elif tab == "accounts":
                    column="platform"
                    val=exact_filter(query,"platform")
                else:
                    column="singleton"
                    val=exact_filter(query,"singleton")
                    if val != "true":raise base.Blocked("Invalid settings singleton")
                    val=True
                cols=list(data)
                where=sql.SQL("{}=%s").format(sql.Identifier(column))
                args=[data[k] for k in cols]+[val]
                if tab == "posts" and "status" in query:
                    previous=exact_filter(query,"status")
                    where += sql.SQL(" and status=%s")
                    args.append(previous)
                statement=sql.SQL("update rmp.{} set {} where {} returning *").format(
                    sql.Identifier(tab),
                    sql.SQL(", ").join(
                        sql.SQL("{}=%s").format(sql.Identifier(k)) for k in cols
                    ),where
                )
                cur.execute(statement,args)
                out=[safe_row(row) for row in cur.fetchall()]
            elif method == "POST" and tab == "events":
                if not isinstance(data,dict) or not set(data).issubset(
                    {"post_id","event_type","detail"}):
                    raise base.Blocked("Invalid event audit payload")
                cur.execute("""insert into rmp.events(post_id,event_type,detail)
                    values (%s,%s,%s) returning id""",
                    (data.get("post_id"),data.get("event_type"),data.get("detail")))
                out=[safe_row(row) for row in cur.fetchall()]
            else:
                raise base.Blocked("Neon SQL adapter rejected unapproved operation")
    return out

# Replace ONLY database and seed implementations, retain original API gates
# and all safety checks. Never monkeypatch HTTP handlers or token verification.
base.db = pg_db
base.seed = seed_neon

if __name__ == "__main__":
    base.main()
