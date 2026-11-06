(function() {
  'use strict';
  const S = window.EoSeason;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let year = Number(S.today().slice(0,4));
  let selectedRound = 'ALL';
  let fingerprint = '';
  let loading = false;
  let loadFailed = false;
  let selectLatest = true;
  let ranking = 'regular';
  const phaseLabels = {REGULAR:'정규시즌',REGULAR_COMPLETE:'정규시즌 종료',POSTSEASON:'포스트시즌',COMPLETE:'시즌 종료'};
  const logo = team => typeof teamLogo === 'function' ? teamLogo(team,'team-logo') : '';
  const getState = () => typeof state !== 'undefined' ? state : {};
  function allGames() {
    const st = getState();
    return [...(st.allGames || []),...(st.games || []).map(S.fromSamsung)];
  }
  function ensure() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return null;
    let center = document.getElementById('seasonCenter');
    if (center) return center;
    center = document.createElement('div');
    center.id = 'seasonCenter';
    center.className = 'card season-center';
    center.innerHTML = `<div class="season-heading"><div><span class="season-eyebrow">KBO SEASON</span><h3 id="seasonTitle">시즌 기록</h3><p id="seasonSubtitle"></p></div><div class="season-controls"><label>시즌 <select id="seasonYear" aria-label="시즌 연도"></select></label><span id="seasonPhase" class="season-phase"></span></div></div><div id="seasonBody" aria-busy="true"></div>`;
    dashboard.prepend(center);
    center.addEventListener('change', event => {
      if (event.target.id !== 'seasonYear') return;
      year = Number(event.target.value);
      selectedRound = 'ALL';
      selectLatest = true;ranking = 'regular';
      getState().year = year;
      if (typeof syncSelects === 'function') syncSelects();
      window.renderKboStandings?.();
      window.renderKboRankTrend?.();
      loadSeason();
    });
    center.addEventListener('click', event => {
      const round = event.target.closest('[data-season-round]');
      if (round) {selectedRound = round.dataset.seasonRound;selectLatest=false;render(true);return;}
      const rank=event.target.closest('[data-season-ranking]');
      if(rank){ranking=rank.dataset.seasonRanking;render(true);return;}
      if (event.target.closest('[data-season-retry]')) loadSeason(true);
    });
    return center;
  }
  function standingsHtml(summary) {
    const isFinal=ranking==='final'&&summary.finalStandings;
    const rows = isFinal?summary.finalStandings:(summary.season?.standings || []);
    if (!rows.length) return `<div class="season-empty">${loading?'공식 순위를 불러오는 중입니다.':'이 시즌의 공식 순위가 아직 등록되지 않았습니다.'}</div>`;
    const title = isFinal?'시즌 최종 순위':summary.regularComplete ? '정규시즌 최종 순위' : '정규시즌 순위';
    const tabs=summary.finalStandings?`<div class="season-tabs" role="group" aria-label="순위 기준"><button type="button" data-season-ranking="final" aria-pressed="${!!isFinal}">시즌 최종</button><button type="button" data-season-ranking="regular" aria-pressed="${!isFinal}">정규시즌</button></div>`:'';
    return `<div class="season-rank"><div class="season-section-head"><h4>${title}</h4><span>${isFinal?'포스트시즌 결과 반영':summary.regularComplete?'포스트시즌 성적 제외':'진행 중'}</span></div>${tabs}<div class="season-table-scroll"><table class="season-table"><caption class="season-sr-only">${year}년 ${title} · 승무패는 정규시즌 성적</caption><thead><tr><th scope="col">순위</th><th scope="col">팀</th><th scope="col">경기</th><th scope="col">승</th><th scope="col">무</th><th scope="col">패</th><th scope="col">승률</th></tr></thead><tbody>${rows.map(row => `<tr class="${row.team==='삼성'?'season-samsung':''}"><td>${esc(row.rank)}</td><th scope="row">${logo(row.team)}${esc(row.team)}</th><td>${esc(row.g)}</td><td>${esc(row.w)}</td><td>${esc(row.d)}</td><td>${esc(row.l)}</td><td>${Number(row.pct).toFixed(3)}</td></tr>`).join('')}</tbody></table></div>${isFinal?'<p class="season-rule">최종 순위는 포스트시즌 결과, 승·무·패·승률은 정규시즌 기록입니다.</p>':''}</div>`;
  }
  function status(game) {
    if (game.status==='CANCELLED') return '취소';
    if (game.status==='POSTPONED') return '우천 연기';
    if (S.isFinished(game)) return '종료';
    if (game.unnecessary) return '미개최';
    return game.conditional ? '필요 시' : '예정';
  }
  function gameHtml(game) {
    const finished = S.isFinished(game);
    const label = status(game);
    const score = finished ? `${game.away_score}<span>:</span>${game.home_score}` : '<span>VS</span>';
    return `<li class="season-match ${game.unnecessary?'season-unnecessary':''}"><div class="season-match-date"><b>${esc(game.game_date.slice(5).replace('-','.'))}</b><span>${esc((game.game_time || '').slice(0,5) || '시간 미정')} · ${game.game_number?esc(game.game_number)+'차전':'차전 미정'}</span></div><div class="season-match-teams"><span>${logo(game.away_team)}${esc(game.away_team)}</span><strong class="season-score">${score}</strong><span>${logo(game.home_team)}${esc(game.home_team)}</span></div><div class="season-match-meta"><span>${esc(game.stadium || '구장 미정')}</span><b class="season-status ${finished?'is-finished':''}">${label}</b></div></li>`;
  }
  function roundHtml(stage) {
    const title = stage.winner ? `${stage.winner} ${stage.id==='KS'?'우승':'진출'}` : stage.games.length ? '시리즈 진행' : '대진 미정';
    const record = stage.teams.map(team => `${esc(team)} ${stage.wins[team]}승`).join(' · ') + (stage.draws ? ` · ${stage.draws}무` : '');
    return `<section class="season-series"><div class="season-section-head"><div><h4>${esc(stage.name)}</h4><p>${record || '공식 일정 발표 후 표시됩니다.'}</p></div><span class="season-series-result ${stage.winner?'is-clinched':''}">${esc(title)}</span></div>${stage.id==='WC'&&stage.games.length?'<p class="season-rule">4위 팀은 1승 또는 1무, 5위 팀은 2승 시 진출</p>':''}${stage.games.length?`<ol class="season-match-list">${stage.games.map(gameHtml).join('')}</ol>`:'<div class="season-empty">아직 발표된 일정이 없습니다.</div>'}</section>`;
  }
  function render(force = false) {
    const center = ensure();
    if (!center) return;
    const summary = S.summary(allGames(),year);
    const serialized = JSON.stringify([year,selectedRound,ranking,summary,loading,loadFailed]);
    if (!force && serialized===fingerprint) return;
    fingerprint = serialized;
    const current = Number(S.today().slice(0,4));
    const years = [...new Set([current,current-1,...allGames().map(g => Number(String(g.game_date).slice(0,4))),year])].filter(y => y>=2020 && y<=current+1).sort((a,b)=>b-a);
    const select = center.querySelector('#seasonYear');
    select.innerHTML = years.map(y => `<option value="${y}" ${y===year?'selected':''}>${y}년</option>`).join('');
    center.querySelector('#seasonTitle').textContent = `${year} 시즌 ${summary.regularComplete?'최종 순위와 포스트시즌':'순위와 포스트시즌'}`;
    center.querySelector('#seasonSubtitle').textContent = summary.champion ? `${summary.champion}, 한국시리즈 우승` : summary.regularComplete ? '정규시즌 기록과 가을야구의 모든 순간을 한곳에서 확인하세요.' : '정규시즌부터 가을야구까지, 시즌의 흐름을 확인하세요.';
    center.querySelector('#seasonPhase').textContent = phaseLabels[summary.phase];
    const body = center.querySelector('#seasonBody');
    body.setAttribute('aria-busy',String(loading));
    const champion = summary.champion ? `<div class="season-champion"><span aria-hidden="true">🏆</span><div><small>${year} KOREAN SERIES CHAMPION</small><strong>${logo(summary.champion)}${esc(summary.champion)}</strong></div><span>한국시리즈 우승</span></div>` : '';
    const postseason = `<div class="season-post"><div class="season-section-head"><h4>포스트시즌 일정 · 결과</h4><span>원정 : 홈</span></div><div class="season-tabs" role="group" aria-label="포스트시즌 라운드"><button type="button" data-season-round="ALL" aria-pressed="${selectedRound==='ALL'}">전체</button>${S.rounds.map(r => `<button type="button" data-season-round="${r.id}" aria-pressed="${selectedRound===r.id}">${r.name}</button>`).join('')}</div>${!summary.post.length?'<div class="season-empty">포스트시즌 일정이 아직 발표되지 않았습니다.<br>공식 일정이 등록되면 이곳에서 볼 수 있습니다.</div>':summary.stages.filter(r => selectedRound==='ALL'||r.id===selectedRound).map(roundHtml).join('')}</div>`;
    body.innerHTML = `${loadFailed?'<div class="season-load-note" role="status">공식 시즌 데이터를 불러오지 못했습니다. 저장된 경기만 표시합니다. <button type="button" data-season-retry>다시 불러오기</button></div>':''}${champion}<div class="season-columns">${standingsHtml(summary)}${postseason}</div><div class="season-footer"><span>${summary.season?'KBO 공식'+(summary.season.standings_method==='official_results_verified'?' 경기 결과 집계':'')+' · '+esc(summary.season.updated_at?.replace('T',' ').slice(0,16))+' 기준':'공식 데이터 확인 중'}${summary.regularComplete?' · 정규시즌 순위 확정':''}</span><a href="https://www.koreabaseball.com/Schedule/Schedule.aspx" target="_blank" rel="noopener">공식 일정 ↗</a></div>`;
  }
  async function loadSeason(force = false) {
    const requestedYear = year;
    loading = true;loadFailed = false;render(true);
    const data = await S.load(requestedYear,force);
    if (requestedYear!==year) return;
    if (selectLatest && data) {
      const info=S.summary(allGames(),year);
      selectedRound=[...info.stages].reverse().find(stage=>stage.games.some(g=>S.isFinished(g)||g.game_date<=S.today()))?.id || 'ALL';
      if(info.finalStandings)ranking='final';
      selectLatest=false;
    }
    loading = false;loadFailed = !data;render(true);
    window.renderKboStandings?.();
    window.renderKboRankTrend?.();
    if (typeof renderCalendar==='function') renderCalendar();
  }
  function install() {
    window.renderSeasonCenter = render;
    document.getElementById('yearSelect')?.addEventListener('change',event => {
      year = Number(event.target.value);selectedRound='ALL';selectLatest=true;ranking='regular';loadSeason();
    });
    render();loadSeason();
    setInterval(() => loadSeason(true),5*60*1000);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
