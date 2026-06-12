(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function makeCard(id,title,ul){var c=document.getElementById(id);if(!c){c=document.createElement('div');c.id=id;c.className='card pad rank-card';c.innerHTML='<h3>'+title+'</h3><ul id="'+ul+'" class="rank-list"></ul>'}return c}
  function cardFor(sel){var el=$(sel);return el&&el.closest('.card')}
  function after(a,b){if(a&&b&&b.previousElementSibling!==a)a.insertAdjacentElement('afterend',b)}
  function ensure(){
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
#dashboard .dashboard-grid .schedule-card{padding:14px 16px!important;height:auto!important;max-height:none!important;overflow:visible!important}
#dashboard .dashboard-grid .schedule-card h3{font-size:18px!important;line-height:1.2!important;margin:0 0 10px!important}
#dashboard .dashboard-grid .mini-row{font-size:13px!important;line-height:1.12!important;padding:4px 9px!important;min-height:0!important}
#dashboard .dashboard-grid .mini-row b{font-size:14px!important;line-height:1.1!important}
#dashboard .dashboard-grid .note,#dashboard .dashboard-grid .muted{font-size:11px!important;line-height:1.12!important;margin-top:2px!important}
#dashboard .dashboard-grid .weather{font-size:12px!important;line-height:1.12!important;margin-top:2px!important}
#dashboard .dashboard-grid .team-logo.sm{width:16px!important;height:16px!important}
#dashSamsungWeek,#dashTodayAll,#dashYesterdayAll{max-height:none!important;height:auto!important;overflow:visible!important}
#dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important}
#dashboard .kbo-standings-table.eo-standings-full{min-width:760px!important;width:100%!important}
#eoDashboardRankRow>.card,#eoDashboardRankRow>#eoNextWatch{min-width:0!important;width:100%!important}
#eoDashboardRankRow .card.pad{padding:14px!important}
#eoDashboardRankRow h3{font-size:16px!important;margin:0 0 10px!important}
#eoDashboardRankRow .rank-list li{font-size:12px!important;padding:7px 0!important}
@media(max-width:1400px){#dashboard>#eoDashboardRankRow,#dashboard>.dashboard-grid{grid-template-columns:1fr!important}}
@media(max-width:900px){#dashboard>.grid4{grid-template-columns:1fr!important}}
`;
    ['dashSamsungWeek','dashTodayAll','dashYesterdayAll'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.maxHeight='none';el.style.height='auto';el.style.overflow='visible';var card=el.closest('.card');if(card){card.style.maxHeight='none';card.style.height='auto';card.style.overflow='visible'}}});
  }
  function boot(){ensure();setTimeout(function(){ensure();try{if(typeof renderAll==='function')renderAll()}catch(e){}},800);setInterval(ensure,800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
