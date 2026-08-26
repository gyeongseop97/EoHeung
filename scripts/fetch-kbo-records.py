import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://www.koreabaseball.com"
URLS = {
    # Counting-stat sorts expose the full player pool rather than only rate-stat qualifiers.
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
MAX_PLAYER_PAGES = 40
POSTBACK_RE = re.compile(r"__doPostBack\(['\"]([^'\"]+)['\"],['\"]([^'\"]*)['\"]\)")


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


def new_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def get_response(session, url):
    response = session.get(url, timeout=30)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or "utf-8"
    return response


def fetch_html(url):
    return get_response(new_session(), url).text


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


def form_payload(soup, event_target, event_argument):
    form = soup.find("form")
    if not form:
        raise RuntimeError("KBO ASP.NET form not found")
    payload = {}
    for inp in form.find_all("input"):
        name = inp.get("name")
        if not name:
            continue
        typ = (inp.get("type") or "text").lower()
        if typ in {"submit", "button", "image", "file"}:
            continue
        if typ in {"checkbox", "radio"} and not inp.has_attr("checked"):
            continue
        payload[name] = inp.get("value", "")
    for select in form.find_all("select"):
        name = select.get("name")
        if not name:
            continue
        selected = select.find("option", selected=True) or select.find("option")
        if selected:
            payload[name] = selected.get("value", clean(selected.get_text(" ", strip=True)))
    payload["__EVENTTARGET"] = event_target
    payload["__EVENTARGUMENT"] = event_argument
    return form, payload


def pager_postback(soup, wanted_page):
    # First prefer an exact numeric page link.
    for a in soup.find_all("a"):
        href = a.get("href", "")
        match = POSTBACK_RE.search(href)
        if not match:
            continue
        if clean(a.get_text(" ", strip=True)) == str(wanted_page):
            return match.group(1), match.group(2), "number"

    # At 5-page boundaries KBO hides the next number behind the '다음' pager button.
    for a in soup.find_all("a"):
        href = a.get("href", "")
        match = POSTBACK_RE.search(href)
        if not match:
            continue
        img = a.find("img")
        alt = clean(img.get("alt")) if img else ""
        src = clean(img.get("src")) if img else ""
        if "다음" in alt or "paging_next" in src:
            return match.group(1), match.group(2), "next"
    return None


def postback(session, current_url, html, event_target, event_argument):
    soup = BeautifulSoup(html, "html.parser")
    form, payload = form_payload(soup, event_target, event_argument)
    action = clean(form.get("action"))
    post_url = urljoin(current_url, action) if action else current_url
    response = session.post(post_url, data=payload, timeout=35, headers={**HEADERS, "Referer": current_url})
    response.raise_for_status()
    response.encoding = response.apparent_encoding or "utf-8"
    return response.url or post_url, response.text


def fetch_all_player_pages(url, required_headers, label):
    session = new_session()
    response = get_response(session, url)
    current_url, html = response.url, response.text
    collected = {}
    seen_signatures = set()
    page_number = 1

    while page_number <= MAX_PLAYER_PAGES:
        rows = parse_table_html(html, required_headers)
        if not rows:
            raise RuntimeError(f"[{label}] record table missing at page {page_number}")
        signature = tuple(row_identity(r) for r in rows)
        if signature in seen_signatures:
            print(f"[{label}] repeated page at {page_number}; stop")
            break
        seen_signatures.add(signature)

        before = len(collected)
        for row in rows:
            key = row_identity(row)
            if key[0] and key[1]:
                collected[key] = row
        print(f"[{label}] page={page_number} rows={len(rows)} unique={len(collected)} (+{len(collected)-before})")

        soup = BeautifulSoup(html, "html.parser")
        target_page = page_number + 1
        pager = pager_postback(soup, target_page)
        if not pager:
            break
        event_target, event_argument, kind = pager
        next_url, next_html = postback(session, current_url, html, event_target, event_argument)
        next_rows = parse_table_html(next_html, required_headers)
        next_signature = tuple(row_identity(r) for r in next_rows)
        if not next_rows or next_signature == signature:
            print(f"[{label}] pager {kind} did not advance after page {page_number}; stop")
            break
        current_url, html = next_url, next_html
        page_number = target_page

    if not collected:
        raise RuntimeError(f"[{label}] no player rows collected")
    print(f"[{label}] completed: players={len(collected)} pages={len(seen_signatures)}")
    return list(collected.values()), len(seen_signatures)


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
    hitter1, hitter1_pages = fetch_all_player_pages(URLS["hitter1"], ["순위", "선수명", "팀명", "AVG", "HR", "RBI"], "hitter-basic1")
    hitter2, hitter2_pages = fetch_all_player_pages(URLS["hitter2"], ["순위", "선수명", "팀명", "OBP", "SLG", "OPS"], "hitter-basic2")
    pitcher, pitcher_pages = fetch_all_player_pages(URLS["pitcher"], ["순위", "선수명", "팀명", "ERA", "SV", "HLD", "WHIP"], "pitcher-basic1")
    team_hitting = parse_table(URLS["team_hitting"], ["순위", "팀명", "AVG", "HR", "RBI"])
    team_pitching = parse_table(URLS["team_pitching"], ["순위", "팀명", "ERA", "W", "L"])

    hitters = map_hitters(hitter1, hitter2)
    pitchers = map_pitchers(pitcher)
    now = datetime.now(KST)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "season": now.year,
        "source": "KBO 공식 기록실",
        "scopeNote": "KBO 1군 정규시즌에서 기록이 있는 타자·투수의 전체 페이지를 순회해 수집합니다.",
        "playerCoverage": {
            "hitters": len(hitters),
            "pitchers": len(pitchers),
            "hitterBasic1Pages": hitter1_pages,
            "hitterBasic2Pages": hitter2_pages,
            "pitcherPages": pitcher_pages,
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
    print(f"KBO records updated: hitters={len(hitters)} ({hitter1_pages}/{hitter2_pages} pages), pitchers={len(pitchers)} ({pitcher_pages} pages), teams={len(payload['teamHitting'])}/{len(payload['teamPitching'])}")


if __name__ == "__main__":
    main()
