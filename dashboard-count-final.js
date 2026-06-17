(function(){
  var patched=false;
  function formatAvg(n){
    if(!isFinite(n))return '-';
    return Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,'');
  }
  function setMetric(id,label,value,subText){
    var el=document.getElementById(id);
    if(!el)return;
    var card=el.closest('.metric');
    var labelEl=card&&card.querySelector('.label');
    var sub=card&&card.querySelector('.sub');
    if(labelEl)labelEl.textContent=label;
    if(el.textContent!==value)el.textContent=value;
    if(sub&&sub.textContent!==subText)sub.textContent=subText;
  }
  function updateDashboardMetrics(){
    try{
      if(typeof state==='undefined'||!state.games||!state.gameMembers)return;
      var gamesById={};
      state.games.forEach(function(g){gamesById[String(g.id)]=g});
      var completedTickets=0;
      var plannedTickets=0;
      var completedGameIds={};
      state.gameMembers.forEach(function(e){
        if(!e||!e.attended)return;
        var g=gamesById[String(e.game_id)];
        if(!g)return;
        if(g.status==='FINISHED'){
          completedTickets++;
          completedGameIds[String(g.id)]=true;
        }else if(g.status!=='POSTPONED'){
          plannedTickets++;
        }
      });
      var ticketText=completedTickets+'매';
      if(plannedTickets)ticketText+=' · 예정 '+plannedTickets+'매';
      var completedGameCount=Object.keys(completedGameIds).length;
      var avgText=completedGameCount?formatAvg(completedTickets/completedGameCount)+'명 / 경기':'-';
      setMetric('dashGames','누적 티켓 기여',ticketText,'전 회원 직관 체크 합산');
      setMetric('dashRate','경기당 평균 참석',avgText,'완료 직관 경기별 평균 인원');
    }catch(e){console.warn(e)}
  }
  function patchRenderDashboard(){
    try{
      if(patched||typeof window.renderDashboard!=='function')return;
      var original=window.renderDashboard;
      if(original.__eoTicketPatched)return;
      var wrapped=function(){
        var result=original.apply(this,arguments);
        updateDashboardMetrics();
        return result;
      };
      wrapped.__eoTicketPatched=true;
      window.renderDashboard=wrapped;
      patched=true;
    }catch(e){console.warn(e)}
  }
  function observeMetricCards(){
    var root=document.getElementById('dashboard');
    if(!root||root.__eoMetricObserver)return;
    root.__eoMetricObserver=true;
    new MutationObserver(function(){updateDashboardMetrics()}).observe(root,{childList:true,subtree:true,characterData:true});
  }
  function loadPhotoFrame(){
    if(document.getElementById('eoPhotoFrameWidget'))return;
    var s=document.createElement('script');
    s.id='eoPhotoFrameWidget';
    s.src='photo-frame-widget.js?v=11';
    s.defer=true;
    document.head.appendChild(s);
  }
  function boot(){
    loadPhotoFrame();
    patchRenderDashboard();
    observeMetricCards();
    updateDashboardMetrics();
    setTimeout(function(){patchRenderDashboard();observeMetricCards();updateDashboardMetrics()},100);
    setTimeout(function(){patchRenderDashboard();observeMetricCards();updateDashboardMetrics()},500);
    setTimeout(function(){patchRenderDashboard();observeMetricCards();updateDashboardMetrics()},1200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();