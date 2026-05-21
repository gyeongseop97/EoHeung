"""
KBO official schedule scraper -> Supabase games table

Usage:
  TARGET_YEAR=2026 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python scripts/sync_kbo_schedule.py

This script follows the structure described in the referenced KBO schedule crawling posts:
- https://www.koreabaseball.com/Schedule/Schedule.aspx
- select #ddlYear, #ddlMonth, #ddlSeries
- parse #tblScheduleList rows
"""
import os
import re
import json
import time
import requests
from datetime import date
from playwright.sync_api import sync_playwright

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TARGET_YEAR = int(os.environ.get("TARGET_YEAR", date.today().year))
TARGET_TEAM = os.environ.get("TARGET_TEAM", "SAMSUNG")
KBO_URL = "https://www.koreabaseball.com/Schedule/Schedule.aspx"

TEAM_MAP = {
    "삼성": "SAMSUNG", "SAMSUNG": "SAMSUNG",
    "LG": "LG", "두산": "DOOSAN", "DOOSAN": "DOOSAN",
    "키움": "KIWOOM", "KIWOOM": "KIWOOM",
    "SSG": "SSG", "롯데": "LOTTE", "LOTTE": "LOTTE",
    "KIA": "KIA", "KT": "KT", "한화": "HANWHA", "HANWHA": "HANWHA",
    "NC": "NC"
}
TEAM_KO = {
    "SAMSUNG": "삼성", "LG": "LG", "DOOSAN": "두산", "KIWOOM": "키움", "SSG": "SSG",
    "LOTTE": "롯데", "KIA": "KIA", "KT": "KT", "HANWHA": "한화", "NC": "NC"
}
STADIUM_MAP = {
    "대구": "대구 삼성 라이온즈 파크", "포항": "포항 야구장", "잠실": "잠실", "사직": "사직",
    "문학": "문학", "수원": "수원", "광주": "광주", "대전": "대전", "창원": "창원", "고척": "고척스카이돔",
    "고척스카이돔": "고척스카이돔", "JAMSIL": "잠실", "DAEGU": "대구 삼성 라이온즈 파크", "POHANG": "포항 야구장",
    "SAJIK": "사직", "MUNHAK": "문학", "SUWON": "수원", "GWANGJU": "광주", "DAEJEON": "대전", "CHANGWON": "창원", "GOCHEOKSKY": "고척스카이돔"
}
TEAM_PATTERN = r"삼성|LG|두산|키움|SSG|롯데|KIA|KT|한화|NC|SAMSUNG|DOOSAN|KIWOOM|LOTTE|HANWHA"


def norm_team(raw: str) -> str:
    return TEAM_MAP.get(raw.strip(), raw.strip().upper())


def parse_play_text(text: str):
    clean = re.sub(r"\s+", " ", text.strip())
    # Examples: "한화 3 : 4 삼성", "HANWHA 3:4 SAMSUNG", "KT : SAMSUNG"
    m = re.search(rf"({TEAM_PATTERN})\s+(?:(\d*)\s*:\s*(\d*)|:)\s+({TEAM_PATTERN})", clean)
    if not m:
        return None
    away = norm_team(m.group(1))
    home = norm_team(m.group(4))
    away_score = int(m.group(2)) if m.group(2) and m.group(2).isdigit() else None
    home_score = int(m.group(3)) if m.group(3) and m.group(3).isdigit() else None
    return away, home, away_score, home_score


def safe_inner(locator):
    try:
        if locator.count() > 0:
            return locator.first.inner_text().strip()
    except Exception:
        return ""
    return ""


def scrape_month(page, year: int, month: int):
    page.goto(KBO_URL, wait_until="networkidle")
    page.locator("#ddlYear").select_option(str(year))
    page.locator("#ddlMonth").select_option(str(month).zfill(2))
    # 0,9,6 is the combined regular/pre/post season option used by KBO schedule page.
    try:
        page.locator("#ddlSeries").select_option("0,9,6")
    except Exception:
        pass
    page.wait_for_timeout(900)
    page.wait_for_selector("#tblScheduleList", timeout=10000)
    rows = page.locator("#tblScheduleList > tbody > tr").all()
    current_date = None
    per_key_count = {}
    games = []
    for row in rows:
        play_cell = row.locator("td.play")
        if play_cell.count() == 0:
            continue
        day_text = safe_inner(row.locator("td.day"))
        if day_text:
            dm = re.search(r"(\d{2})\.(\d{2})", day_text)
            if dm:
                current_date = f"{year}-{dm.group(1)}-{dm.group(2)}"
        if not current_date:
            continue
        play_text = safe_inner(play_cell)
        parsed = parse_play_text(play_text)
        if not parsed:
            continue
        away, home, away_score, home_score = parsed
        if TARGET_TEAM not in (away, home):
            continue
        time_text = safe_inner(row.locator("td.time"))
        if not time_text:
            tmatch = re.search(r"\b(\d{1,2}:\d{2})\b", row.inner_text())
            time_text = tmatch.group(1) if tmatch else None
        stadium = safe_inner(row.locator("td.stadium"))
        if not stadium:
            cells = [c.inner_text().strip() for c in row.locator("td").all()]
            for c in reversed(cells):
                if c in STADIUM_MAP or c.upper() in STADIUM_MAP:
                    stadium = c
                    break
        raw_row = row.inner_text()
        status = "SCHEDULED"
        if away_score is not None and home_score is not None:
            status = "FINISHED"
        if any(word in raw_row.upper() for word in ["취소", "우천", "POSTPONED", "CANCELLED"]):
            status = "POSTPONED"
        samsung_score = home_score if home == TARGET_TEAM else away_score
        opponent_score = away_score if home == TARGET_TEAM else home_score
        result = None
        if status == "FINISHED" and samsung_score is not None and opponent_score is not None:
            result = "W" if samsung_score > opponent_score else "L" if samsung_score < opponent_score else "D"
        opponent = away if home == TARGET_TEAM else home
        home_away = "HOME" if home == TARGET_TEAM else "AWAY"
        key_base = f"kbo-{current_date}-{away}-{home}"
        n = per_key_count.get(key_base, 0) + 1
        per_key_count[key_base] = n
        games.append({
            "source_key": f"{key_base}-{n}",
            "game_date": current_date,
            "game_time": f"{time_text}:00" if time_text and len(time_text) == 5 else None,
            "opponent": TEAM_KO.get(opponent, opponent),
            "home_away": home_away,
            "stadium": STADIUM_MAP.get(stadium, STADIUM_MAP.get(stadium.upper(), stadium)) if stadium else None,
            "status": status,
            "samsung_score": samsung_score,
            "opponent_score": opponent_score,
            "result": result,
            "source": "kbo-official"
        })
    return games


def upsert_games(games):
    if not games:
        return 0
    url = f"{SUPABASE_URL}/rest/v1/games?on_conflict=source_key"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    r = requests.post(url, headers=headers, data=json.dumps(games, ensure_ascii=False).encode("utf-8"), timeout=30)
    if not r.ok:
        raise RuntimeError(f"Supabase upsert failed: {r.status_code} {r.text}")
    return len(games)


def main():
    total = 0
    all_games = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(locale="ko-KR")
        for month in range(1, 13):
            print(f"Scraping {TARGET_YEAR}-{month:02d}...")
            try:
                games = scrape_month(page, TARGET_YEAR, month)
                print(f"  Samsung games: {len(games)}")
                all_games.extend(games)
                time.sleep(0.5)
            except Exception as e:
                print(f"  ERROR: {e}")
        browser.close()
    total = upsert_games(all_games)
    print(f"Done. Upserted {total} games.")

if __name__ == "__main__":
    main()
