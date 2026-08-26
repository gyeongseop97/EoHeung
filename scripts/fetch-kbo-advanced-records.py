import json
import math
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import urlencode

import requests

API = "https://api-gw.sports.naver.com"
SEASON = datetime.now().year
KST = timezone(timedelta(hours=9))
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://m.sports.naver.com/kbaseball/record/kbo",
}
BASIC_PATH = Path("data/kbo-records.json")
OUT_PATH = Path("data/kbo-advanced-records.json")


def n(v):
    if v is None or v == "":
        return None
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None


def r(v, digits=3):
    x = n(v)
    return None if x is None else round(x, digits)


def norm_team(value):
    raw = str(value or "").strip()
    upper = raw.upper()
    mapping = {
        "SS": "삼성", "SAMSUNG": "삼성", "삼성": "삼성", "삼성 라이온즈": "삼성",
        "LG": "LG", "LG 트윈스": "LG",
        "KT": "KT", "KT 위즈": "KT",
        "SK": "SSG", "SSG": "SSG", "SSG 랜더스": "SSG",
        "HT": "KIA", "KIA": "KIA", "기아": "KIA", "KIA 타이거즈": "KIA",
        "OB": "두산", "DOOSAN": "두산", "두산": "두산", "두산 베어스": "두산",
        "HH": "한화", "HANWHA": "한화", "한화": "한화", "한화 이글스": "한화",
        "LT": "롯데", "LOTTE": "롯데", "롯데": "롯데", "롯데 자이언츠": "롯데",
        "WO": "키움", "KIWOOM": "키움", "키움": "키움", "키움 히어로즈": "키움",
        "NC": "NC", "NC 다이노스": "NC",
    }
    return mapping.get(raw, mapping.get(upper, raw))


def get_result(path, params=None):
    url = f"{API}{path}"
    if params:
        url += "?" + urlencode(params)
    response = requests.get(url, headers=HEADERS, timeout=25)
    response.raise_for_status()
    payload = response.json()
    if payload.get("success") is False:
        raise RuntimeError(f"Naver API success=false: {url}")
    return payload.get("result") or {}


def extract_rows(result):
    if isinstance(result, list):
        return result
    if not isinstance(result, dict):
        return []
    for key in ("seasonPlayerStats", "players", "rankings", "items"):
        value = result.get(key)
        if isinstance(value, list):
            return value
    for value in result.values():
        if isinstance(value, list) and (not value or isinstance(value[0], dict)):
            return value
    return []


def fetch_teams():
    result = get_result(
        f"/statistics/categories/kbo/seasons/{SEASON}/teams",
        {"gameType": "REGULAR_SEASON"},
    )
    rows = result.get("seasonTeamStats") or []
    teams = []
    for row in rows:
        code = str(row.get("teamId") or row.get("teamCode") or "").strip()
        name = norm_team(row.get("teamShortName") or row.get("teamName") or code)
        if code and name:
            teams.append((code, name))
    if len(teams) < 10:
        # Naver KBO historical franchise codes. Used only if the team feed changes shape.
        teams = [("SS", "삼성"), ("LG", "LG"), ("KT", "KT"), ("SK", "SSG"),
                 ("HT", "KIA"), ("OB", "두산"), ("HH", "한화"), ("LT", "롯데"),
                 ("WO", "키움"), ("NC", "NC")]
    return teams


def fetch_team_players(player_type, team_code, primary_field):
    # teamCode 모드는 해당 팀 선수 전체를 내려준다. pageSize는 충분히 크게 둔다.
    params = {
        "playerType": player_type,
        "field": primary_field,
        "direction": "DESC",
        "pageSize": "100",
        "page": "1",
        "teamCode": team_code,
        "gameType": "REGULAR_SEASON",
    }
    result = get_result(f"/statistics/categories/kbo/seasons/{SEASON}/players", params)
    return extract_rows(result)


def fetch_global_union(player_type, fields):
    # teamCode 응답에 이상이 있을 때도 상위 기록 선수는 보강한다.
    by_id = {}
    for field in fields:
        result = get_result(
            f"/statistics/categories/kbo/seasons/{SEASON}/players",
            {
                "playerType": player_type,
                "field": field,
                "direction": "ASC" if field in {"pitcherEra", "pitcherWhip"} else "DESC",
                "pageSize": "100",
                "page": "1",
                "gameType": "REGULAR_SEASON",
            },
        )
        for row in extract_rows(result):
            pid = str(row.get("playerId") or row.get("playerCode") or "")
            key = pid or f"{row.get('playerName')}|{row.get('teamId')}"
            if key:
                by_id[key] = {**by_id.get(key, {}), **row}
    return list(by_id.values())


def collect_naver_players():
    teams = fetch_teams()
    hitter_by_id = {}
    pitcher_by_id = {}
    print("Naver teams:", ", ".join(f"{code}:{name}" for code, name in teams))

    for code, team_name in teams:
        hitters = fetch_team_players("HITTER", code, "hitterWar")
        pitchers = fetch_team_players("PITCHER", code, "pitcherWar")
        print(f"[naver] {team_name}({code}) hitters={len(hitters)} pitchers={len(pitchers)}")
        for row in hitters:
            row = dict(row)
            row["_teamFallback"] = team_name
            pid = str(row.get("playerId") or row.get("playerCode") or "")
            key = pid or f"{row.get('playerName')}|{team_name}"
            hitter_by_id[key] = {**hitter_by_id.get(key, {}), **row}
        for row in pitchers:
            row = dict(row)
            row["_teamFallback"] = team_name
            pid = str(row.get("playerId") or row.get("playerCode") or "")
            key = pid or f"{row.get('playerName')}|{team_name}"
            pitcher_by_id[key] = {**pitcher_by_id.get(key, {}), **row}

    # The public endpoint is effectively a leaderboard when teamCode is omitted.
    # Union several sort fields to backfill any team-code omissions.
    for row in fetch_global_union("HITTER", [
        "hitterWar", "hitterWrcPlus", "hitterWoba", "hitterHra", "hitterAb",
        "hitterHr", "hitterRbi", "hitterHit", "hitterOps", "hitterRun",
    ]):
        pid = str(row.get("playerId") or row.get("playerCode") or "")
        key = pid or f"{row.get('playerName')}|{row.get('teamId')}"
        hitter_by_id[key] = {**hitter_by_id.get(key, {}), **row}

    for row in fetch_global_union("PITCHER", [
        "pitcherWar", "pitcherEra", "pitcherInning", "pitcherKk", "pitcherWin",
        "pitcherHold", "pitcherSave", "pitcherWhip", "pitcherGameCount",
    ]):
        pid = str(row.get("playerId") or row.get("playerCode") or "")
        key = pid or f"{row.get('playerName')}|{row.get('teamId')}"
        pitcher_by_id[key] = {**pitcher_by_id.get(key, {}), **row}

    hitters = list(hitter_by_id.values())
    pitchers = list(pitcher_by_id.values())
    if hitters:
        print("[naver] hitter sample keys:", sorted(hitters[0].keys()))
    if pitchers:
        print("[naver] pitcher sample keys:", sorted(pitchers[0].keys()))
    print(f"[naver] union hitters={len(hitters)} pitchers={len(pitchers)}")
    return hitters, pitchers


def basic_key(name, team):
    return str(name or "").strip(), norm_team(team)


def naver_index(rows):
    out = {}
    for row in rows:
        name = str(row.get("playerName") or row.get("name") or "").strip()
        team = norm_team(
            row.get("teamShortName") or row.get("teamName") or row.get("teamId") or row.get("_teamFallback")
        )
        if name:
            out[(name, team)] = row
            # If team naming unexpectedly fails, keep a name-only fallback only when unique.
    by_name = {}
    duplicates = set()
    for (name, _team), row in out.items():
        if name in by_name:
            duplicates.add(name)
        else:
            by_name[name] = row
    for name in duplicates:
        by_name.pop(name, None)
    return out, by_name


def ip_decimal(value):
    if value is None or value == "":
        return 0.0
    if isinstance(value, (int, float)):
        v = float(value)
        whole = math.floor(v)
        frac = round(v - whole, 3)
        if abs(frac - 0.1) < 0.02:
            return whole + 1 / 3
        if abs(frac - 0.2) < 0.02:
            return whole + 2 / 3
        return v
    s = str(value).strip()
    if "⅓" in s:
        whole = "".join(ch for ch in s.split("⅓")[0] if ch.isdigit())
        return (float(whole) if whole else 0) + 1 / 3
    if "⅔" in s:
        whole = "".join(ch for ch in s.split("⅔")[0] if ch.isdigit())
        return (float(whole) if whole else 0) + 2 / 3
    try:
        v = float(s)
        whole = math.floor(v)
        frac = round(v - whole, 3)
        if abs(frac - 0.1) < 0.02:
            return whole + 1 / 3
        if abs(frac - 0.2) < 0.02:
            return whole + 2 / 3
        return v
    except ValueError:
        return 0.0


def first_num(row, *keys):
    for key in keys:
        value = n(row.get(key)) if row else None
        if value is not None:
            return value
    return None


def build_hitter(basic, nv):
    ab = n(basic.get("AB")) or 0
    h = n(basic.get("H")) or 0
    hr = n(basic.get("HR")) or 0
    so = n(basic.get("SO")) or 0
    sf = n(basic.get("SF")) or 0
    bb = n(basic.get("BB")) or 0
    pa = n(basic.get("PA")) or 0
    avg = n(basic.get("AVG"))
    slg = n(basic.get("SLG"))
    sb = first_num(nv, "hitterSb") or 0
    cs = first_num(nv, "hitterCs") or 0
    tb = n(basic.get("TB")) or 0

    bip_den = ab - so - hr + sf
    babip = (h - hr) / bip_den if bip_den > 0 else None
    iso = slg - avg if slg is not None and avg is not None else None
    bb_pct = bb / pa * 100 if pa > 0 else None
    k_pct = so / pa * 100 if pa > 0 else None
    seca = (bb + max(0, tb - h) + sb - cs) / ab if ab > 0 else None
    # Basic Bill James Runs Created approximation; retained only as a supporting metric.
    rc = ((h + bb) * tb / (ab + bb)) if (ab + bb) > 0 else None

    return {
        "name": basic.get("name", ""),
        "team": norm_team(basic.get("team")),
        "G": basic.get("G"),
        "PA": basic.get("PA"),
        "WAR": r(first_num(nv, "hitterWar"), 2),
        "wRC+": r(first_num(nv, "hitterWrcPlus", "hitterWrc+", "hitterWrc"), 1),
        "BABIP": r(babip, 3),
        "wOBA": r(first_num(nv, "hitterWoba"), 3),
        "ISO": r(iso, 3),
        "BB%": r(bb_pct, 1),
        "K%": r(k_pct, 1),
        "RC": r(rc, 1),
        "SecA": r(seca, 3),
        "OPS": basic.get("OPS"),
        "OBP": basic.get("OBP"),
        "SLG": basic.get("SLG"),
        "playerId": str((nv or {}).get("playerId") or "") or None,
    }


def league_pitching_constants(basic_pitchers):
    total_ip = total_er = total_hr = total_bb_hbp = total_so = 0.0
    for p in basic_pitchers:
        ip = ip_decimal(p.get("IP"))
        if ip <= 0:
            continue
        total_ip += ip
        total_er += n(p.get("ER")) or 0
        total_hr += n(p.get("HR")) or 0
        total_bb_hbp += (n(p.get("BB")) or 0) + (n(p.get("HBP")) or 0)
        total_so += n(p.get("SO")) or 0
    league_era = total_er * 9 / total_ip if total_ip else None
    kernel = (13 * total_hr + 3 * total_bb_hbp - 2 * total_so) / total_ip if total_ip else None
    fip_constant = league_era - kernel if league_era is not None and kernel is not None else None
    return league_era, fip_constant


def build_pitcher(basic, nv, league_era, fip_constant):
    ip = ip_decimal(basic.get("IP"))
    h = n(basic.get("H")) or 0
    hr = n(basic.get("HR")) or 0
    bb = n(basic.get("BB")) or 0
    hbp = n(basic.get("HBP")) or 0
    so = n(basic.get("SO")) or 0
    era = n(basic.get("ERA"))

    if ip > 0:
        fip = (13 * hr + 3 * (bb + hbp) - 2 * so) / ip + fip_constant if fip_constant is not None else None
        k9 = so * 9 / ip
        bb9 = bb * 9 / ip
        hr9 = hr * 9 / ip
        h9 = h * 9 / ip
        kbb = so / bb if bb > 0 else (float(so) if so > 0 else None)
        # No official AB-against/SF field in the public season feed. This is the conventional BIP-outs approximation.
        bip = max(0.0, ip * 3 - so) + max(0.0, h - hr)
        babip = (h - hr) / bip if bip > 0 else None
    else:
        fip = k9 = bb9 = hr9 = h9 = kbb = babip = None

    era_minus = era / league_era * 100 if era is not None and league_era else None
    fip_minus = fip / league_era * 100 if fip is not None and league_era else None

    return {
        "name": basic.get("name", ""),
        "team": norm_team(basic.get("team")),
        "G": basic.get("G"),
        "IP": basic.get("IP"),
        "WAR": r(first_num(nv, "pitcherWar"), 2),
        "FIP": r(fip, 2),
        "ERA-": r(era_minus, 1),
        "FIP-": r(fip_minus, 1),
        "BABIP": r(first_num(nv, "pitcherBabip"), 3) if first_num(nv, "pitcherBabip") is not None else r(babip, 3),
        "BABIP_ESTIMATED": first_num(nv, "pitcherBabip") is None,
        "K/9": r(k9, 2),
        "BB/9": r(bb9, 2),
        "K/BB": r(kbb, 2),
        "K%": r(first_num(nv, "pitcherKRate", "pitcherKPercent"), 1),
        "BB%": r(first_num(nv, "pitcherBbRate", "pitcherBbPercent"), 1),
        "HR/9": r(hr9, 2),
        "H/9": r(h9, 2),
        "LOB%": r(first_num(nv, "pitcherLob", "pitcherLobPercent"), 1),
        "WHIP": basic.get("WHIP"),
        "playerId": str((nv or {}).get("playerId") or "") or None,
    }


def main():
    if not BASIC_PATH.exists():
        raise RuntimeError("data/kbo-records.json must exist before advanced records are built")
    basic = json.loads(BASIC_PATH.read_text(encoding="utf-8"))
    basic_hitters = basic.get("hitters") or []
    basic_pitchers = basic.get("pitchers") or []
    if len(basic_hitters) < 100 or len(basic_pitchers) < 100:
        raise RuntimeError(f"Basic player coverage too small: {len(basic_hitters)}/{len(basic_pitchers)}")

    naver_hitters, naver_pitchers = collect_naver_players()
    hi, hi_name = naver_index(naver_hitters)
    pi, pi_name = naver_index(naver_pitchers)

    matched_h = matched_p = 0
    hitters = []
    for b in basic_hitters:
        key = basic_key(b.get("name"), b.get("team"))
        nv = hi.get(key) or hi_name.get(key[0])
        matched_h += int(nv is not None)
        hitters.append(build_hitter(b, nv))

    league_era, fip_constant = league_pitching_constants(basic_pitchers)
    pitchers = []
    for b in basic_pitchers:
        key = basic_key(b.get("name"), b.get("team"))
        nv = pi.get(key) or pi_name.get(key[0])
        matched_p += int(nv is not None)
        pitchers.append(build_pitcher(b, nv, league_era, fip_constant))

    # Master-list coverage is guaranteed by the already verified KBO full-page crawler.
    if len(hitters) != len(basic_hitters) or len(pitchers) != len(basic_pitchers):
        raise RuntimeError("Advanced cache lost players while merging")
    # WAR/wRC+ should match the large majority of players who have meaningful season stats.
    war_h = sum(1 for x in hitters if x.get("WAR") is not None)
    war_p = sum(1 for x in pitchers if x.get("WAR") is not None)
    wrc = sum(1 for x in hitters if x.get("wRC+") is not None)
    if matched_h < 100 or matched_p < 100 or war_h < 80 or war_p < 80:
        raise RuntimeError(
            f"Naver advanced merge coverage too small: match={matched_h}/{matched_p}, WAR={war_h}/{war_p}, wRC+={wrc}"
        )

    now = datetime.now(KST)
    payload = {
        "updatedAt": now.isoformat(timespec="seconds"),
        "season": SEASON,
        "source": "네이버 스포츠 KBO + KBO 공식 기록실",
        "sourceNote": (
            "WAR·wRC+·wOBA는 네이버 스포츠 KBO 시즌 기록값, BABIP·ISO·BB%·K%와 투수 FIP·K/9 등은 "
            "KBO 공식 누적기록을 이용해 계산했습니다. 투수 BABIP는 네이버 직접값이 없을 때 BIP-outs 방식 추정값입니다."
        ),
        "sourceUrls": {
            "naverPlayers": f"{API}/statistics/categories/kbo/seasons/{SEASON}/players",
            "kboOfficial": "https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx",
        },
        "coverage": {
            "hitters": len(hitters),
            "pitchers": len(pitchers),
            "naverMatchedHitters": matched_h,
            "naverMatchedPitchers": matched_p,
            "hitterWar": war_h,
            "hitterWrcPlus": wrc,
            "pitcherWar": war_p,
        },
        "leagueConstants": {"ERA": r(league_era, 3), "FIPConstant": r(fip_constant, 3)},
        "hitters": hitters,
        "pitchers": pitchers,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "KBO advanced records updated: "
        f"hitters={len(hitters)} pitchers={len(pitchers)} "
        f"matched={matched_h}/{matched_p} WAR={war_h}/{war_p} wRC+={wrc}"
    )


if __name__ == "__main__":
    main()
