"""Publish year-specific official standings + postseason schedules as static data.

WebForms month navigation is reproduced using the page's own hidden fields and
image button names. No Supabase credentials are needed for the read-only archive.
"""
import argparse
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from kbo_season import KboHTML, parse_schedule_html, parse_standings_html, verified_standings

SCHEDULE_URL = "https://eng.koreabaseball.com/Schedule/DailySchedule.aspx"
STANDINGS_URL = "https://eng.koreabaseball.com/Standings/TeamStandings.aspx"
KST = timezone(timedelta(hours=9))


def navigate(session, html, direction):
    doc = KboHTML(html)
    data = {name: item.get("value", "") for name, item in doc.inputs.items()
            if item.get("type", "").lower() in ("hidden", "text")}
    suffix = "btnBefore" if direction == "prev" else "btnNext"
    button = next((name for name in doc.inputs if name.endswith(suffix)), None)
    if not button:
        raise ValueError(f"Missing KBO month navigation: {direction}")
    data.update({f"{button}.x": "10", f"{button}.y": "10"})
    response = session.post(SCHEDULE_URL, data=data, timeout=45)
    response.raise_for_status()
    return response.text


def collect(year, session, postseason_only=True):
    response = session.get(SCHEDULE_URL, timeout=45)
    response.raise_for_status()
    html = response.text
    # Collect every month which can contain postseason games, including a late
    # November/December finish. The official TYPE, never a date cutoff, decides.
    for _ in range(120):
        _, y, m = parse_schedule_html(html)
        if (y, m) == (year, 1):
            break
        html = navigate(session, html, "prev" if (y, m) > (year, 1) else "next")
    else:
        raise ValueError("Could not reach requested season")
    games = []
    for month in range(1, 13):
        rows, y, m = parse_schedule_html(html)
        if (y, m) != (year, month):
            raise ValueError(f"Incomplete season navigation: expected {year}-{month}, got {y}-{m}")
        games.extend(g for g in rows if not postseason_only or g["season_type"] == "POSTSEASON")
        if month < 12:
            html = navigate(session, html, "next")
    return games


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=datetime.now(KST).year)
    args = parser.parse_args()
    with requests.Session() as session:
        session.headers["User-Agent"] = "Mozilla/5.0 EoHeung KBO season archive"
        # End-of-year dates yield the final regular standings for past seasons;
        # current season uses today's table rather than a future date.
        now = datetime.now(KST)
        day = now.strftime("%m-%d") if args.year == now.year else "12-31"
        response = session.get(STANDINGS_URL, params={"searchDate": f"{args.year}-{day}"}, timeout=45)
        response.raise_for_status()
        standings = parse_standings_html(response.text, args.year)
        all_games = collect(args.year, session, postseason_only=False)
        standings, method = verified_standings(standings, all_games)
        games = [g for g in all_games if g['season_type'] == 'POSTSEASON']
    complete = all(r["g"] == 144 for r in standings)
    payload = {"year": args.year, "updated_at": now.isoformat(timespec="seconds"),
               "source": "KBO 공식", "standings_url": STANDINGS_URL, "schedule_url": SCHEDULE_URL,
               "regular_complete": complete, "standings_method": method, "standings": standings, "games": games}
    path = Path(f"data/kbo-seasons/{args.year}.json")
    # Preserve the last verified season on network/parse failure; write only
    # after the full twelve-month traversal and standings validation succeed.
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {path}: {len(standings)} teams, {len(games)} postseason games")


if __name__ == "__main__":
    main()
