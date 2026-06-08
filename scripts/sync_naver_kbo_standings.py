import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

URL = 'https://m.sports.naver.com/kbaseball/record/index'
OUT = Path('data/kbo-standings.json')
TEAM_NAMES = ['LG','KT','삼성','KIA','한화','두산','NC','SSG','롯데','키움']
TEAM_RE = '|'.join(map(re.escape, sorted(TEAM_NAMES, key=len, reverse=True)))
KST = timezone(timedelta(hours=9))


def clean(text):
    return re.sub(r'\s+', ' ', str(text or '')).strip()


def get_html():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Referer': 'https://m.sports.naver.com/kbaseball/index',
    }
    r = requests.get(URL, headers=headers, timeout=30)
    r.raise_for_status()
    return r.text


def parse_next_team(fragment):
    m = re.search(r'다음경기[^A-Za-z가-힣]*(%s)' % TEAM_RE, fragment)
    if m:
        return m.group(1)
    # logo alt/title 주변에 팀명이 남는 경우 보정
    tail = fragment[-700:]
    found = re.findall(TEAM_RE, tail)
    return found[-1] if found else ''


def parse_rows(html):
    # 네이버 모바일 순위는 렌더링 JSON/HTML 안에 순위명, 승률, 게임차 순으로 포함된다.
    compact = clean(html)
    rows = []
    pattern = re.compile(
        r'(?P<rank>\d{1,2})\s+(?P<team>%s)\s+' % TEAM_RE +
        r'(?P<pct>0\.\d{3}|1\.000)\s+' +
        r'(?P<gb>\d+(?:\.\d+)?)\s+' +
        r'(?P<w>\d+)\s+(?P<d>\d+)\s+(?P<l>\d+)\s+(?P<g>\d+)\s+' +
        r'(?P<streak>\d+[승패무])\s+' +
        r'(?P<batting>0\.\d{3})\s+' +
        r'(?P<era>\d+\.\d{2})\s+' +
        r'(?P<recent5>\d+승-\d+패-\d+무)',
        re.S
    )
    for m in pattern.finditer(compact):
        data = m.groupdict()
        frag = compact[m.end():m.end()+1000]
        data['nextOpponent'] = parse_next_team(frag)
        rows.append({
            'rank': int(data['rank']),
            'team': data['team'],
            'pct': data['pct'],
            'gb': data['gb'],
            'w': int(data['w']),
            'd': int(data['d']),
            'l': int(data['l']),
            'g': int(data['g']),
            'streak': data['streak'],
            'batting': data['batting'],
            'era': data['era'],
            'recent5': data['recent5'],
            'nextOpponent': data['nextOpponent'],
        })
    # 중복 제거 및 10개 제한
    out = []
    seen = set()
    for r in rows:
        if r['team'] in seen:
            continue
        seen.add(r['team'])
        out.append(r)
    return out[:10]


def fallback_rows():
    # 네이버 파싱 실패 시 화면이 깨지지 않도록 마지막 캡처 기준 구조와 동일한 수동 fallback.
    return [
        {'rank':1,'team':'LG','pct':'0.610','gb':'0.0','w':36,'d':0,'l':23,'g':59,'streak':'2패','batting':'0.268','era':'4.39','recent5':'3승-2패-0무','nextOpponent':'SSG'},
        {'rank':2,'team':'KT','pct':'0.586','gb':'1.5','w':34,'d':1,'l':24,'g':59,'streak':'1패','batting':'0.284','era':'4.60','recent5':'1승-4패-0무','nextOpponent':'삼성'},
        {'rank':3,'team':'삼성','pct':'0.579','gb':'2.0','w':33,'d':1,'l':24,'g':58,'streak':'1패','batting':'0.274','era':'4.18','recent5':'1승-4패-0무','nextOpponent':'KT'},
        {'rank':4,'team':'KIA','pct':'0.542','gb':'4.0','w':32,'d':1,'l':27,'g':60,'streak':'1승','batting':'0.266','era':'4.01','recent5':'4승-1패-0무','nextOpponent':'한화'},
        {'rank':5,'team':'한화','pct':'0.526','gb':'5.0','w':30,'d':1,'l':27,'g':58,'streak':'3승','batting':'0.282','era':'4.80','recent5':'4승-1패-0무','nextOpponent':'KIA'},
        {'rank':6,'team':'두산','pct':'0.500','gb':'6.5','w':29,'d':2,'l':29,'g':60,'streak':'1패','batting':'0.261','era':'4.04','recent5':'3승-2패-0무','nextOpponent':'롯데'},
        {'rank':7,'team':'NC','pct':'0.456','gb':'9.0','w':26,'d':1,'l':31,'g':58,'streak':'2승','batting':'0.273','era':'4.64','recent5':'4승-1패-0무','nextOpponent':'키움'},
        {'rank':8,'team':'SSG','pct':'0.448','gb':'9.5','w':26,'d':1,'l':32,'g':59,'streak':'1승','batting':'0.262','era':'5.32','recent5':'4승-1패-0무','nextOpponent':'LG'},
        {'rank':9,'team':'롯데','pct':'0.386','gb':'13.0','w':22,'d':1,'l':35,'g':58,'streak':'4패','batting':'0.254','era':'4.67','recent5':'0승-5패-0무','nextOpponent':'두산'},
        {'rank':10,'team':'키움','pct':'0.367','gb':'14.5','w':22,'d':1,'l':38,'g':61,'streak':'1승','batting':'0.232','era':'5.10','recent5':'1승-4패-0무','nextOpponent':'NC'},
    ]


def main():
    try:
        html = get_html()
        rows = parse_rows(html)
    except Exception as e:
        print('WARNING: failed to parse Naver standings:', e)
        rows = []
    if len(rows) < 10:
        print(f'WARNING: parsed only {len(rows)} rows. Using fallback rows.')
        rows = fallback_rows()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        'source': 'naver-sports-kbaseball-record',
        'source_url': URL,
        'updated_at': datetime.now(KST).strftime('%Y-%m-%d %H:%M:%S KST'),
        'rows': rows,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'Wrote {OUT} with {len(rows)} rows')


if __name__ == '__main__':
    main()
