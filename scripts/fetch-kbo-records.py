import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE = "https://www.koreabaseball.com"
URLS = {
    # Counting-stat sorts deliberately expose the full player pool instead of only rate-stat qualifiers.
    "hitter1": f"{BASE}/Record/Player/HitterBasic/Basic1.aspx?sort=TB_CN",
    "hitter2": f"{BASE}/Record/Player/HitterBasic/Basic2.aspx?sort=BB_CN",
    "pitcher": f"{BASE}/Record/Player/PitcherBasic/Basic1.aspx?sort=SV_CN",
    "team_hitting": f"{BASE}/Record/Team/Hitter/BasicOld.aspx",
    "team_pitching": f"{BASE}/Record/Team/Pitcher/BasicOld.aspx",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
    "Referer": f"{BASE}/Record/Player/HitterBasic/Basic1.aspx",
}
KST = timezone(timedelta(hours=9))
MAX_PLAYER_PAGES = 30


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def number(value):
    s = clean(value).replace(",", "")
    if s in {"", "-"}:
        return None
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return s


def fetch_html(url):
    response = requests.get(url, headers=HEADERS, timeout=25)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or "utf-8"
    return response.text


def parse_table_html(html, required_headers):
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        header_cells = table.select("thead th")
        if not header_cells:
            first = table.find("tr")
            header_cells = first.find_all("th") if first else []
        headers = [clean(cell.get_text(" ", strip=True)) for cell in header_cells]
        if not headers or not all(required in headers for required in required_headers):
            continue
        rows = []
        body_rows = table.select("tbody tr") or table.find_all("tr")[1:]
        for tr in body_rows:
            cells = tr.find_all(["td", "th"])
            if len(cells) < len(headers):
                continue
            values = [clean(cell.get_text(" ", strip=True)) for cell in cells[: len(headers)]]
            row = dict(zip(headers, values))
            if not any(values) or row.get("순위") == "합계" or row.get("팀명") == "합계":
                continue
            rows.append(row)
        if rows:
            return rows
    return []


def parse_table(url, required_headers):
    rows = parse_table_html(fetch_html(url), required_headers)
    if not rows:
        raise RuntimeError(f"KBO record table not found: {url}")
    return rows


def row_identity(row):
    return (clean(row.get("선수명")), clean(row.get("팀명")))


def wait_after_pager(page):
    try:
        page.wait_for_load_state("networkidle", timeout=7000)
    except PlaywrightTimeoutError:
        page.wait_for_timeout(1000)


def click_exact_page_link(page, page_number):
    # KBO uses ASP.NET postback pagination. Numeric pager links keep the selected filters/sort.
    candidates = page.locator('a[href*="__doPostBack"]')
    for idx in range(candidates.count()):
        a = candidates.nth(idx)
        try:
            if clean(a.inner_text()) == str(page_number) and a.is_visible():
                a.click(timeout=5000)
                wait_after_pager(page)
                return True
        except Exception:
            continue
    return False


def click_next_pager_group(page):
    # When the next numeric page is outside the current 1~5 block, KBO exposes an image button named '다음'.
    selectors = [
        'a[href*="__doPostBack"]:has(img[alt="다음"])',
        'a[href*="__doPostBack"]:has(img[alt*="다음"])',
        'a[href*="__doPostBack"]:has(img[src*="paging_next"])',
    ]
    for selector in selectors:
        links = page.locator(selector)
        for idx in range(links.count()):
            link = links.nth(idx)
            try:
                if link.is_visible():
                    link.click(timeout=5000)
                    wait_after_pager(page)
                    return True
            except Exception:
                continue
    return False


def fetch_all_player_pages(browser, url, required_headers, label):
    page = browser.new_page(
        user_agent=HEADERS["User-Agent"],
        locale="ko-KR",
        extra_http_headers={"Accept-Language": HEADERS["Accept-Language"]},
    )
    print(f"[{label}] open {url}")
    page.goto(url, wait_until="domcontentloaded", timeout=45000)
    wait_after_pager(page)

    collected = {}
    seen_page_signatures = set()
    page_number = 1

    try:
        while page_number <= MAX_PLAYER_PAGES:
            rows = parse_table_html(page.content(), required_headers)
            if not rows:
                raise RuntimeError(f"[{label}] record table missing at page {page_number}")

            signature = tuple(row_identity(r) for r in rows)
            if signature in seen_page_signatures:
                print(f"[{label}] repeated page detected at {page_number}; stop")
                break
            seen_page_signatures.add(signature)

            before = len(collected)
            for row in rows:
                key = row_identity(row)
                if key[0] and key[1]:
                    collected[key] = row
            print(f"[{label}] page={page_number} rows={len(rows)} unique={len(collected)} (+{len(collected)-before})")

            target_page = page_number + 1
            if click_exact_page_link(page, target_page):
                page_number = target_page
                continue

            # At page 5/10/15... the next number can be hidden behind the next pager group.
            if click_next_pager_group(page):
                page_number = target_page
                continue

            break
    finally:
        page.close()

    if not collected:
        raise RuntimeError(f"[{label}] no player rows collected")
    print(f"[{label}] completed: {len(collected)} players across {len(seen_page_signatures)} pages")
    return list(collected.values())


def i(row, key):
    value = number(row.get(key))
    return value if isinstance(value, (int, float)) else None


def map_hitters(basic1, basic2):
    extra = {(r.get("선수명"), r.get("팀명")): r for r in basic2}
    out = []
    for r in basic1:
        e = extra.get((r.get("선수명"), r.get("팀명")), {})
        out.append({
            "rank": i(r, "순위"), "name": r.get("선수명", ""), "team": r.get("팀명", ""),
            "AVG": i(r, "AVG"), "G": i(r, "G"), "PA": i(r, "PA"), "AB": i(r, "AB"),
            "R": i(r, "R"), "H": i(r, "H"), "2B": i(r, "2B"), "3B": i(r, "3B"),
            "HR": i(r, "HR"), "TB": i(r, "TB"), "RBI": i(r, "RBI"), "SAC": i(r, "SAC"), "SF": i(r, "SF"),
            "BB": i(e, "BB"), "HBP": i(e, "HBP"), "SO": i(e, "SO"), "GDP": i(e, "GDP"),
            "SLG": i(e, "SLG"), "OBP": i(e, "OBP"), "OPS": i(e, "OPS"), "RISP": i(e, "RISP"),
        })
    return out


def map_pitchers(rows):
    out = []
    for r in rows:
        out.append({
            "rank": i(r, "순위"), "name": r.get("선수명", ""), "team": r.get("팀명", ""),
            "ERA": i(r, "ERA"), "G": i(r, "G"), "W": i(r, "W"), "L": i(r, "L"),
            "SV": i(r, "SV"), "HLD": i(r, "HLD"), "WPCT": i(r, "WPCT"), "IP": r.get("IP", ""),
            "H": i(r, "H"), "HR": i(r, "HR"), "BB": i(r, "BB"), "HBP": i(r, "HBP"),
            "SO": i(r, "SO"), "R": i(r, "R"), "ER": i(r, "ER"), "WHIP": i(r, "WHIP"),
        })
    return out


def map_team_hitting(rows):
    fields = ["AVG", "G", "AB", "R", "H", "2B", "3B", "HR", "TB", "RBI", "SB", "CS", "BB", "HBP", "SO", "GDP", "E"]
    return [{"rank": i(r, "순위"), "team": r.get("팀명", ""), **{f: i(r, f) for f in fields}} for r in rows]


def map_team_pitching(rows):
    fields = ["ERA", "G", "CG", "SHO", "W", "L", "SV", "HLD", "WPCT", "TBF", "H", "HR", "BB", "HBP", "SO", "R", "ER"]
    return [{"rank": i(r, "순위"), "team": r.get("팀명", ""), "IP": r.get("IP", ""), **{f: i(r, f) for f in fields}} for r in rows]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            hitter1 = fetch_all_player_pages(browser, URLS["hitter1"], ["순위", "선수명", "팀명", "AVG", "HR", "RBI"], "hitter-basic1")
            hitter2 = fetch_all_player_pages(browser, URLS["hitter2"], ["순위", "선수명", "팀명", "OBP", "SLG", "OPS"], "hitter-basic2")
            pitcher = fetch_all_player_pages(browser, URLS["pitcher"], ["순위", "선수명", "팀명", "ERA", "SV", "HLD", "WHIP"], "pitcher-basic1")
        finally:
            browser.close()

    team_hitting = parse_table(URLS["team_hitting"], ["순위", "팀명", "AVG", "HR", "RBI"])
    team_pitching = parse_table(URLS["team_pitching"], ["순위", "팀명", "ERA", "W", "L"])

    hitters = map_hitters(hitter1, hitter2)
    pitchers = map_pitchers(pitcher)
    now = datetime.now(KST)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "season": now.year,
        "source": "KBO 공식 기록실",
        "scopeNote": "KBO 1군 정규시즌 기록이 있는 타자·투수 전체 페이지를 순회해 수집합니다.",
        "playerCoverage": {
            "hitters": len(hitters),
            "pitchers": len(pitchers),
            "hitterBasicPages": None,
            "pitcherBasicPages": None,
        },
        "sourceUrls": URLS,
        "hitters": hitters,
        "pitchers": pitchers,
        "teamHitting": map_team_hitting(team_hitting),
        "teamPitching": map_team_pitching(team_pitching),
    }
    target = Path("data/kbo-records.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KBO records updated: hitters={len(hitters)}, pitchers={len(pitchers)}, teams={len(payload['teamHitting'])}/{len(payload['teamPitching'])}")


if __name__ == "__main__":
    main()
