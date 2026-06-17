(function(){
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
  function patchRenderDashboard(){
    try{
      if(typeof window.renderDashboard==='function'&&!window.renderDashboard.__eoTicketPatched){
        var original=window.renderDashboard;
        window.renderDashboard=function(){var r=original.apply(this,arguments);updateDashboardMetrics();return r};
        window.renderDashboard.__eoTicketPatched=true;
      }
    }catch(e){console.warn(e)}
  }
  function loadPhotoFrame(){
    if(document.getElementById('eoPhotoFrameWidget'))return;
    var s=document.createElement('script');s.id='eoPhotoFrameWidget';s.src='photo-frame-widget.js?v=11';s.defer=true;document.head.appendChild(s);
  }
  function boot(){
    loadPhotoFrame();patchRenderDashboard();updateDashboardMetrics();
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics()},50);
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics()},250);
    setTimeout(function(){patchRenderDashboard();updateDashboardMetrics()},900);
    setInterval(updateDashboardMetrics,120);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();