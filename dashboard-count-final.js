(function(){
  var todayInfo=null,lastInfoLoad=0;
  function formatAvg(n){return !isFinite(n)?'-':(Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,''))}
  function setMetric(id,label,value,subText){
    var el=document.getElementById(id);if(!el)return;
    var card=el.closest('.metric');
    var labelEl=card&&card.querySelector('.label');
    var sub=card&&card.querySelector('.sub');
    if(labelEl&&labelEl.textContent!==label)labelEl.textContent=label;
    if(el.textContent!==value)el.textContent=value;
    if(sub&&sub.textContent!==subText)sub.textContent=subText;
  }
  function updateDashboardMetrics(){
    try{
      if(typeof state==='undefined'||!state.games||!state.gameMembers)return;
      var gamesById={},completedTickets=0,plannedTickets=0,completedGameIds={};
      state.games.forEach(function(g){gamesById[String(g.id)]=g});
      state.gameMembers.forEach(function(e){
        if(!e||!e.attended)return;
        var g=gamesById[String(e.game_id)];if(!g)return;
        if(g.status==='FINISHED'){completedTickets++;completedGameIds[String(g.id)]=true;}
        else if(g.status!=='POSTPONED'){plannedTickets++;}
      });
      var ticketText=completedTickets+'매';
      if(plannedTickets)ticketText+=' · 예정 '+plannedTickets+'매';
      var gameCount=Object.keys(completedGameIds).length;
      var avgText=gameCount?formatAvg(completedTickets/gameCount)+'명 / 경기':'-';
      setMetric('dashGames','누적 티켓 기여',ticketText,'전 회원 직관 체크 합산');
      setMetric('dashRate','경기당 평균 참석',avgText,'완료 직관 경기별 평균 인원');
      document.body.classList.add('eo-ticket-metrics-ready');
    }catch(e){console.warn(e)}
  }
  function todayYmd(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function todaySamsungGame(){
    if(typeof state==='undefined'||!state.games)return null;
    var today=todayYmd();
    return state.games.filter(function(g){return g.game_date===today&&g.status!=='POSTPONED'}).sort(function(a,b){return (a.game_time||'').localeCompare(b.game_time||'')})[0]||null;
  }
  function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function teamLogoHtml(team){try{return typeof teamLogo==='function'?teamLogo(team,'team-logo'):''}catch(e){return ''}}
  function pitcherText(info){
    if(!info||!info.gameId)return '선발투수 확인 중 · 30분마다 자동 갱신';
    var a=info.away||{},h=info.home||{};
    var away=a.team?`${a.team}: ${a.starter||'미공개'}`:'';
    var home=h.team?`${h.team}: ${h.starter||'미공개'}`:'';
    return ['선발투수',away,home].filter(Boolean).join(' · ');
  }
  async function loadTodayInfo(force){
    var now=Date.now();
    if(!force&&todayInfo&&now-lastInfoLoad<3*60*1000)return todayInfo;
    lastInfoLoad=now;
    try{
      var r=await fetch('data/today-game-info.json?t='+now,{cache:'no-store'});
      if(!r.ok)throw new Error('no data');
      todayInfo=await r.json();
    }catch(e){todayInfo={message:'오늘 경기 정보 파일을 불러오지 못했습니다.',lineups:{home:[],away:[]}}}
    return todayInfo;
  }
  function installLineupStyle(){
    if(document.getElementById('eoLineupStyle'))return;
    var s=document.createElement('style');s.id='eoLineupStyle';
    s.textContent='.today-game-clickable{cursor:pointer}.today-game-clickable:hover{transform:translateY(-1px);box-shadow:0 16px 36px rgba(7,76,161,.16)}.lineup-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.58);display:none;place-items:center;z-index:90;padding:18px}.lineup-modal-backdrop.show{display:grid}.lineup-modal{width:min(860px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.28);padding:22px}.lineup-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid #dce5f2;padding-bottom:14px;margin-bottom:14px}.lineup-head h3{margin:0;font-size:22px}.lineup-sub{color:#68758a;font-size:13px;margin-top:5px}.lineup-close{border:0;background:#eef4ff;color:#074ca1;font-weight:900;border-radius:12px;padding:9px 12px}.lineup-pitchers{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.lineup-pitcher{border:1px solid #dce5f2;background:#f8fbff;border-radius:14px;padding:12px;font-weight:900}.lineup-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.lineup-team{border:1px solid #dce5f2;border-radius:16px;overflow:hidden}.lineup-team h4{margin:0;background:#f1f6fd;padding:11px 13px}.lineup-row{display:grid;grid-template-columns:38px 1fr 58px;gap:8px;padding:10px 13px;border-top:1px solid #edf2f7;align-items:center}.lineup-row b{color:#074ca1}.lineup-empty{padding:18px;text-align:center;color:#68758a;background:#f8fbff;border-radius:14px}.lineup-source{margin-top:14px;font-size:12px;color:#68758a}.lineup-source a{color:#074ca1;font-weight:900}@media(max-width:720px){.lineup-grid,.lineup-pitchers{grid-template-columns:1fr}.lineup-modal{padding:18px;border-radius:18px}}';
    document.head.appendChild(s);
  }
  function ensureLineupModal(){
    installLineupStyle();
    var m=document.getElementById('todayLineupModal');
    if(m)return m;
    m=document.createElement('div');m.id='todayLineupModal';m.className='lineup-modal-backdrop';m.innerHTML='<div class="lineup-modal"><div class="lineup-head"><div><h3>오늘 경기 라인업</h3><div class="lineup-sub" id="todayLineupSubtitle">라인업 정보를 불러오는 중입니다.</div></div><button class="lineup-close" id="todayLineupClose">닫기</button></div><div id="todayLineupBody"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',function(e){if(e.target===m||e.target.id==='todayLineupClose')m.classList.remove('show')});
    return m;
  }
  function renderLineupList(rows){
    if(!rows||!rows.length)return '<div class="lineup-empty">라인업 발표 전입니다.<br>30분마다 자동 확인 중입니다.</div>';
    return rows.map(function(r){return `<div class="lineup-row"><b>${escHtml(r.order||'')}</b><span>${escHtml(r.name||'')}</span><em>${escHtml(r.position||'')}</em></div>`}).join('');
  }
  function renderLineupModal(info){
    var m=ensureLineupModal(),body=document.getElementById('todayLineupBody'),sub=document.getElementById('todayLineupSubtitle');
    var g=todaySamsungGame();
    var title=g?`${g.game_time?g.game_time.slice(0,5):''} ${g.home_away==='HOME'?'vs':'@'} ${g.opponent}`:(info&&info.gameId?info.gameId:'오늘 삼성 경기');
    sub.textContent=title+(info&&info.updatedAt?' · '+new Date(info.updatedAt).toLocaleString('ko-KR'):'');
    var away=info&&info.away?info.away:{team:g&&g.home_away==='AWAY'?'삼성':g?g.opponent:'원정',starter:''};
    var home=info&&info.home?info.home:{team:g&&g.home_away==='HOME'?'삼성':g?g.opponent:'홈',starter:''};
    var awayRows=info&&info.lineups?info.lineups.away:[];
    var homeRows=info&&info.lineups?info.lineups.home:[];
    body.innerHTML=`<div class="lineup-pitchers"><div class="lineup-pitcher">${escHtml(away.team||'원정')} 선발: ${escHtml(away.starter||'미공개')}</div><div class="lineup-pitcher">${escHtml(home.team||'홈')} 선발: ${escHtml(home.starter||'미공개')}</div></div><div class="lineup-grid"><div class="lineup-team"><h4>${escHtml(away.team||'원정')} 라인업</h4>${renderLineupList(awayRows)}</div><div class="lineup-team"><h4>${escHtml(home.team||'홈')} 라인업</h4>${renderLineupList(homeRows)}</div></div><div class="lineup-source">${info&&info.message?escHtml(info.message):'네이버 스포츠 기준 자동 수집'}${info&&info.sourcePreview?` · <a href="${escHtml(info.sourcePreview)}" target="_blank" rel="noopener">네이버 프리뷰 열기</a>`:''}</div>`;
  }
  async function openTodayLineup(){
    ensureLineupModal().classList.add('show');
    var info=await loadTodayInfo(true);
    renderLineupModal(info);
  }
  async function updateTodayGameCard(){
    var el=document.getElementById('dashNext');if(!el)return;
    var card=el.closest('.metric');if(!card)return;
    installLineupStyle();
    card.classList.add('today-game-clickable');
    if(!card.__lineupBound){card.__lineupBound=true;card.addEventListener('click',openTodayLineup)}
    var sub=card.querySelector('.sub');if(sub)sub.textContent='선발투수 확인 중 · 30분마다 자동 갱신';
    var info=await loadTodayInfo(false);
    if(sub)sub.textContent=pitcherText(info);
  }
  function patchRenderDashboard(){
    try{
      if(typeof window.renderDashboard==='function'&&!window.renderDashboard.__eoTicketPatched){
        var original=window.renderDashboard;
        window.renderDashboard=function(){var r=original.apply(this,arguments);updateDashboardMetrics();updateTodayGameCard();return r};
        window.renderDashboard.__eoTicketPatched=true;
      }
    }catch(e){console.warn(e)}
  }
  function loadPhotoFrame(){
    if(document.getElementById('eoPhotoFrameWidget'))return;
    var s=document.createElement('script');s.id='eoPhotoFrameWidget';s.src='photo-frame-widget.js?v=11';s.defer=true;document.head.appendChild(s);
  }
  function boot(){
    loadPhotoFrame();patchRenderDashboard();updateDashboardMetrics();updateTodayGameCard();
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics();updateTodayGameCard()},50);
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics();updateTodayGameCard()},250);
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics();updateTodayGameCard()},900);
    setInterval(updateDashboardMetrics,120);
    setInterval(updateTodayGameCard,30*60*1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();