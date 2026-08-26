import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.yagoonara.com"
URLS = {
    "hitter": f"{BASE}/players/records/hitter",
    "pitcher": f"{BASE}/players/records/pitcher",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.7",
}
KST = timezone(timedelta(hours=9))


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def clean_header(value):
    return clean(value).replace("▲", "").replace("▼", "").strip()


def number(value):
    s = clean(value).replace(",", "").replace("%", "")
    if s in {"", "-", "—", "N/A"}:
        return None
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return None


def maybe_unduplicate_name(value):
    s = clean(value)
    if len(s) % 2 == 0:
        half = len(s) // 2
        if s[:half] == s[half:]:
            return s[:half]
    return s


def fetch_html(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text


def cell_text(cell):
    text = clean(cell.get_text(" ", strip=True))
    if text:
        return text
    img = cell.find("img")
    if img:
        for key in ("alt", "title"):
            if clean(img.get(key)):
                return clean(img.get(key))
    return ""


def normalize_team(value):
    raw = clean(value)
    raw = raw.replace("트윈스", "").replace("라이온즈", "").replace("타이거즈", "").replace("베어스", "")
    raw = raw.replace("이글스", "").replace("자이언츠", "").replace("히어로즈", "").replace("다이노스", "")
    maps = {
        "SAMSUNG": "삼성", "삼성": "삼성", "LG": "LG", "KT": "KT", "SSG": "SSG",
        "KIA": "KIA", "기아": "KIA", "DOOSAN": "두산", "두산": "두산",
        "HANWHA": "한화", "한화": "한화", "LOTTE": "롯데", "롯데": "롯데",
        "KIWOOM": "키움", "키움": "키움", "NC": "NC",
    }
    return maps.get(raw.upper(), maps.get(raw, raw))


def parse_player_table(url):
    soup = BeautifulSoup(fetch_html(url), "html.parser")
    candidates = []
    for table in soup.find_all("table"):
        head_rows = table.select("thead tr")
        if head_rows:
            header_row = max(head_rows, key=lambda tr: len(tr.find_all(["th", "td"])))
        else:
            header_row = table.find("tr")
        if not header_row:
            continue
        headers = [clean_header(c.get_text(" ", strip=True)) for c in header_row.find_all(["th", "td"])]
        if "선수명" not in headers or "WAR" not in headers:
            continue
        rows = []
        body_rows = table.select("tbody tr") or table.find_all("tr")[1:]
        for tr in body_rows:
            cells = tr.find_all("td")
            if len(cells) < len(headers):
                continue
            values = [cell_text(cells[i]) for i in range(len(headers))]
            row = dict(zip(headers, values))
            name = maybe_unduplicate_name(row.get("선수명", ""))
            if not name or name in {"선수명", "합계"}:
                continue
            row["선수명"] = name
            if "팀명" in row:
                row["팀명"] = normalize_team(row.get("팀명"))
                if not row["팀명"]:
                    team_cell = cells[headers.index("팀명")]
                    img = team_cell.find("img")
                    if img:
                        row["팀명"] = normalize_team(img.get("alt") or img.get("title") or "")
            rows.append(row)
        if rows:
            candidates.append(rows)
    if not candidates:
        raise RuntimeError(f"Advanced record table not found: {url}")
    return max(candidates, key=len)


def n(row, key):
    return number(row.get(key))


def map_hitters(rows):
    out = []
    for r in rows:
        out.append({
            "name": r.get("선수명", ""),
            "team": normalize_team(r.get("팀명", "")),
            "G": n(r, "경기"),
            "PA": n(r, "타석"),
            "WAR": n(r, "WAR"),
            "wRC+": n(r, "wRC+"),
            "BABIP": n(r, "BABIP"),
            "wOBA": n(r, "wOBA"),
            "ISO": n(r, "순수장타율"),
            "BB%": n(r, "볼넷비율"),
            "K%": n(r, "삼진비율"),
            "RC": n(r, "RC"),
            "SecA": n(r, "SecA"),
            "GPA": n(r, "GPA"),
            "OPS": n(r, "OPS"),
            "OBP": n(r, "출루율"),
            "SLG": n(r, "장타율"),
        })
    return dedupe(out)


def map_pitchers(rows):
    out = []
    for r in rows:
        out.append({
            "name": r.get("선수명", ""),
            "team": normalize_team(r.get("팀명", "")),
            "G": n(r, "경기"),
            "IP": r.get("이닝", ""),
            "WAR": n(r, "WAR"),
            "FIP": n(r, "FIP"),
            "ERA-": n(r, "ERA-"),
            "FIP-": n(r, "FIP-"),
            "BABIP": n(r, "BABIP"),
            "K/9": n(r, "K/9"),
            "BB/9": n(r, "BB/9"),
            "K/BB": n(r, "K/BB"),
            "K%": n(r, "삼진비율"),
            "BB%": n(r, "볼넷비율"),
            "HR/9": n(r, "HR/9"),
            "H/9": n(r, "H/9"),
            "LOB%": n(r, "LOB%"),
            "SV%": n(r, "세이브율"),
            "WHIP": n(r, "WHIP"),
            "OPS_AGAINST": n(r, "피OPS"),
        })
    return dedupe(out)


def dedupe(rows):
    out = []
    seen = set()
    for r in rows:
        key = (r.get("name", ""), r.get("team", ""))
        if not key[0] or key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def main():
    hitter_rows = parse_player_table(URLS["hitter"])
    pitcher_rows = parse_player_table(URLS["pitcher"])
    hitters = map_hitters(hitter_rows)
    pitchers = map_pitchers(pitcher_rows)

    # Guard against accidentally saving only the qualified/first-page leaderboard.
    if len(hitters) < 100 or len(pitchers) < 100:
        raise RuntimeError(
            f"Advanced records coverage is too small: hitters={len(hitters)}, pitchers={len(pitchers)}"
        )

    now = datetime.now(KST)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "season": now.year,
        "source": "야구나라 세이버메트릭스",
        "sourceNote": "기본 기록은 KBO 공식 기록실, WAR·wRC+·FIP 등 고급지표는 야구나라 세이버메트릭스 기준입니다.",
        "sourceUrls": URLS,
        "coverage": {"hitters": len(hitters), "pitchers": len(pitchers)},
        "hitters": hitters,
        "pitchers": pitchers,
    }
    target = Path("data/kbo-advanced-records.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"KBO advanced records updated: hitters={len(hitters)}, pitchers={len(pitchers)}")


if __name__ == "__main__":
    main()
