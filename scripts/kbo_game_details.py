"""Parse official KBO game-center tables without assuming fixed column offsets."""
import html
import json
import re

TEAMS={"SS":"삼성","LG":"LG","KT":"KT","SK":"SSG","HT":"KIA","OB":"두산","HH":"한화","LT":"롯데","WO":"키움","NC":"NC"}

def table(value):
    return json.loads(value) if isinstance(value,str) else value

def text(cell):
    return html.unescape(re.sub(r"<[^>]*>","",str(cell.get("Text", "")))).strip()

def count(value):
    s=str(value).strip()
    return int(s) if re.fullmatch(r"\d+",s) else None

def pitcher_total(pitcher,key):
    data=table(pitcher["table"])
    headers=[text(cell) for cell in data["headers"][0]["row"]]
    if key not in headers or not data.get("rows"):
        return None
    index=headers.index(key)
    values=[count(text(row["row"][index])) for row in data["rows"]]
    return sum(values) if all(v is not None for v in values) else None

def walkoff(score):
    """Only infer a walk-off when a completed home 9th/extra inning wins it."""
    away,home=int(score["T_SCORE_CN"]),int(score["B_SCORE_CN"])
    if home<=away:
        return False
    rows=table(score["table2"])["rows"]
    if len(rows)!=2:
        return None
    def innings(row):
        values=[]
        for cell in row["row"]:
            s=text(cell).upper()
            m=re.fullmatch(r"(\d+)X?",s)
            if m: values.append(int(m[1]))
            elif s in {"-","X",""}: values.append(None)
            else: raise ValueError("Unknown inning score")
        return values
    try:
        a,h=map(innings,rows)
    except ValueError:
        return None
    if sum(v or 0 for v in a)!=away or sum(v or 0 for v in h)!=home:
        return None
    played=[i for i,v in enumerate(h) if v is not None]
    if not played:
        return None
    last=played[-1]
    if last<8:
        # A home lead through 8 followed by an unplayed 9th is not a walk-off.
        if len(a)>8 and a[8] is not None and home>away:return False
        return None
    return h[last]>0 and sum(v or 0 for v in h[:last])<=away

def parse_game(meta,box,score):
    if str(box.get("code"))!="100" or str(score.get("code"))!="100":
        raise ValueError("Official box score not ready")
    gid=meta["G_ID"]
    if score.get("G_ID")!=gid or score.get("AWAY_ID")!=meta["AWAY_ID"] or score.get("HOME_ID")!=meta["HOME_ID"]:
        raise ValueError("Game identity mismatch")
    if int(meta["T_SCORE_CN"])!=int(score["T_SCORE_CN"]) or int(meta["B_SCORE_CN"])!=int(score["B_SCORE_CN"]):
        raise ValueError("Official score mismatch")
    pitchers=box.get("arrPitcher",[])
    if len(pitchers)!=2:raise ValueError("Missing pitcher tables")
    ss=1 if meta["HOME_ID"]=="SS" else 0
    # HR in pitching tables means HR allowed; the opposite pitcher total is batting HR.
    home_runs=pitcher_total(pitchers[1-ss],"홈런")
    strikeouts=pitcher_total(pitchers[ss],"삼진")
    if home_runs is None or strikeouts is None:raise ValueError("Incomplete pitcher totals")
    end=walkoff(score)
    d=str(meta["G_DT"])
    return {"gameId":gid,"game_date":f"{d[:4]}-{d[4:6]}-{d[6:8]}","game_time":meta["G_TM"],
        "away_team":TEAMS[meta["AWAY_ID"]],"home_team":TEAMS[meta["HOME_ID"]],
        "away_score":int(score["T_SCORE_CN"]),"home_score":int(score["B_SCORE_CN"]),
        "homeRuns":home_runs,"homeRunsAllowed":pitcher_total(pitchers[ss],"홈런"),
        "strikeouts":strikeouts,"struckOut":pitcher_total(pitchers[1-ss],"삼진"),
        "walkoffWin":None if end is None else bool(end and ss==1),
        "walkoffLoss":None if end is None else bool(end and ss==0),
        "sourceUrl":f"https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx?gameDate={d}&gameId={gid}&section=REVIEW"}
