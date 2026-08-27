(function(){
  'use strict';

  const POLL_MS=10*60*1000;
  const REFRESH_DELAY_MS=150*60*1000;
  const REFRESH_LIMIT_MS=540*60*1000;
  const TERMINAL=new Set(['FINISHED','POSTPONED','CANCELLED']);
  let refreshing=false;
  let realtimeChannel=null;
  let labelObserver=null;
  let rankTrendObserver=null;

  function loadKboRecordsModule(){
    if(document.getElementById('eoKboRecordsModule'))return;
    const s=document.createElement('script');
    s.id='eoKboRecordsModule';
    s.src='kbo-records.js?v=1';
    s.defer=true;
    document.head.appendChild(s);
  }

  function loadKboRecordsEnhancement(){
    if(document.getElementById('eoKboRecordsSortable'))return;
    const s=document.createElement('script');
    s.id='eoKboRecordsSortable';
    s.src='kbo-records-table-enhancement.js?v=20260827-1';
    s.defer=true;
    document.head.appendChild(s);
  }

  function loadKboAdvancedRecordsModule(){
    if(document.getElementById('eoKboAdvancedRecordsModule'))return;
    const s=document.createElement('script');
    s.id='eoKboAdvancedRecordsModule';
    s.src='kbo-advanced-records.js?v=20260826-2';
    s.defer=true;
    document.head.appendChild(s);
  }

  function loadKboSituationalRecordsModule(){
    if(document.getElementById('eoKboSituationalRecordsModule'))return;
    const s=document.createElement('script');
    s.id='eoKboSituationalRecordsModule';
    s.src='kbo-situational-records.js?v=20260827-1';
    s.defer=true;
    document.head.appendChild(s);
  }

  function startTime(game){
    const date=String(game&&game.game_date||'').slice(0,10);
    const time=String(game&&game.game_time||'').slice(0,5);
    if(!date||time.length!==5)return null;
    const value=new Date(`${date}T${time}:00+09:00`);
    return Number.isNaN(value.getTime())?null:value;
  }

  function resultWindowOpen(){
    if(typeof state==='undefined')return false;
    const now=Date.now();
    const games=[...(state.allGames||[]),...(state.games||[])];
    return (games||[]).some(game=>{
      if(TERMINAL.has(String(game.status||'').toUpperCase()))return false;
      const start=startTime(game);
      if(!start)return false;
      const elapsed=now-start.getTime();
      return elapsed>=REFRESH_DELAY_MS&&elapsed<=REFRESH_LIMIT_MS;
    });
  }

  function fingerprint(rows,allRows){
    const shape=row=>[row.id||row.source_key,row.status,row.samsung_score,row.opponent_score,row.away_score,row.home_score,row.result].join(':');
    return [...(rows||[]).map(shape),...(allRows||[]).map(shape)].join('|');
  }

  async function refreshResults(force){
    if(refreshing||typeof state==='undefined'||!state.client||!state.user)return;
    if(!force&&!resultWindowOpen())return;
    refreshing=true;
    try{
      const before=fingerprint(state.games,state.allGames);
      const [gamesResult,allGamesResult]=await Promise.all([
        state.client.from('games').select('*').order('game_date'),
        state.client.from('kbo_all_games').select('*').order('game_date')
      ]);
      if(gamesResult.error)return;
      state.games=gamesResult.data||[];
      if(!allGamesResult.error)state.allGames=allGamesResult.data||[];
      const after=fingerprint(state.games,state.allGames);
      if(before!==after&&typeof renderAll==='function'){
        renderAll();
        if(typeof renderWeatherForUpcoming==='function')renderWeatherForUpcoming();
      }
    }finally{
      refreshing=false;
    }
  }

  function subscribeRealtime(){
    if(typeof state==='undefined'||!state.client||realtimeChannel)return;
    try{
      realtimeChannel=state.client.channel('eoheung-kbo-result-refresh')
        .on('postgres_changes',{event:'*',schema:'public',table:'games'},()=>refreshResults(true))
        .on('postgres_changes',{event:'*',schema:'public',table:'kbo_all_games'},()=>refreshResults(true))
        .subscribe();
    }catch(error){
      realtimeChannel=null;
    }
  }

  function patchLineupRefreshLabels(){
    document.querySelectorAll('.lineup-empty,.metric .sub').forEach(el=>{
      if(el.textContent&&el.textContent.includes('30분마다')){
        el.textContent=el.textContent.replace(/30분마다/g,'10분마다');
      }
    });
  }

  function installLineupLabelPatch(){
    patchLineupRefreshLabels();
    if(labelObserver||typeof MutationObserver==='undefined')return;
    labelObserver=new MutationObserver(patchLineupRefreshLabels);
    labelObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
  }

  function ensureRankTrendPositionStyle(){
    let style=document.getElementById('eoRankTrendPositionFix');
    if(!style){
      style=document.createElement('style');
      style.id='eoRankTrendPositionFix';
      document.head.appendChild(style);
    }
    style.textContent=`
      #dashboard .dashboard-grid > #kboRankTrendCard{
        grid-column:4!important;
        order:5!important;
        margin-top:0!important;
        min-width:0!important;
        align-self:start!important;
      }
      @media(max-width:1300px){
        #dashboard .dashboard-grid > #kboRankTrendCard{grid-column:1!important;}
      }
    `;
  }

  function fixRankTrendPosition(){
    ensureRankTrendPositionStyle();
    const grid=document.querySelector('#dashboard .dashboard-grid');
    const standings=document.getElementById('kboStandings')?.closest('.kbo-standings-card,.card');
    const trend=document.getElementById('kboRankTrendCard');
    if(!grid||!standings||!trend)return;
    if(standings.parentElement!==grid)return;
    if(trend.parentElement!==grid||trend.previousElementSibling!==standings){
      standings.insertAdjacentElement('afterend',trend);
    }
  }

  function installRankTrendPositionFix(){
    fixRankTrendPosition();
    if(rankTrendObserver||typeof MutationObserver==='undefined')return;
    const dash=document.getElementById('dashboard');
    if(!dash)return;
    rankTrendObserver=new MutationObserver(fixRankTrendPosition);
    rankTrendObserver.observe(dash,{childList:true,subtree:true});
  }

  function install(){
    loadKboRecordsModule();
    loadKboRecordsEnhancement();
    loadKboAdvancedRecordsModule();
    loadKboSituationalRecordsModule();
    installRankTrendPositionFix();
    setTimeout(()=>{subscribeRealtime();refreshResults(false);installLineupLabelPatch();fixRankTrendPosition()},5000);
    setInterval(()=>refreshResults(false),POLL_MS);
    setInterval(patchLineupRefreshLabels,POLL_MS);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshResults(false);patchLineupRefreshLabels();fixRankTrendPosition()}});
    window.addEventListener('focus',()=>{refreshResults(false);patchLineupRefreshLabels();fixRankTrendPosition()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
