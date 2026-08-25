(function(){
  'use strict';

  const POLL_MS=10*60*1000;
  const REFRESH_DELAY_MS=150*60*1000;
  const REFRESH_LIMIT_MS=540*60*1000;
  const TERMINAL=new Set(['FINISHED','POSTPONED','CANCELLED']);
  let refreshing=false;
  let realtimeChannel=null;
  let labelObserver=null;

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

  function install(){
    setTimeout(()=>{subscribeRealtime();refreshResults(false);installLineupLabelPatch()},5000);
    setInterval(()=>refreshResults(false),POLL_MS);
    setInterval(patchLineupRefreshLabels,POLL_MS);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshResults(false);patchLineupRefreshLabels()}});
    window.addEventListener('focus',()=>{refreshResults(false);patchLineupRefreshLabels()});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
