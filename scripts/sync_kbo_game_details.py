"""Cache public Samsung game-center records. No attendance or account data is sent."""
import argparse
from concurrent.futures import ThreadPoolExecutor,as_completed
from datetime import datetime,timedelta,timezone
import json
from pathlib import Path
import time
import requests
from kbo_game_details import parse_game
from sync_kbo_season import collect

KST=timezone(timedelta(hours=9))
ROOT=Path(__file__).resolve().parents[1]
HEADERS={"User-Agent":"Mozilla/5.0 EoHeung game records","Referer":"https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx","X-Requested-With":"XMLHttpRequest"}

def post(session,path,data):
    for attempt in range(3):
        try:
            r=session.post("https://www.koreabaseball.com"+path,data=data,timeout=25)
            r.raise_for_status()
            try:content=r.content.decode("utf-8")
            except UnicodeDecodeError:content=r.content.decode("cp949")
            return json.loads(content)
        except (requests.RequestException,ValueError):
            if attempt==2:raise
            time.sleep(attempt+1)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--year",type=int,default=datetime.now(KST).year)
    parser.add_argument("--schedule",type=Path)
    args=parser.parse_args()
    target=ROOT/"data"/"kbo-game-details"/f"{args.year}.json"
    previous=json.loads(target.read_text(encoding="utf-8")) if target.exists() else {"games":[]}
    cached={g["gameId"]:g for g in previous["games"]}
    if args.schedule:games=json.loads(args.schedule.read_text(encoding="utf-8"))
    else:
        with requests.Session() as session:
            session.headers.update(HEADERS)
            games=collect(args.year,session,postseason_only=False)
    dates=sorted({g["game_date"] for g in games if g["status"]=="FINISHED" and "삼성" in [g["away_team"],g["home_team"]]})
    cutoff=(datetime.now(KST)-timedelta(days=7)).date().isoformat()
    def fetch_date(date):
        expected=[g for g in games if g["game_date"]==date and g["status"]=="FINISHED" and "삼성" in [g["away_team"],g["home_team"]]]
        existing=[g for g in cached.values() if g["game_date"]==date]
        if date<cutoff and len(existing)==len(expected) and all(g.get("homeRuns") is not None and g.get("walkoffWin") is not None for g in existing):return [],[]
        found,errors=[],[]
        with requests.Session() as session:
            session.headers.update(HEADERS)
            listing=post(session,"/ws/Main.asmx/GetKboGameList",{"leId":"1","srId":"0,1,3,4,5,6,7,8,9","date":date.replace("-","")})
            for meta in listing.get("game",[]):
                if "SS" not in [meta["AWAY_ID"],meta["HOME_ID"]] or str(meta.get("GAME_STATE_SC"))!="3":continue
                params={"leId":meta["LE_ID"],"srId":meta["SR_ID"],"seasonId":meta["SEASON_ID"],"gameId":meta["G_ID"]}
                try:
                    box=post(session,"/ws/Schedule.asmx/GetBoxScoreScroll",params)
                    score=post(session,"/ws/Schedule.asmx/GetScoreBoardScroll",params)
                    found.append(parse_game(meta,box,score))
                except Exception as error:errors.append({"gameId":meta["G_ID"],"error":str(error)[:160]})
        return found,errors
    errors=[];completed=0
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures={pool.submit(fetch_date,date):date for date in dates}
        for future in as_completed(futures):
            date=futures[future]
            try:
                records,failed=future.result();errors.extend(failed)
                for record in records:cached[record["gameId"]]=record
            except Exception as error:errors.append({"date":date,"error":str(error)[:160]})
            completed+=1
            if completed%20==0:print(f"Official game details: {completed}/{len(dates)} dates, {len(cached)} games",flush=True)
    if not cached:raise RuntimeError("No verified official box scores; preserving prior data")
    payload={"year":args.year,"source":"KBO 공식 게임센터","updatedAt":datetime.now(KST).isoformat(timespec="seconds"),"games":sorted(cached.values(),key=lambda g:g["gameId"]),"unavailable":errors}
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"Saved {len(cached)} verified games; {len(errors)} unavailable",flush=True)

if __name__=="__main__":main()
