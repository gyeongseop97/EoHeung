from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

supabase_script = '  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
link = '  <link rel="stylesheet" href="kbo-standings-homeaway.css" />'
if 'kbo-standings-homeaway.css' not in text:
    text = text.replace(supabase_script, supabase_script + '\n' + link)

dashboard_marker = '<div class="dashboard-grid"><div class="card pad"><h3>삼성 최근/향후 7일 경기 + 예상 날씨</h3>'
standings_html = '<div class="card pad kbo-standings-card"><div class="kbo-standings-head"><h3>KBO 팀 순위</h3><p class="note">전체 경기 결과 기준 자동 계산</p></div><div id="kboStandings" class="kbo-standings-wrap"></div></div>'
if 'id="kboStandings"' not in text and dashboard_marker in text:
    text = text.replace(dashboard_marker, standings_html + dashboard_marker)

standings_js = r'''
function teamCodeName(name){const raw=String(name||'').trim();const map={'삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','두산':'두산','한화':'한화','롯데':'롯데','키움':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw}
function buildKboStandings(){
  const teams=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const rows=Object.fromEntries(teams.map(t=>[t,{team:t,w:0,l:0,d:0,g:0,pct:0,gb:0,streak:''}]));
  const sortedGames=(state.allGames.length?state.allGames:state.games.map(samsungToAllGame)).filter(g=>g.status==='FINISHED'&&g.away_score!=null&&g.home_score!=null).sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')));
  for(const g of sortedGames){
    const away=teamCodeName(g.away_team),home=teamCodeName(g.home_team);
    if(!rows[away]||!rows[home])continue;
    rows[away].g++;rows[home].g++;
    if(Number(g.away_score)>Number(g.home_score)){rows[away].w++;rows[home].l++}
    else if(Number(g.away_score)<Number(g.home_score)){rows[home].w++;rows[away].l++}
    else{rows[away].d++;rows[home].d++}
  }
  let arr=Object.values(rows);
  arr.forEach(r=>{const denom=r.w+r.l;r.pct=denom?r.w/denom:0});
  arr.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.team.localeCompare(b.team));
  const leader=arr[0]||{w:0,l:0};
  arr.forEach((r,i)=>{r.rank=i+1;r.gb=((leader.w-r.w)+(r.l-leader.l))/2;if(i===0)r.gb=0});
  arr.forEach(r=>{
    let streakType='',count=0;
    for(let i=sortedGames.length-1;i>=0;i--){
      const g=sortedGames[i];const away=teamCodeName(g.away_team),home=teamCodeName(g.home_team);
      if(away!==r.team&&home!==r.team)continue;
      let cur='D';
      if(Number(g.away_score)>Number(g.home_score))cur=away===r.team?'W':'L';
      else if(Number(g.away_score)<Number(g.home_score))cur=home===r.team?'W':'L';
      if(!streakType){streakType=cur;count=1}else if(streakType===cur)count++;else break;
    }
    r.streak=count?`${count}${streakType==='W'?'승':streakType==='L'?'패':'무'}`:'-';
  });
  let displayRank=0,prevKey='';
  arr.forEach((r,i)=>{const key=`${r.pct.toFixed(3)}|${r.w}|${r.l}`;if(key!==prevKey)displayRank=i+1;r.rank=displayRank;prevKey=key});
  return arr;
}
function renderKboStandings(){
  const root=qs('kboStandings');if(!root)return;
  const rows=buildKboStandings();
  if(!rows.some(r=>r.g>0)){root.innerHTML='<div class="empty">순위 계산에 필요한 전체 경기 결과가 아직 없습니다.</div>';return}
  root.innerHTML=`<table class="kbo-standings-table"><thead><tr><th>순위</th><th>팀</th><th>승률</th><th>게임차</th><th>승</th><th>무</th><th>패</th><th>경기</th><th>연속</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td class="rank-num">${r.rank}</td><td class="team-cell"><div class="team-cell-inner">${teamLogo(r.team,'team-logo')}<span>${esc(r.team)}</span></div></td><td class="pct">${r.pct.toFixed(3)}</td><td>${r.gb===0?'0.0':r.gb.toFixed(1)}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.g}</td><td>${r.streak}</td></tr>`).join('')}</tbody></table>`;
}
'''
if 'function renderKboStandings()' not in text:
    text = text.replace('function renderDashboard(){', standings_js + '\nfunction renderDashboard(){')

if 'renderKboStandings()' not in text.split('function renderDashboard(){', 1)[1].split('function renderRank', 1)[0]:
    text = text.replace('renderDashboardSchedules()}', 'renderDashboardSchedules();renderKboStandings()}')

old_chip = "html+=`<span class=\"game-chip ${g.status==='FINISHED'?'finished':''} ${r} ${g.status==='POSTPONED'?'postponed':''}\">${gameChipHtml(g)}</span>`"
new_chip = "html+=`<span class=\"game-chip ${g.home_away==='HOME'?'home-tag':'away-tag'} ${g.status==='FINISHED'?'finished':''} ${r} ${g.status==='POSTPONED'?'postponed':''}\">${gameChipHtml(g)}</span>`"
if old_chip in text:
    text = text.replace(old_chip, new_chip)

p.write_text(text, encoding='utf-8')
print('standings/home-away patch applied')
