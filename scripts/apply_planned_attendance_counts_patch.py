from pathlib import Path
import re

p = Path('index.html')
text = p.read_text(encoding='utf-8')

helper = """
function isActualWatchGame(g){return !!g&&g.status==='FINISHED'}
function isPlannedWatchGame(g){return !!g&&g.status==='SCHEDULED'}
function watchCountText(actual,planned){return `${actual}${planned?`(${planned})`:''}`}
"""
if 'function isActualWatchGame(g)' not in text:
    text = text.replace('function resultBadge(g){', helper + '\nfunction resultBadge(g){')

render_dashboard = """function renderDashboard(){
  const active=state.members.filter(x=>x.status==='active').length;
  const checkedEntries=state.gameMembers.filter(x=>x.attended);
  const actualIds=new Set();
  const plannedIds=new Set();
  checkedEntries.forEach(x=>{
    const g=state.games.find(gg=>gg.id===x.game_id);
    if(isActualWatchGame(g))actualIds.add(x.game_id);
    else if(isPlannedWatchGame(g))plannedIds.add(x.game_id);
  });
  const watchedGames=state.games.filter(g=>actualIds.has(g.id));
  const plannedGames=state.games.filter(g=>plannedIds.has(g.id));
  let w=0,l=0;
  watchedGames.forEach(g=>{if(g.result==='W')w++;if(g.result==='L')l++});
  qs('mActive').textContent=active;
  qs('mWatched').textContent=watchCountText(watchedGames.length,plannedGames.length);
  qs('mWinRate').textContent=(w+l)?`${Math.round(w/(w+l)*100)}%`:'0%';
  const today=toYmd(new Date());
  const tg=gamesOnDate(today)[0];
  qs('mToday').innerHTML=tg?gameLabelHtmlLogoRight(tg,'team-logo sm'):'경기 없음';
  qs('mTodaySub').textContent=tg?`${homeAwayText(tg.home_away)} · ${tg.stadium||'-'} · ${statusText(tg.status)}`:'오늘 날짜 기준';
  const ranks=buildRankings();
  renderRank('dashAttendRank',ranks.byAttend,'attendanceText','');
  renderRank('dashWinRank',ranks.byWins,'wins','회');
  renderRank('dashRateRank',ranks.byRate,'rateText','');
  renderDashboardSchedules();
  renderKboStandings()
}
"""
text = re.sub(r"function renderDashboard\(\)\{.*?\}\nfunction renderRank", render_dashboard + "function renderRank", text, count=1, flags=re.S)

build_rankings = """function buildRankings(){
  const rows=state.members.map(m=>{
    let attended=0,planned=0,wins=0,losses=0,draws=0;
    state.gameMembers.filter(x=>x.member_id===m.id&&x.attended).forEach(x=>{
      const g=state.games.find(gg=>gg.id===x.game_id);
      if(isActualWatchGame(g)){
        attended++;
        if(g?.result==='W')wins++;
        else if(g?.result==='L')losses++;
        else if(g?.result==='D')draws++;
      }else if(isPlannedWatchGame(g)){
        planned++;
      }
    });
    const denom=wins+losses;
    const rate=denom?wins/denom:0;
    return{id:m.id,name:m.name,attended,planned,attendanceText:watchCountText(attended,planned),wins,losses,draws,rate,rateText:denom?`${Math.round(rate*100)}%`:'-'}
  });
  return{
    rows,
    byAttend:[...rows].sort((a,b)=>b.attended-a.attended||b.planned-a.planned||a.name.localeCompare(b.name)),
    byWins:[...rows].sort((a,b)=>b.wins-a.wins||a.name.localeCompare(b.name)),
    byRate:[...rows].filter(r=>r.attended>0).sort((a,b)=>b.rate-a.rate||b.wins-a.wins)
  }
}
"""
text = re.sub(r"function buildRankings\(\)\{.*?\}\nfunction renderDashboardSchedules", build_rankings + "function renderDashboardSchedules", text, count=1, flags=re.S)

text = text.replace("renderRank('recordAttendRank',ranks.byAttend,'attended','회');", "renderRank('recordAttendRank',ranks.byAttend,'attendanceText','');")
text = text.replace("<td>${r.attended}</td><td>${r.wins}</td>", "<td>${r.attendanceText}</td><td>${r.wins}</td>")
text = text.replace("<th>회원</th><th>직관</th><th>승리요정</th><th>패</th><th>무</th><th>승률</th>", "<th>회원</th><th>직관(예정)</th><th>승리요정</th><th>패</th><th>무</th><th>승률</th>")
text = text.replace("직관 회원이 있는 경기", "완료 경기 기준, 괄호는 예정")

p.write_text(text, encoding='utf-8')
print('planned attendance count patch applied')
