(function(){
  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const REGULAR_SEASON_START={2025:'2025-03-22',2026:'2026-03-28'};
  const norm=(name)=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const esc2=(s)=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const logo=(team)=>typeof teamLogo==='function'?teamLogo(team,'team-logo') : '';
  const resultLabel=(v)=>v==='W'?'승':v==='L'?'패':v==='D'?'무':'-';

  function seasonStart(){
    const y=String((typeof state!=='undefined'&&state.year)||new Date().getFullYear());
    return REGULAR_SEASON_START[y]||`${y}-03-22`;
  }
  function gameDateKey(g){return `${String(g.game_date||'')} ${String(g.game_time||'')}`;}
  function toAllGameFromSamsung(g){
    if(!g)return null;
    const opp=norm(g.opponent);
    const isAway=g.home_away==='AWAY';
    return {
      game_date:g.game_date,
      game_time:g.game_time,
      away_team:isAway?'삼성':opp,
      home_team:isAway?opp:'삼성',
      stadium:g.stadium,
      status:g.status,
      away_score:g.status==='FINISHED'?(isAway?g.samsung_score:g.opponent_score):null,
      home_score:g.status==='FINISHED'?(isAway?g.opponent_score:g.samsung_score):null
    };
  }
  function allGames(){
    if(typeof state==='undefined')return [];
    const src=(state.allGames&&state.allGames.length)?state.allGames:(state.games||[]).map(toAllGameFromSamsung);
    const seen=new Set();
    const start=seasonStart();
    return (src||[]).filter(Boolean).map(g=>({
      ...g,
      away_team:norm(g.away_team),
      home_team:norm(g.home_team),
      away_score:g.away_score===''||g.away_score==null?null:Number(g.away_score),
      home_score:g.home_score===''||g.home_score==null?null:Number(g.home_score)
    })).filter(g=>{
      if(!g.game_date||String(g.game_date)<start)return false;
      const statusText=String(g.status||'').toUpperCase();
      const sourceText=String(g.source||'')+' '+String(g.raw_status||'')+' '+String(g.note||'');
      if(/PRESEASON|EXHIBITION|시범/.test(statusText+' '+sourceText.toUpperCase()))return false;
      const key=[g.game_date,g.game_time||'',g.away_team,g.home_team,g.away_score,g.home_score,g.status].join('|');
      if(seen.has(key))return false;
      seen.add(key);
      return TEAMS.includes(g.away_team)&&TEAMS.includes(g.home_team);
    }).sort((a,b)=>gameDateKey(a).localeCompare(gameDateKey(b)));
  }
  function finishedGames(){
    return allGames().filter(g=>g.status==='FINISHED'&&Number.isFinite(g.away_score)&&Number.isFinite(g.home_score));
  }
  function scheduledGames(){
    const today=new Date();
    const ymd=typeof toYmd==='function'?toYmd(today):today.toISOString().slice(0,10);
    return allGames().filter(g=>g.status!=='FINISHED'&&String(g.game_date||'')>=ymd).sort((a,b)=>gameDateKey(a).localeCompare(gameDateKey(b)));
  }
  function gameResultFor(g,team){
    const away=norm(g.away_team),home=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);
    if(away!==team&&home!==team)return null;
    if(as===hs)return 'D';
    const win=as>hs?away:home;
    return win===team?'W':'L';
  }
  function nextOpponentFor(team){
    const g=scheduledGames().find(x=>x.away_team===team||x.home_team===team);
    if(!g)return '';
    return g.away_team===team?g.home_team:g.away_team;
  }
  function buildRows(){
    const rows=Object.fromEntries(TEAMS.map(t=>[t,{team:t,g:0,w:0,d:0,l:0,pct:0,gb:0,streak:'-',recent5:'-',nextOpponent:''}]));
    const games=finishedGames();
    for(const g of games){
      const away=norm(g.away_team),home=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);
      if(!rows[away]||!rows[home])continue;
      rows[away].g++;rows[home].g++;
      if(as>hs){rows[away].w++;rows[home].l++}
      else if(as<hs){rows[home].w++;rows[away].l++}
      else{rows[away].d++;rows[home].d++}
    }
    let arr=Object.values(rows);
    arr.forEach(r=>{const denom=r.w+r.l;r.pct=denom?r.w/denom:0;});
    arr.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.l-b.l||a.team.localeCompare(b.team));
    const leader=arr[0]||{w:0,l:0};
    arr.forEach((r,i)=>{r.gb=i===0?0:((leader.w-r.w)+(r.l-leader.l))/2;});
    arr.forEach(r=>{
      const results=[];
      for(let i=games.length-1;i>=0;i--){const res=gameResultFor(games[i],r.team);if(res)results.push(res);}
      let type=results[0]||'',cnt=0;
      for(const res of results){if(res===type)cnt++;else break;}
      r.streak=cnt?`${cnt}${resultLabel(type)}`:'-';
      const last=results.slice(0,5);
      const w=last.filter(x=>x==='W').length,l=last.filter(x=>x==='L').length,d=last.filter(x=>x==='D').length;
      r.recent5=last.length?`${w}승-${l}패-${d}무`:'-';
      r.nextOpponent=nextOpponentFor(r.team);
    });
    let rank=0,prev='';
    arr.forEach((r,i)=>{const key=`${r.pct.toFixed(3)}|${r.w}|${r.l}`;if(key!==prev)rank=i+1;r.rank=rank;prev=key;});
    return arr;
  }
  function renderGameBased(){
    const rows=buildRows();
    const totalGames=finishedGames().length;
    if(!rows.some(r=>r.g>0))return '<div class="empty">순위 계산에 필요한 전체 경기 결과가 아직 없습니다. KBO 일정 동기화를 먼저 실행해 주세요.</div>';
    return `<table class="kbo-standings-table eo-standings-full eo-game-standings"><thead><tr><th>순위</th><th>팀명</th><th>승률</th><th>게임차</th><th>승</th><th>무</th><th>패</th><th>경기</th><th>연속</th><th>타율</th><th>평균자책</th><th>최근5경기</th><th>다음경기</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td class="rank-num">${r.rank}</td><td class="team-cell"><div class="team-cell-inner">${logo(r.team)}<span>${esc2(r.team)}</span></div></td><td class="pct">${r.pct.toFixed(3)}</td><td>${r.gb===0?'0.0':r.gb.toFixed(1)}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.g}</td><td>${esc2(r.streak)}</td><td>-</td><td>-</td><td>${esc2(r.recent5)}</td><td class="next-cell">${r.nextOpponent?`${logo(r.nextOpponent)}<span>${esc2(r.nextOpponent)}</span>`:'-'}</td></tr>`).join('')}</tbody></table><div class="eo-standings-foot"><span>KBO 정규리그 경기 결과 기반 자동 계산 · 반영 경기 ${totalGames}건 · 시작일 ${seasonStart()}</span><a href="https://sports.news.naver.com/kbaseball/record/index" target="_blank" rel="noopener">전체보기</a></div>`;
  }
  function render(){
    const root=document.getElementById('kboStandings');if(!root)return;
    root.innerHTML=renderGameBased();
    const note=document.querySelector('.kbo-standings-head .note');
    if(note)note.textContent='KBO 정규리그 경기 결과 기반 자동 계산';
  }
  function install(){
    window.buildKboStandings=buildRows;
    window.renderKboStandings=render;
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setInterval(render,5*60*1000);
})();
