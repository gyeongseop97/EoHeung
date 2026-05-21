"""
KBO schedule/result sync -> Supabase games table

The KBO Korean schedule page often renders the actual game rows dynamically and can return
an empty table in headless runners. This script therefore uses the official KBO English
Daily Schedule page as a reliable fallback and parses the rendered body text with Playwright.

If zero Samsung games are collected, the script fails clearly instead of showing a false success.
"""
import json
import os
import re
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


def parse_match(rest: str):
    """Return away, home, scores and text position for 'TEAM 1:2 TEAM' or 'TEAM : TEAM'."""
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


def make_game(source_key, game_date, game_time, away, home, away_score, home_score, stadium, raw_status=""):
    if TARGET_TEAM not in (away, home):
        return None

    status_text = (raw_status or "").upper()
    status = "SCHEDULED"
    if away_score is not None and home_score is not None:
        status = "FINISHED"
    if any(word in status_text for word in ["POSTPONED", "CANCELLED", "RAIN", "취소", "우천"]):
        status = "POSTPONED"

    samsung_score = home_score if home == TARGET_TEAM else away_score
    opponent_score = away_score if home == TARGET_TEAM else home_score
    result = None
    if status == "FINISHED" and samsung_score is not None and opponent_score is not None:
        result = "W" if samsung_score > opponent_score else "L" if samsung_score < opponent_score else "D"

    opponent = away if home == TARGET_TEAM else home
    return {
        "source_key": source_key,
        "game_date": game_date,
        "game_time": f"{game_time}:00" if game_time and re.match(r"^\d{1,2}:\d{2}$", game_time) else None,
        "opponent": TEAM_KO.get(opponent, opponent),
        "home_away": "HOME" if home == TARGET_TEAM else "AWAY",
        "stadium": stadium,
        "status": status,
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

    page_year, _page_month = month_header
    current_date = None
    key_count = {}
    games = []

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

        # In the KBO English page, stadium / postponed text is often printed on the next line.
        if not stadium:
            for look_ahead in lines[i + 1:i + 5]:
                stadium = find_stadium(look_ahead)
                if stadium:
                    raw_status += " " + look_ahead
                    break
        for look_ahead in lines[i + 1:i + 3]:
            if any(word in look_ahead.upper() for word in ["POSTPONED", "CANCELLED", "RAIN"]):
                raw_status += " " + look_ahead

        base = f"kbo-{current_date}-{away}-{home}"
        key_count[base] = key_count.get(base, 0) + 1
        game = make_game(
            f"{base}-{key_count[base]}",
            current_date,
            game_time,
            away,
            home,
            away_score,
            home_score,
            stadium,
            raw_status,
        )
        if game:
            games.append(game)

    return games, page_year


def scrape_english_current_month_with_playwright():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(locale="en-US")
        page.goto(KBO_EN_URL, wait_until="networkidle", timeout=45000)
        body_text = page.locator("body").inner_text(timeout=15000)
        browser.close()
    games, page_year = parse_english_schedule_text(body_text)
    if page_year != TARGET_YEAR:
        print(f"Warning: KBO English page year is {page_year}, TARGET_YEAR is {TARGET_YEAR}.")
    return games


def upsert_games(games):
    url = f"{SUPABASE_URL}/rest/v1/games?on_conflict=source_key"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    r = requests.post(url, headers=headers, data=json.dumps(games, ensure_ascii=False).encode("utf-8"), timeout=30)
    if not r.ok:
        raise RuntimeError(f"Supabase upsert failed: {r.status_code} {r.text}")
    return len(games)


def dedupe_games(games):
    out = {}
    for game in games:
        out[game["source_key"]] = game
    return list(out.values())


def main():
    print("Scraping official KBO English Daily Schedule page with Playwright...")
    games = scrape_english_current_month_with_playwright()
    games = dedupe_games(games)
    print(f"Collected Samsung games: {len(games)}")

    if not games:
        raise RuntimeError("No Samsung games were collected from the KBO English Daily Schedule page.")

    for sample in games[:5]:
        print("Sample:", sample)

    total = upsert_games(games)
    print(f"Done. Upserted {total} games into Supabase games table.")


if __name__ == "__main__":
    main()
