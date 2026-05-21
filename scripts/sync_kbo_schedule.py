"""
KBO schedule/result sync -> Supabase

Writes two tables:
- public.kbo_all_games: all KBO games parsed from the official KBO English Daily Schedule page
- public.games: Samsung Lions games only, converted to the app's Samsung-focused schema

The script first tries to move through the English schedule month-by-month for TARGET_YEAR.
If the KBO page does not expose month navigation in the headless runner, it still syncs the
currently served month and prints a clear warning instead of silently doing nothing.
"""
import json
import os
import re
import time
from datetime import date

import requests
from playwright.sync_api import sync_playwright

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TARGET_YEAR = int(os.environ.get("TARGET_YEAR", date.today().year))
TARGET_TEAM = os.environ.get("TARGET_TEAM", "SAMSUNG").upper()
KBO_EN_URL = "https://eng.koreabaseball.com/Schedule/DailySchedule.aspx"

TEAM_MAP = {
    "삼성": "SAMSUNG", "SAMSUNG": "SAMSUNG",
    "LG": "LG", "엘지": "LG",
    "두산": "DOOSAN", "DOOSAN": "DOOSAN",
    "키움": "KIWOOM", "KIWOOM": "KIWOOM", "HEROES": "KIWOOM",
    "SSG": "SSG",
    "롯데": "LOTTE", "LOTTE": "LOTTE",
    "KIA": "KIA",
    "KT": "KT",
    "한화": "HANWHA", "HANWHA": "HANWHA",
    "NC": "NC",
}
TEAM_KO = {
    "SAMSUNG": "삼성", "LG": "LG", "DOOSAN": "두산", "KIWOOM": "키움", "SSG": "SSG",
    "LOTTE": "롯데", "KIA": "KIA", "KT": "KT", "HANWHA": "한화", "NC": "NC",
}
STADIUM_MAP = {
    "DAEGU": "대구 삼성 라이온즈 파크", "대구": "대구 삼성 라이온즈 파크",
    "POHANG": "포항 야구장", "포항": "포항 야구장",
    "JAMSIL": "잠실", "잠실": "잠실",
    "SAJIK": "사직", "사직": "사직",
    "MUNHAK": "문학", "문학": "문학",
    "SUWON": "수원", "수원": "수원",
    "GWANGJU": "광주", "광주": "광주",
    "DAEJEON": "대전", "대전": "대전",
    "CHANGWON": "창원", "창원": "창원",
    "GOCHEOKSKY": "고척스카이돔", "고척": "고척스카이돔", "고척스카이돔": "고척스카이돔",
}
TEAM_PATTERN = r"삼성|LG|엘지|두산|키움|SSG|롯데|KIA|KT|한화|NC|SAMSUNG|DOOSAN|KIWOOM|HEROES|LOTTE|HANWHA"
STADIUM_PATTERN = "|".join(sorted([re.escape(k) for k in STADIUM_MAP.keys()], key=len, reverse=True))


def norm_team(raw: str) -> str:
    value = (raw or "").strip()
    return TEAM_MAP.get(value.upper(), TEAM_MAP.get(value, value.upper()))


def ko_team(team: str) -> str:
    return TEAM_KO.get(team, team)


def parse_match(rest: str):
    pattern = rf"\b({TEAM_PATTERN})\b\s+(?:(\d*)\s*:\s*(\d*)|:)\s+\b({TEAM_PATTERN})\b"
    m = re.search(pattern, rest, flags=re.I)
    if not m:
        return None
    away = norm_team(m.group(1))
    home = norm_team(m.group(4))
    away_score = int(m.group(2)) if m.group(2) and m.group(2).isdigit() else None
    home_score = int(m.group(3)) if m.group(3) and m.group(3).isdigit() else None
    return away, home, away_score, home_score, m.end()


def find_stadium(text: str):
    if not text:
        return None
    m = re.search(rf"\b({STADIUM_PATTERN})\b", text, flags=re.I)
    if not m:
        return None
    key = m.group(1).upper()
    return STADIUM_MAP.get(key, STADIUM_MAP.get(m.group(1), m.group(1)))


def all_game_payload(source_key, game_date, game_time, away, home, away_score, home_score, stadium, raw_status=""):
    status_text = (raw_status or "").upper()
    status = "SCHEDULED"
    if away_score is not None and home_score is not None:
        status = "FINISHED"
    if any(word in status_text for word in ["POSTPONED", "CANCELLED", "RAIN", "취소", "우천"]):
        status = "POSTPONED"
    return {
        "source_key": source_key,
        "game_date": game_date,
        "game_time": f"{game_time}:00" if game_time and re.match(r"^\d{1,2}:\d{2}$", game_time) else None,
        "away_team": ko_team(away),
        "home_team": ko_team(home),
        "stadium": stadium,
        "status": status,
        "away_score": away_score,
        "home_score": home_score,
        "source": "kbo-english-official",
    }


def samsung_game_payload(all_game):
    away = norm_team(all_game["away_team"])
    home = norm_team(all_game["home_team"])
    if TARGET_TEAM not in (away, home):
        return None
    away_score = all_game.get("away_score")
    home_score = all_game.get("home_score")
    samsung_score = home_score if home == TARGET_TEAM else away_score
    opponent_score = away_score if home == TARGET_TEAM else home_score
    result = None
    if all_game["status"] == "FINISHED" and samsung_score is not None and opponent_score is not None:
        result = "W" if samsung_score > opponent_score else "L" if samsung_score < opponent_score else "D"
    opponent = away if home == TARGET_TEAM else home
    return {
        "source_key": all_game["source_key"].replace("kbo-all-", "kbo-"),
        "game_date": all_game["game_date"],
        "game_time": all_game["game_time"],
        "opponent": ko_team(opponent),
        "home_away": "HOME" if home == TARGET_TEAM else "AWAY",
        "stadium": all_game.get("stadium"),
        "status": all_game["status"],
        "samsung_score": samsung_score,
        "opponent_score": opponent_score,
        "result": result,
        "source": "kbo-english-official",
    }


def parse_english_schedule_text(body_text: str):
    lines = [re.sub(r"\s+", " ", line).strip() for line in (body_text or "").splitlines()]
    lines = [line for line in lines if line]
    month_header = None
    for line in lines:
        mh = re.search(r"\b(20\d{2})\.(\d{2})\b", line)
        if mh:
            month_header = (int(mh.group(1)), int(mh.group(2)))
            break
    if not month_header:
        raise RuntimeError("KBO English page month header was not found.")

    page_year, page_month = month_header
    current_date = None
    key_count = {}
    all_games = []

    for i, raw_line in enumerate(lines):
        line = raw_line
        dm = re.match(r"^(\d{2})\.(\d{2})\([A-Z]{3}\)\s+(.*)$", line, flags=re.I)
        if dm:
            current_date = f"{page_year}-{dm.group(1)}-{dm.group(2)}"
            line = dm.group(3).strip()
        if not current_date:
            continue
        line = re.sub(r"^(REGULAR|PRESEASON|POSTSEASON|EXHIBITION)\s+", "", line, flags=re.I)
        tm = re.match(r"^(\d{1,2}:\d{2})\s+(.*)$", line)
        if not tm:
            continue
        game_time = tm.group(1)
        rest = tm.group(2)
        parsed = parse_match(rest)
        if not parsed:
            continue
        away, home, away_score, home_score, match_end = parsed
        stadium = find_stadium(rest[match_end:])
        raw_status = rest
        if not stadium:
            for look_ahead in lines[i + 1:i + 5]:
                stadium = find_stadium(look_ahead)
                if stadium:
                    raw_status += " " + look_ahead
                    break
        for look_ahead in lines[i + 1:i + 3]:
            if any(word in look_ahead.upper() for word in ["POSTPONED", "CANCELLED", "RAIN"]):
                raw_status += " " + look_ahead
        base = f"kbo-all-{current_date}-{away}-{home}"
        key_count[base] = key_count.get(base, 0) + 1
        all_games.append(all_game_payload(
            f"{base}-{key_count[base]}", current_date, game_time, away, home,
            away_score, home_score, stadium, raw_status
        ))
    return all_games, page_year, page_month


def page_body_text(page):
    page.wait_for_load_state("networkidle", timeout=45000)
    return page.locator("body").inner_text(timeout=15000)


def click_month_nav(page, direction: str) -> bool:
    patterns = {
        "prev": ["prev", "previous", "before", "pre", "left", "이전", "btnpre", "btn_prev", "prevmonth", "monthprev"],
        "next": ["next", "after", "right", "다음", "btnnext", "btn_next", "nextmonth", "monthnext"],
    }[direction]
    candidates = page.evaluate(
        """
        () => Array.from(document.querySelectorAll('a,button,input,img')).map((el, i) => ({
          i,
          text: (el.innerText || el.value || '').trim(),
          id: el.id || '',
          cls: el.className || '',
          title: el.title || '',
          alt: el.alt || '',
          href: el.href || '',
          src: el.src || '',
          onclick: (el.getAttribute('onclick') || '')
        }))
        """
    )
    for c in candidates:
        hay = " ".join(str(c.get(k, "")) for k in ["text", "id", "cls", "title", "alt", "href", "src", "onclick"]).lower()
        if any(p.lower() in hay for p in patterns):
            before = page_body_text(page)
            try:
                page.evaluate("idx => document.querySelectorAll('a,button,input,img')[idx].click()", c["i"])
                page.wait_for_timeout(1200)
                after = page_body_text(page)
                if after != before:
                    return True
            except Exception:
                continue
    print(f"No {direction} month navigation control found on KBO English page.")
    return False


def scrape_english_year():
    all_games = []
    seen_months = set()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(locale="en-US")
        page.goto(KBO_EN_URL, wait_until="networkidle", timeout=45000)

        # Try to move back to January of TARGET_YEAR if the page exposes previous-month navigation.
        for _ in range(18):
            games, y, m = parse_english_schedule_text(page_body_text(page))
            if y < TARGET_YEAR or (y == TARGET_YEAR and m <= 1):
                break
            if not click_month_nav(page, "prev"):
                break
            time.sleep(0.2)

        # Parse forward through the year. If navigation is unavailable, this loop will sync the current page only.
        for _ in range(18):
            games, y, m = parse_english_schedule_text(page_body_text(page))
            ym = (y, m)
            if ym not in seen_months:
                seen_months.add(ym)
                if y == TARGET_YEAR:
                    print(f"Parsed KBO English month {y}-{m:02d}: {len(games)} all games")
                    all_games.extend(games)
                else:
                    print(f"Skipped KBO English month {y}-{m:02d}: outside TARGET_YEAR")
            if y > TARGET_YEAR or (y == TARGET_YEAR and m >= 12):
                break
            if not click_month_nav(page, "next"):
                break
            time.sleep(0.2)
        browser.close()
    return dedupe(all_games)


def supabase_headers():
    headers = {
        "apikey": SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    # legacy service_role JWT requires Authorization. Current project uses legacy service_role key.
    if not SERVICE_KEY.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {SERVICE_KEY}"
    else:
        headers["Authorization"] = f"Bearer {SERVICE_KEY}"
    return headers


def postgrest_upsert(table: str, rows, conflict_col="source_key"):
    if not rows:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/{table}?on_conflict={conflict_col}"
    r = requests.post(url, headers=supabase_headers(), data=json.dumps(rows, ensure_ascii=False).encode("utf-8"), timeout=60)
    if not r.ok:
        raise RuntimeError(f"Supabase upsert failed for {table}: {r.status_code} {r.text}")
    return len(rows)


def dedupe(rows):
    out = {}
    for row in rows:
        out[row["source_key"]] = row
    return list(out.values())


def main():
    print(f"Scraping official KBO English Daily Schedule for TARGET_YEAR={TARGET_YEAR}...")
    all_games = scrape_english_year()
    print(f"Collected all KBO games: {len(all_games)}")
    if not all_games:
        raise RuntimeError("No KBO games were collected from the KBO English Daily Schedule page.")

    samsung_games = dedupe([g for g in (samsung_game_payload(x) for x in all_games) if g])
    print(f"Collected Samsung games: {len(samsung_games)}")
    for sample in samsung_games[:5]:
        print("Samsung sample:", sample)

    all_count = postgrest_upsert("kbo_all_games", all_games)
    samsung_count = postgrest_upsert("games", samsung_games)
    print(f"Done. Upserted {all_count} rows into kbo_all_games and {samsung_count} rows into games.")
    if len({g['game_date'][:7] for g in all_games}) < 2:
        print("WARNING: Only one month was synced. KBO English page did not expose navigable month controls in this run.")


if __name__ == "__main__":
    main()
