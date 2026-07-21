"""Decide whether the ten-minute KBO result refresh should run.

The workflow wakes up on a cron schedule, but the expensive browser scraper only runs
when at least one KBO game is 150 minutes past its scheduled start and is not terminal.
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


KST = ZoneInfo("Asia/Seoul")
REFRESH_DELAY = timedelta(minutes=int(os.environ.get("RESULT_REFRESH_DELAY_MINUTES", "150")))
REFRESH_LIMIT = timedelta(minutes=int(os.environ.get("RESULT_REFRESH_LIMIT_MINUTES", "540")))
TERMINAL_STATUSES = {"FINISHED", "POSTPONED", "CANCELLED"}


def fetch_rows(table, start_date, end_date):
    base = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    query = urlencode([
        ("select", "game_date,game_time,status"),
        ("game_date", f"gte.{start_date}"),
        ("game_date", f"lte.{end_date}"),
        ("order", "game_date.asc,game_time.asc"),
    ])
    request = Request(
        f"{base}/rest/v1/{table}?{query}",
        headers={"apikey": key, "Authorization": f"Bearer {key}"},
    )
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def game_start(row):
    raw_date = str(row.get("game_date") or "")[:10]
    raw_time = str(row.get("game_time") or "")[:5]
    if not raw_date or len(raw_time) != 5:
        return None
    try:
        return datetime.fromisoformat(f"{raw_date}T{raw_time}:00").replace(tzinfo=KST)
    except ValueError:
        return None


def select_refresh_target(rows, now):
    candidates = []
    for row in rows:
        if str(row.get("status") or "").upper() in TERMINAL_STATUSES:
            continue
        start = game_start(row)
        if not start:
            continue
        if start + REFRESH_DELAY <= now <= start + REFRESH_LIMIT:
            candidates.append((start, row))
    if not candidates:
        return None
    return min(candidates, key=lambda item: item[0])[1]


def write_output(name, value):
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with Path(output).open("a", encoding="utf-8") as stream:
            stream.write(f"{name}={value}\n")
    print(f"{name}={value}")


def main():
    now = datetime.now(KST)
    start_date = (now.date() - timedelta(days=1)).isoformat()
    end_date = now.date().isoformat()

    rows = []
    source = "kbo_all_games"
    try:
        rows = fetch_rows(source, start_date, end_date)
    except Exception as error:
        print(f"WARNING: could not read {source}: {error}")

    target = select_refresh_target(rows, now)
    if not target:
        source = "games"
        try:
            rows = fetch_rows(source, start_date, end_date)
        except Exception as error:
            print(f"WARNING: could not read {source}: {error}")
            rows = []
        target = select_refresh_target(rows, now)

    if target:
        start = game_start(target)
        write_output("should_run", "true")
        write_output("target_date", str(target["game_date"])[:10])
        print(f"Result refresh active: {source} game started at {start.isoformat()} ({target.get('status')}).")
    else:
        write_output("should_run", "false")
        write_output("target_date", now.date().isoformat())
        print(f"Result refresh skipped: no unfinished game is within the refresh window ({len(rows)} rows checked).")


if __name__ == "__main__":
    main()
