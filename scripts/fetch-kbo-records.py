import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.koreabaseball.com"
URLS = {
    "hitter1": f"{BASE}/Record/Player/HitterBasic/Basic1.aspx",
    "hitter2": f"{BASE}/Record/Player/HitterBasic/Basic2.aspx",
    "pitcher": f"{BASE}/Record/Player/PitcherBasic/Basic1.aspx",
    "team_hitting": f"{BASE}/Record/Team/Hitter/BasicOld.aspx",
    "team_pitching": f"{BASE}/Record/Team/Pitcher/BasicOld.aspx",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
    "Referer": f"{BASE}/Record/Player/HitterBasic/Basic1.aspx",
}
KST = timezone(timedelta(hours=9))


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


def parse_table(url, required_headers):
    soup = BeautifulSoup(fetch_html(url), "html.parser")
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
    raise RuntimeError(f"KBO record table not found: {url}")


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
    hitter1 = parse_table(URLS["hitter1"], ["순위", "선수명", "팀명", "AVG", "HR", "RBI"])
    hitter2 = parse_table(URLS["hitter2"], ["순위", "선수명", "팀명", "OBP", "SLG", "OPS"])
    pitcher = parse_table(URLS["pitcher"], ["순위", "선수명", "팀명", "ERA", "WHIP"])
    team_hitting = parse_table(URLS["team_hitting"], ["순위", "팀명", "AVG", "HR", "RBI"])
    team_pitching = parse_table(URLS["team_pitching"], ["순위", "팀명", "ERA", "W", "L"])

    now = datetime.now(KST)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "season": now.year,
        "source": "KBO 공식 기록실",
        "scopeNote": "선수 기록은 KBO 공식 기본기록 표에 현재 노출되는 선수 기준입니다.",
        "sourceUrls": URLS,
        "hitters": map_hitters(hitter1, hitter2),
        "pitchers": map_pitchers(pitcher),
        "teamHitting": map_team_hitting(team_hitting),
        "teamPitching": map_team_pitching(team_pitching),
    }
    target = Path("data/kbo-records.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KBO records updated: hitters={len(payload['hitters'])}, pitchers={len(payload['pitchers'])}, teams={len(payload['teamHitting'])}/{len(payload['teamPitching'])}")


if __name__ == "__main__":
    main()
