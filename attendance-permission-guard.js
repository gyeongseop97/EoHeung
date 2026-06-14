(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function makeCard(id,title,ul){var c=document.getElementById(id);if(!c){c=document.createElement('div');c.id=id;c.className='card pad rank-card';c.innerHTML='<h3>'+title+'</h3><ul id="'+ul+'" class="rank-list"></ul>'}return c}
  function cardFor(sel){var el=$(sel);return el&&el.closest('.card')}
  function after(a,b){if(a&&b&&b.previousElementSibling!==a)a.insertAdjacentElement('afterend',b)}
  var didRenderAll=false;

  function calcWatchMetrics(){
    try{
      if(typeof state==='undefined'||!state.games||!state.gameMembers)return null;
      var gameMap={},finished={},planned={};
      state.games.forEach(function(g){gameMap[String(g.id)]=g});
      state.gameMembers.forEach(function(e){
        if(!e||!e.attended)return;
        var g=gameMap[String(e.game_id)];
        if(!g)return;
        if(g.status==='FINISHED')finished[String(g.id)]=g;
        else planned[String(g.id)]=g;
      });
      var wins=0,losses=0,draws=0;
      Object.keys(finished).forEach(function(id){
        var r=finished[id].result;
        if(r==='W')wins++;
        else if(r==='L')losses++;
        else if(r==='D')draws++;
      });
      var done=Object.keys(finished).length;
      var future=Object.keys(planned).length;
      var text=wins+'승'+losses+'패';
      if(draws)text+=draws+'무';
      text+=' ('+done+'경기)';
      if(future)text+=' · 예정 '+future+'경기';
      var denom=wins+losses;
      return {text:text,rate:denom?Math.round(wins/denom*100)+'%':'-'};
    }catch(e){return null}
  }
  function applyWatchMetrics(){
    var m=calcWatchMetrics();
    if(!m)return;
    var games=document.getElementById('dashGames');
    if(games)games.textContent=m.text;
    var gamesSub=games&&games.closest('.metric')&&games.closest('.metric').querySelector('.sub');
    if(gamesSub)gamesSub.textContent='직관 경기 기준';
    var rate=document.getElementById('dashRate');
    if(rate)rate.textContent=m.rate;
    var rateSub=rate&&rate.closest('.metric')&&rate.closest('.metric').querySelector('.sub');
    if(rateSub)rateSub.textContent='직관 경기 기준, 무승부 제외';
  }
  function patchDashboard(){
    if(window.__eoDashboardMetricsPatched)return;
    if(typeof window.renderDashboard==='function'){
      var old=window.renderDashboard;
      var wrapped=function(){var r=old.apply(this,arguments);applyWatchMetrics();return r};
      wrapped.__eoDashboardMetricsPatched=true;
      window.renderDashboard=wrapped;
      try{renderDashboard=wrapped}catch(e){}
      window.__eoDashboardMetricsPatched=true;
    }
  }

  function ensure(){
    patchDashboard();
    applyWatchMetrics();
    var d=$('#dashboard'), g=$('#dashboard .grid4'), board=$('#dashboard .dashboard-grid'); if(!d||!g||!board)return;
    var row=$('#eoDashboardRankRow')||document.createElement('div'); row.id='eoDashboardRankRow'; row.className='rank-grid';
    if(g.parentElement!==d)d.appendChild(g); if(row.parentElement!==d)d.appendChild(row); if(board.parentElement!==d)d.appendChild(board);
    if(d.firstElementChild!==g)d.insertBefore(g,d.firstElementChild); after(g,row); after(row,board);
    var next=$('#eoNextWatch'); if(next)row.appendChild(next);
    row.appendChild(makeCard('dashAttendCard','직관 횟수 순','dashAttendRank'));
    row.appendChild(makeCard('dashWinCard','승리요정 횟수 순','dashWinRank'));
    row.appendChild(makeCard('dashRateCard','승률 순','dashRateRank'));
    [['#dashSamsungWeek',1],['#dashTodayAll',2],['#dashYesterdayAll',3],['#kboStandings',4]].forEach(function(x){var c=cardFor(x[0]);if(c){board.appendChild(c);c.style.order=x[1];c.style.gridColumn='auto';c.style.gridRow='auto'}});
    style();
  }
  function style(){
    var s=$('#eoDashboardRestoreCss')||document.createElement('style'); s.id='eoDashboardRestoreCss'; document.head.appendChild(s);
    s.textContent=`
#dashboard.section.active{display:flex!important;flex-direction:column!important;gap:0!important}
#dashboard>.grid4{order:1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important;width:100%!important}
#dashboard>#eoDashboardRankRow{order:2!important;display:grid!important;grid-template-columns:1.15fr 1fr 1fr 1fr!important;gap:14px!important;margin:0 0 18px!important;width:100%!important}
#dashboard>.dashboard-grid{order:3!important;display:grid!important;grid-template-columns:minmax(300px,.62fr) minmax(250px,.5fr) minmax(250px,.5fr) minmax(820px,1.75fr)!important;gap:16px!important;align-items:start!important;width:100%!important;margin:0!important}
#dashboard .dashboard-grid>.card{min-width:0!important;grid-column:auto!important;grid-row:auto!important;height:auto!important;max-height:none!important;overflow:visible!important}
#dashboard .dashboard-grid .schedule-card{padding:14px 16px!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
#dashboard .dashboard-grid .schedule-card h3{font-size:18px!important;line-height:1.2!important;margin:0 0 10px!important}
#dashboard .dashboard-grid .mini-row{font-size:13px!important;line-height:1.1!important;padding:3px 9px!important;min-height:0!important}
#dashboard .dashboard-grid .mini-row b{font-size:14px!important;line-height:1.08!important}
#dashboard .dashboard-grid .note,#dashboard .dashboard-grid .muted{font-size:11px!important;line-height:1.1!important;margin-top:1px!important}
#dashboard .dashboard-grid .weather{font-size:12px!important;line-height:1.1!important;margin-top:1px!important}
#dashboard .dashboard-grid .team-logo.sm{width:15px!important;height:15px!important}
#dashSamsungWeek,#dashTodayAll,#dashYesterdayAll{max-height:none!important;min-height:0!important;height:auto!important;overflow:visible!important}
#dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important}
#dashboard .kbo-standings-table.eo-standings-full{min-width:760px!important;width:100%!important}
#eoDashboardRankRow>.card,#eoDashboardRankRow>#eoNextWatch{min-width:0!important;width:100%!important}
#eoDashboardRankRow .card.pad{padding:14px!important}
#eoDashboardRankRow h3{font-size:16px!important;margin:0 0 10px!important}
#eoDashboardRankRow .rank-list li{font-size:12px!important;padding:7px 0!important}
@media(max-width:1400px){#dashboard>#eoDashboardRankRow,#dashboard>.dashboard-grid{grid-template-columns:1fr!important}}
@media(max-width:900px){#dashboard>.grid4{grid-template-columns:1fr!important}}
`;
    ['dashSamsungWeek','dashTodayAll','dashYesterdayAll'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.maxHeight='none';el.style.minHeight='0';el.style.height='auto';el.style.overflow='visible';var card=el.closest('.card');if(card){card.style.maxHeight='none';card.style.minHeight='0';card.style.height='auto';card.style.overflow='visible'}}});
  }
  function boot(){
    ensure();
    setTimeout(ensure,300);
    setTimeout(function(){if(!didRenderAll){didRenderAll=true;try{if(typeof renderAll==='function')renderAll()}catch(e){}}ensure();applyWatchMetrics()},900);
    setTimeout(function(){ensure();applyWatchMetrics()},1800);
    setTimeout(function(){ensure();applyWatchMetrics()},3500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();