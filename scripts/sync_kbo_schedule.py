"""
KBO schedule/result sync -> Supabase games table

- Primary: KBO Korean schedule page with Playwright
- Fallback: KBO English Daily Schedule page text parsing, which is more static
- Important: if zero Samsung games are collected, this script now fails instead of showing a false success.
"""
import os
import re
import json
import time
import requests
from datetime import date
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
TARGET_YEAR = int(os.environ.get("TARGET_YEAR", date.today().year))
TARGET_TEAM = os.environ.get("TARGET_TEAM", "SAMSUNG").upper()
KBO_KO_URL = "https://www.koreabaseball.com/Schedule/Schedule.aspx"
KBO_EN_URL = "https://eng.koreabaseball.com/Schedule/DailySchedule.aspx"

TEAM_MAP = {
    "삼성": "SAMSUNG", "SAMSUNG": "SAMSUNG",
    "LG": "LG", "엘지": "LG",
    "두산": "DOOSAN", "DOOSAN": "DOOSAN",
    "키움": "KIWOOM", "KIWOOM": "KIWOOM", "HEROES": "KIWOOM",
    "SSG": "SSG", "롯데": "LOTTE", "LOTTE": "LOTTE",
    "KIA": "KIA", "KT": "KT", "한화": "HANWHA", "HANWHA": "HANWHA",
    "NC": "NC"
}
TEAM_KO = {
    "SAMSUNG": "삼성", "LG": "LG", "DOOSAN": "두산", "KIWOOM": "키움", "SSG": "SSG",
    "LOTTE": "롯데", "KIA": "KIA", "KT": "KT", "HANWHA": "한화", "NC": "NC"
}
STADIUM_MAP = {
    "대구": "대구 삼성 라이온즈 파크", "DAEGU": "대구 삼성 라이온즈 파크",
    "포항": "포항 야구장", "POHANG": "포항 야구장",
    "잠실": "잠실", "JAMSIL": "잠실",
    "사직": "사직", "SAJIK": "사직",
    "문학": "문학", "MUNHAK": "문학",
    "수원": "수원", "SUWON": "수원",
    "광주": "광주", "GWANGJU": "광주",
    "대전": "대전", "DAEJEON": "대전",
    "창원": "창원", "CHANGWON": "창원",
    "고척": "고척스카이돔", "고척스카이돔": "고척스카이돔", "GOCHEOKSKY": "고척스카이돔"
}
TEAM_PATTERN = r"삼성|LG|엘지|두산|키움|SSG|롯데|KIA|KT|한화|NC|SAMSUNG|DOOSAN|KIWOOM|HEROES|LOTTE|HANWHA"


def norm_team(raw: str) -> str:
    return TEAM_MAP.get((raw or "").strip().upper(), TEAM_MAP.get((raw or "").strip(), (raw or "").strip().upper()))


def parse_game_text(text: str):
    clean = re.sub(r"\s+", " ", (text or "").strip())
    m = re.search(rf"({TEAM_PATTERN})\s+(?:(\d*)\s*:\s*(\d*)|:)\s+({TEAM_PATTERN})", clean, re.I)
    if not m:
        return None
    away = norm_team(m.group(1))
    home = norm_team(m.group(4))
    away_score = int(m.group(2)) if m.group(2) and m.group(2).isdigit() else None
    home_score = int(m.group(3)) if m.group(3) and m.group(3).isdigit() else None
    return away, home, away_score, home_score


def make_game(source_key, game_date, game_time, away, home, away_score, home_score, stadium, raw_status=""):
    if TARGET_TEAM not in (away, home):
        return None
    status_text = (raw_status or "").upper()
    status = "SCHEDULED"
    if away_score is not None and home_score is not None:
        status = "FINISHED"
    if any(w in status_text for w in ["취소", "우천", "POSTPONED", "CANCELLED"]):
        status = "POSTPONED"
    samsung_score = home_score if home == TARGET_TEAM else away_score
    opponent_score = away_score if home == TARGET_TEAM else home_score
    result = None
    if status == "FINISHED" and samsung_score is not None and opponent_score is not None:
        result = "W" if samsung_score > opponent_score else "L" if samsung_score < opponent_score else "D"
    opponent = away if home == TARGET_TEAM else home
    home_away = "HOME" if home == TARGET_TEAM else "AWAY"
    return {
        "source_key": source_key,
        "game_date": game_date,
        "game_time": f"{game_time}:00" if game_time and re.match(r"^\d{1,2}:\d{2}$", game_time) else None,
        "opponent": TEAM_KO.get(opponent, opponent),
        "home_away": home_away,
        "stadium": STADIUM_MAP.get((stadium or "").strip().upper(), STADIUM_MAP.get((stadium or "").strip(), stadium or None)),
        "status": status,
        "samsung_score": samsung_score,
        "opponent_score": opponent_score,
        "result": result,
        "source": "kbo-official"
    }


def click_search_if_present(page):
    selectors = [
        "#btnSearch", "input[type=submit]", "button:has-text('조회')", "button:has-text('검색')",
        "a:has-text('조회')", "a:has-text('검색')", "img[alt*='검색']", "img[alt*='조회']"
    ]
    for sel in selectors:
        try:
            loc = page.locator(sel)
            if loc.count() > 0:
                loc.first.click(timeout=2000)
                page.wait_for_load_state("networkidle", timeout=10000)
                page.wait_for_timeout(1000)
                return True
        except Exception:
            continue
    return False


def select_if_exists(page, selector, value):
    try:
        loc = page.locator(selector)
        if loc.count() > 0:
            try:
                loc.first.select_option(value)
            except Exception:
                # Some pages use non-zero-padded month values.
                if value.startswith("0"):
                    loc.first.select_option(value.lstrip("0"))
                else:
                    raise
            return True
    except Exception:
        pass
    return False


def scrape_korean_month(page, year: int, month: int):
    games = []
    page.goto(KBO_KO_URL, wait_until="networkidle", timeout=30000)
    select_if_exists(page, "#ddlYear", str(year))
    select_if_exists(page, "#ddlMonth", str(month).zfill(2))
    # KBO series selector may contain combined values. Try broad/all first.
    for v in ["0,9,6", "0", "9", "6"]:
        if select_if_exists(page, "#ddlSeries", v):
            break
    click_search_if_present(page)
    try:
        page.wait_for_selector("#tblScheduleList", timeout=10000)
    except PlaywrightTimeoutError:
        print(f"  Korean page: schedule table not found for {year}-{month:02d}")
        return games

    rows = page.locator("#tblScheduleList tbody tr").all()
    current_date = None
    key_count = {}
    for row in rows:
        cells = [c.inner_text().strip() for c in row.locator("td").all()]
        if not cells:
            continue
        row_text = re.sub(r"\s+", " ", row.inner_text().strip())
        dm = re.search(r"(\d{2})\.(\d{2})", row_text)
        if dm:
            current_date = f"{year}-{dm.group(1)}-{dm.group(2)}"
        if not current_date:
            continue
        parsed = parse_game_text(row_text)
        if not parsed:
            continue
        away, home, away_score, home_score = parsed
        time_match = re.search(r"\b(\d{1,2}:\d{2})\b", row_text)
        game_time = time_match.group(1) if time_match else None
        stadium = next((c for c in cells if c in STADIUM_MAP or c.upper() in STADIUM_MAP), None)
        base = f"kbo-{current_date}-{away}-{home}"
        key_count[base] = key_count.get(base, 0) + 1
        g = make_game(f"{base}-{key_count[base]}", current_date, game_time, away, home, away_score, home_score, stadium, row_text)
        if g:
            games.append(g)
    return games


def parse_english_text(text: str, target_year: int, target_month: int | None = None):
    # The English page exposes schedule text like: 05.01(FRI) REGULAR 17:00 HANWHA 3:4 SAMSUNG ... DAEGU -
    soup = BeautifulSoup(text, "html.parser")
    flat_lines = [re.sub(r"\s+", " ", line).strip() for line in soup.get_text("\n").splitlines()]
    lines = [line for line in flat_lines if line]
    month_header = None
    for line in lines:
        mh = re.search(r"(20\d{2})\.(\d{2})", line)
        if mh:
            month_header = (int(mh.group(1)), int(mh.group(2)))
            break
    if month_header:
        page_year, page_month = month_header
    else:
        page_year, page_month = target_year, target_month or date.today().month
    if target_month and (page_year != target_year or page_month != target_month):
        return []

    games = []
    current_date = None
    key_count = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        dm = re.match(r"^(\d{2})\.(\d{2})\([A-Z]{3}\)\s+(.*)$", line)
        if dm:
            current_date = f"{page_year}-{dm.group(1)}-{dm.group(2)}"
            line = dm.group(3).strip()
        if current_date:
            # remove type prefix if present
            line2 = re.sub(r"^(REGULAR|PRESEASON|POSTSEASON|EXHIBITION)\s+", "", line, flags=re.I)
            tm = re.match(r"^(\d{1,2}:\d{2})\s+(.*)$", line2)
            if tm:
                game_time = tm.group(1)
                rest = tm.group(2)
                parsed = parse_game_text(rest)
                if parsed:
                    away, home, away_score, home_score = parsed
                    stadium = None
                    raw_status = rest
                    # Usually stadium and ETC are on following lines. Look ahead a few lines.
                    for j in range(i + 1, min(i + 5, len(lines))):
                        cand = lines[j].strip()
                        up = cand.upper()
                        if up in STADIUM_MAP:
                            stadium = up
                        if any(w in up for w in ["POSTPONED", "CANCELLED", "취소", "우천"]):
                            raw_status += " " + cand
                    base = f"kbo-{current_date}-{away}-{home}"
                    key_count[base] = key_count.get(base, 0) + 1
                    g = make_game(f"{base}-{key_count[base]}", current_date, game_time, away, home, away_score, home_score, stadium, raw_status)
                    if g:
                        games.append(g)
        i += 1
    return games


def scrape_english_current_month():
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome Safari"}
    r = requests.get(KBO_EN_URL, headers=headers, timeout=30)
    r.raise_for_status()
    return parse_english_text(r.text, TARGET_YEAR, None)


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


def dedupe_games(games):
    out = {}
    for g in games:
        out[g["source_key"]] = g
    return list(out.values())


def main():
    all_games = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        page = browser.new_page(locale="ko-KR")
        for month in range(1, 13):
            print(f"Scraping Korean KBO page {TARGET_YEAR}-{month:02d}...")
            try:
                games = scrape_korean_month(page, TARGET_YEAR, month)
                print(f"  Korean page Samsung games: {len(games)}")
                all_games.extend(games)
                time.sleep(0.3)
            except Exception as e:
                print(f"  Korean page ERROR: {type(e).__name__}: {e}")
        browser.close()

    if not all_games:
        print("Korean page returned 0 games. Trying English Daily Schedule fallback for the currently served month...")
        try:
            eng_games = scrape_english_current_month()
            print(f"  English fallback Samsung games: {len(eng_games)}")
            all_games.extend(eng_games)
        except Exception as e:
            print(f"  English fallback ERROR: {type(e).__name__}: {e}")

    all_games = dedupe_games(all_games)
    print(f"Collected total Samsung games before upsert: {len(all_games)}")
    if len(all_games) == 0:
        raise RuntimeError("No Samsung games were collected. Check KBO page selectors/network access; refusing false-success run.")

    total = upsert_games(all_games)
    print(f"Done. Upserted {total} games into Supabase games table.")

if __name__ == "__main__":
    main()
