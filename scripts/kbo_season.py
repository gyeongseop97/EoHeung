"""Official KBO HTML parsers shared by the DB sync and season archive.

Read cells instead of body text: DATE and TYPE use rowspans, and postseason
TYPE values contain spaces (e.g. 'Playoff final game5'). No browser required.
"""
import re
from html.parser import HTMLParser
from fractions import Fraction

TEAM_KO = {"SAMSUNG": "삼성", "LG": "LG", "DOOSAN": "두산", "KIWOOM": "키움",
           "SSG": "SSG", "LOTTE": "롯데", "KIA": "KIA", "KT": "KT", "HANWHA": "한화", "NC": "NC"}
STADIUM_KO = {"DAEGU": "대구 삼성 라이온즈 파크", "POHANG": "포항 야구장", "JAMSIL": "잠실",
              "SAJIK": "사직", "MUNHAK": "문학", "SUWON": "수원", "GWANGJU": "광주",
              "DAEJEON": "대전", "CHANGWON": "창원", "GOCHEOKSKY": "고척스카이돔"}


class KboHTML(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.rows, self.inputs, self.text = [], {}, []
        self.row = self.cell = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "input" and attrs.get("name"):
            self.inputs[attrs["name"]] = attrs
        if tag == "tr":
            self.row = []
        if tag in ("td", "th") and self.row is not None:
            self.cell = {"attrs": attrs, "parts": []}

    def handle_data(self, data):
        self.text.append(data)
        if self.cell is not None:
            self.cell["parts"].append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.cell["text"] = " ".join(" ".join(self.cell.pop("parts")).split())
            self.row.append(self.cell)
            self.cell = None
        if tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def classify(raw):
    text = str(raw or "").upper()
    number = re.search(r"(?:GAME\s*|제?)(\d+)\s*(?:차전)?", text)
    game_number = int(number.group(1)) if number else None
    if "KOREAN SERIES" in text or "한국시리즈" in text:
        return "POSTSEASON", "KS", game_number
    if "WILD" in text or "와일드" in text:
        return "POSTSEASON", "WC", game_number
    if "SEMI" in text or "준플레이" in text:
        return "POSTSEASON", "준PO", game_number
    if "PLAYOFF" in text or "PLAY-OFF" in text or "플레이오프" in text:
        return "POSTSEASON", "PO", game_number
    if "POSTSEASON" in text or "포스트시즌" in text:
        return "POSTSEASON", None, game_number
    if any(x in text for x in ("PRESEASON", "PRE-SEASON", "EXHIBITION", "시범")):
        return "PRESEASON", None, None
    if "REGULAR" in text or "정규" in text:
        return "REGULAR", None, None
    return "UNKNOWN", None, None


def parse_schedule_html(html):
    doc = KboHTML(html)
    month = re.search(r"\b(20\d{2})\.(\d{2})\b", " ".join(doc.text))
    if not month:
        raise ValueError("KBO schedule month header missing")
    year, page_month = map(int, month.groups())
    game_date, raw_type, type_left = None, "", 0
    counts, games = {}, []
    for cells in doc.rows:
        titles = {c["attrs"].get("title"): c for c in cells}
        if "DATE" in titles:
            dm = re.search(r"(\d{2})\.(\d{2})", titles["DATE"]["text"])
            if dm:
                game_date = f"{year}-{dm[1]}-{dm[2]}"
        if "TYPE" in titles:
            raw_type = titles["TYPE"]["text"]
            type_left = int(titles["TYPE"]["attrs"].get("rowspan", 1))
        match = [c["text"] for c in cells if c["attrs"].get("title") == "GAME"]
        by_class = {c["attrs"].get("class", ""): c["text"] for c in cells}
        if not game_date or len(match) != 3:
            continue
        away, score, home = match
        if away not in TEAM_KO or home not in TEAM_KO:
            continue
        kind, round_name, number = classify(raw_type if type_left > 0 else "")
        type_left -= 1
        sm = re.fullmatch(r"\s*(\d+)\s*:\s*(\d+)\s*", score)
        away_score, home_score = (map(int, sm.groups()) if sm else (None, None))
        extra = " ".join(c["text"] for c in cells).upper()
        status = "FINISHED" if sm else "SCHEDULED"
        if re.search(r"CANCEL|취소", extra):
            status = "CANCELLED"
        elif re.search(r"POSTPON|RAIN|우천|연기", extra):
            status = "POSTPONED"
        base = f"kbo-all-{game_date}-{away}-{home}"
        counts[base] = counts.get(base, 0) + 1
        game_time = by_class.get("TIME", "")
        games.append({"source_key": f"{base}-{counts[base]}", "game_date": game_date,
                      "game_time": f"{game_time}:00" if re.fullmatch(r"\d{1,2}:\d{2}", game_time) else None,
                      "away_team": TEAM_KO[away], "home_team": TEAM_KO[home],
                      "away_score": away_score, "home_score": home_score, "status": status,
                      "stadium": STADIUM_KO.get(by_class.get("LOCATION"), by_class.get("LOCATION")),
                      "season_type": kind, "postseason_round": round_name, "game_number": number,
                      "source": "kbo-english-official"})
    return games, year, page_month


def parse_standings_html(html, expected_year):
    doc = KboHTML(html)
    selected_year = next((x.get("value") for x in doc.inputs.values() if x.get("id", "").endswith("inputYear")), None)
    if str(expected_year) != selected_year:
        raise ValueError(f"KBO standings year mismatch: {selected_year} != {expected_year}")
    rows = []
    for cells in doc.rows:
        row = {c["attrs"].get("title"): c["text"] for c in cells}
        if row.get("TEAM") not in TEAM_KO or "GAMES" not in row:
            continue
        item = {"rank": int(row["RK"]), "team": TEAM_KO[row["TEAM"]], "g": int(row["GAMES"]),
                "w": int(row["W"]), "l": int(row["L"]), "d": int(row["D"]),
                "pct": float(row["PCT"]), "gb": float(row["GB"] or 0),
                "streak": re.sub(r"W(\d+)(?:승)?", r"\1승", re.sub(r"L(\d+)(?:패)?", r"\1패", row["STREAK"]))}
        if item["g"] != item["w"] + item["l"] + item["d"]:
            raise ValueError("Invalid official standings totals")
        rows.append(item)
    if len(rows) != 10 or len({r["team"] for r in rows}) != 10:
        raise ValueError("Expected ten official KBO standings rows")
    return sorted(rows, key=lambda r: r["rank"])


def verified_standings(official, games):
    """Cross-check final tables against all 720 regular-season results.

    Some historical responses select the requested year in the controls but
    return the current year's table. Never archive that table under another year.
    """
    stats = {team: {"team": team, "g": 0, "w": 0, "l": 0, "d": 0} for team in TEAM_KO.values()}
    regular = {g['source_key']: g for g in games if g['season_type'] == 'REGULAR' and g['status'] == 'FINISHED'}
    for g in regular.values():
        away, home = stats[g['away_team']], stats[g['home_team']]
        away['g'] += 1
        home['g'] += 1
        if g['away_score'] > g['home_score']:
            away['w'] += 1
            home['l'] += 1
        elif g['away_score'] < g['home_score']:
            home['w'] += 1
            away['l'] += 1
        else:
            away['d'] += 1
            home['d'] += 1
    complete = len(regular) == 720 and all(r['g'] == 144 for r in stats.values())
    if not complete:
        return official, 'official_table'
    if all(all(row[k] == stats[row['team']][k] for k in ('g','w','l','d')) for row in official):
        return official, 'official_table_verified'
    print('WARNING: official year table disagrees with full season results; using verified 720-game totals.')
    rows = sorted(stats.values(), key=lambda r: Fraction(r['w'], r['w']+r['l']), reverse=True)
    percentages = [Fraction(r['w'],r['w']+r['l']) for r in rows]
    if len(set(percentages)) != 10:
        raise ValueError('Historical table mismatch with tied teams; official tiebreak ranking required')
    leader = rows[0]
    for rank, row in enumerate(rows,1):
        row.update(rank=rank,pct=round(row['w']/(row['w']+row['l']),3),
                   gb=((leader['w']-row['w'])+(row['l']-leader['l']))/2,streak='-')
    return rows, 'official_results_verified'
