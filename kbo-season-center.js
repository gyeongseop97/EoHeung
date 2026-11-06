(function() {
  'use strict';
  const S=window.EoSeason;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const logo=team=>typeof teamLogo==='function'?teamLogo(team,'team-logo'):'';
  const getState=()=>typeof state!=='undefined'?state:{};
  let year=Number(S.today().slice(0,4)),fingerprint='',loading=false,loadFailed=false;
  function allGames(){const st=getState();return [...(st.allGames||[]),...(st.games||[]).map(S.fromSamsung)];}
  function place(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    let row=document.getElementById('kboPostseasonRow');
    if(!row){row=document.createElement('div');row.id='kboPostseasonRow';dashboard.appendChild(row);}
    const center=document.getElementById('seasonCenter'),trend=document.getElementById('kboRankTrendCard');
    if(center&&center.parentElement!==row)row.prepend(center);
    if(trend&&trend.parentElement!==row)row.appendChild(trend);
  }
  function ensure(){
    if(!document.getElementById('dashboard'))return null;
    let center=document.getElementById('seasonCenter');
    if(!center){
      center=document.createElement('section');center.id='seasonCenter';center.className='card season-center';
      center.setAttribute('aria-labelledby','seasonTitle');
      center.innerHTML='<div class="season-heading"><div><span class="season-eyebrow">ROAD TO THE CHAMPIONSHIP</span><h3 id="seasonTitle">포스트시즌 대진표</h3></div><div class="season-controls"><select id="seasonYear" aria-label="시즌 연도"></select><span id="seasonPhase" class="season-phase"></span></div></div><div id="seasonBody" aria-busy="true"></div>';
      document.getElementById('dashboard').appendChild(center);
      center.addEventListener('change',event=>{
        if(event.target.id!=='seasonYear')return;
        year=Number(event.target.value);getState().year=year;
        if(typeof syncSelects==='function')syncSelects();
        window.renderKboStandings?.();window.renderKboRankTrend?.();loadSeason();
      });
      center.addEventListener('click',event=>{if(event.target.closest('[data-season-retry]'))loadSeason(true);});
    }
    place();return center;
  }
  function stadium(value){return String(value||'구장 미정').replace('대구 삼성 라이온즈 파크','대구').replace('포항 야구장','포항').replace('고척스카이돔','고척');}
  function matchHtml(game){
    const finished=S.isFinished(game),postponed=game.status==='POSTPONED',cancelled=game.status==='CANCELLED';
    const status=cancelled?'취소':postponed?'연기':game.unnecessary?'미개최':finished?'종료':game.conditional?'필요 시':'예정';
    const winner=finished&&game.away_score!==game.home_score?(Number(game.away_score)>Number(game.home_score)?game.away_team:game.home_team):'';
    const score=finished?`<strong class="bracket-score"><span class="${winner===game.away_team?'won':''}">${esc(game.away_score)}</span><i>:</i><span class="${winner===game.home_team?'won':''}">${esc(game.home_score)}</span></strong>`:`<span class="bracket-start">${esc((game.game_time||'').slice(0,5)||'미정')}</span>`;
    const date=game.game_date?`${Number(game.game_date.slice(5,7))}.${game.game_date.slice(8,10)}`:'미정';
    const full=`${game.game_number}차전 ${game.game_date} ${game.away_team} ${finished?game.away_score+' 대 '+game.home_score:'대'} ${game.home_team}, ${stadium(game.stadium)}, ${status}`;
    return `<li class="bracket-game ${game.unnecessary?'is-unnecessary':''} ${postponed||cancelled?'is-postponed':''}" title="${esc(full)}"><div class="bracket-game-line"><b>${game.game_number}차전</b><time datetime="${esc(game.game_date)}">${date}</time>${score}</div><div class="bracket-game-meta"><span>${esc(stadium(game.stadium))}</span><span>${status}${winner?' · '+esc(winner)+' 승':''}</span></div></li>`;
  }
  function roundHtml(stage,index){
    const names=stage.teams.map(t=>`${esc(t)} <b>${stage.wins[t]||0}</b>`).join('<span class="bracket-versus">:</span>');
    const title=stage.winner?`${stage.winner} ${stage.id==='KS'?'우승':'진출'}`:stage.games.length?'진행 중':'대진 미정';
    const format=stage.id==='WC'?'최대 2경기':`${stage.target*2-1}전 ${stage.target}선승`;
    return `<section class="bracket-round round-${index} ${stage.winner?'is-decided':''}" aria-label="${esc(stage.name)}"><div class="bracket-round-title"><h4>${esc(stage.name)}</h4><small>${format}</small></div><div class="bracket-series-score">${names||'공식 발표 예정'}</div><ol class="bracket-games">${stage.games.length?stage.games.map(matchHtml).join(''):'<li class="bracket-pending">일정 발표 전</li>'}</ol><div class="bracket-round-result">${esc(title)}</div></section>`;
  }
  function seedHtml(summary,rank,index){
    const row=summary.season?.standings.find(r=>r.rank===rank),team=row?.team;
    const eliminated=team&&summary.stages.some(s=>s.winner&&s.winner!==team&&s.teams.includes(team));
    const final=summary.finalStandings?.find(r=>r.team===team)?.rank;
    return `<div class="bracket-seed seed-${index} ${team==='삼성'?'is-samsung':''} ${eliminated?'is-eliminated':''}"><span class="bracket-seed-rank">정규 ${rank}위</span><div class="bracket-seed-logo">${team?logo(team):'<span>?</span>'}</div><b>${esc(team||'미정')}</b>${final?`<small>최종 ${final}위</small>`:''}</div>`;
  }
  function finalTable(summary){
    if(!summary.finalStandings)return '';
    return `<details class="season-final-ranking"><summary>시즌 최종 순위 전체보기</summary><div class="season-final-grid">${summary.finalStandings.map(r=>`<div class="${r.team==='삼성'?'is-samsung':''}"><b>${r.rank}</b>${logo(r.team)}<span>${esc(r.team)}</span><small>정규 ${r.regular_rank}위</small></div>`).join('')}</div></details>`;
  }
  function render(force=false){
    const center=ensure();if(!center)return;
    const summary=S.summary(allGames(),year),serialized=JSON.stringify([year,summary,loading,loadFailed]);
    if(!force&&serialized===fingerprint)return;fingerprint=serialized;
    const current=Number(S.today().slice(0,4));
    const years=[...new Set([current,current-1,...allGames().map(g=>Number(String(g.game_date).slice(0,4))),year])].filter(y=>y>=2020&&y<=current+1).sort((a,b)=>b-a);
    center.querySelector('#seasonYear').innerHTML=years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}년</option>`).join('');
    center.querySelector('#seasonTitle').textContent=`${year} 포스트시즌 대진표`;
    center.querySelector('#seasonPhase').textContent=summary.champion?'시즌 종료':summary.post.length?'가을야구':summary.regularComplete?'정규시즌 종료':'정규시즌';
    const body=center.querySelector('#seasonBody');body.setAttribute('aria-busy',String(loading));
    const champion=summary.champion?`<div class="bracket-champion"><span aria-hidden="true">🏆</span> ${logo(summary.champion)}<b>${esc(summary.champion)}</b><span>한국시리즈 우승</span></div>`:'';
    // The five seeded teams share a baseline; each rail carries its survivor
    // into the next round, following the familiar KBO postseason ladder.
    const rails=`<div class="bracket-wordmark" aria-hidden="true"><small>${year} KBO</small><b>POST<br>SEASON</b><i></i></div><svg class="bracket-rails" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true"><path class="rail-wc" d="M60 510V355Q60 345 70 345H240Q250 345 250 355V510"/><path class="rail-semi" d="M155 345V230Q155 220 165 220H430Q440 220 440 230V510"/><path class="rail-po" d="M345 220V105Q345 95 355 95H620Q630 95 630 105V510"/><path class="rail-ks" d="M535 95V20Q535 10 545 10H810Q820 10 820 20V510"/></svg>`;
    body.innerHTML=`${loadFailed?'<div class="season-load-note" role="status">최근 저장된 기록을 표시합니다. <button type="button" data-season-retry>다시 불러오기</button></div>':''}${champion}<div class="bracket-key"><span>원정 <b>점수 : 점수</b> 홈</span><span>종료 경기의 승리 팀을 강조합니다</span></div><div class="bracket-scroll" tabindex="0" aria-label="포스트시즌 대진표. 작은 화면에서는 좌우로 이동할 수 있습니다."><div class="bracket-canvas">${rails}${summary.stages.map(roundHtml).join('')}${[5,4,3,2,1].map((r,i)=>seedHtml(summary,r,i)).join('')}</div></div><div class="bracket-note"><span>와일드카드: 4위는 1승 또는 1무, 5위는 2승 시 진출</span><span>우천 연기와 필요 시 경기는 공식 편성을 따릅니다.</span></div>${finalTable(summary)}<div class="season-footer"><span>${loading?'자료 확인 중':summary.season?'KBO 공식 · '+esc(summary.season.updated_at?.replace('T',' ').slice(0,16))+' 기준':'공식 일정 발표 후 표시됩니다'}</span><a href="https://www.koreabaseball.com/Schedule/Schedule.aspx" target="_blank" rel="noopener">공식 일정 ↗</a></div>`;
  }
  async function loadSeason(force=false){
    const requested=year;loading=true;loadFailed=false;render(true);
    const data=await S.load(requested,force);if(requested!==year)return;
    loading=false;loadFailed=!data;render(true);
    window.renderKboStandings?.();window.renderKboRankTrend?.();
    if(typeof renderCalendar==='function')renderCalendar();place();
  }
  function install(){
    window.placeSeasonBracket=place;window.renderSeasonCenter=render;
    document.getElementById('yearSelect')?.addEventListener('change',event=>{year=Number(event.target.value);loadSeason();});
    render();loadSeason();setInterval(()=>loadSeason(true),5*60*1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
