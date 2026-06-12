(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function makeCard(id,title,ul){var c=document.getElementById(id);if(!c){c=document.createElement('div');c.id=id;c.className='card pad rank-card';c.innerHTML='<h3>'+title+'</h3><ul id="'+ul+'" class="rank-list"></ul>'}return c}
  function ensure(){
    var d=document.getElementById('dashboard'); if(!d)return;
    var g=$('.grid4',d), board=$('.dashboard-grid',d); if(!g||!board)return;
    var old=document.getElementById('eoDashboardFinalLayoutStyle'); if(old)old.remove();
    var row=document.getElementById('eoDashboardRankRow');
    if(!row){row=document.createElement('div');row.id='eoDashboardRankRow';row.className='rank-grid';}
    if(g.parentElement!==d)d.appendChild(g);
    if(d.firstElementChild!==g)d.insertBefore(g,d.firstElementChild);
    if(row.parentElement!==d)g.insertAdjacentElement('afterend',row);
    else if(row.previousElementSibling!==g)g.insertAdjacentElement('afterend',row);
    var next=document.getElementById('eoNextWatch');
    if(next)row.appendChild(next);
    row.appendChild(makeCard('dashAttendCard','직관 횟수 순','dashAttendRank'));
    row.appendChild(makeCard('dashWinCard','승리요정 횟수 순','dashWinRank'));
    row.appendChild(makeCard('dashRateCard','승률 순','dashRateRank'));
    if(board.parentElement!==d)d.appendChild(board);
    if(board.previousElementSibling!==row)row.insertAdjacentElement('afterend',board);
    ['#dashSamsungWeek','#dashTodayAll','#dashYesterdayAll','#kboStandings'].forEach(function(sel){var el=$(sel);var card=el&&el.closest('.card');if(card&&card.parentElement===board)board.appendChild(card)});
    style();
  }
  function style(){
    var s=document.getElementById('eoDashboardRestoreCss');
    var css='#dashboard .grid4{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important}#eoDashboardRankRow{display:grid!important;grid-template-columns:1.15fr 1fr 1fr 1fr!important;gap:14px!important;margin:0 0 18px!important}#dashboard .dashboard-grid{display:grid!important;grid-template-columns:minmax(310px,.72fr) minmax(270px,.58fr) minmax(270px,.58fr) minmax(760px,1.7fr)!important;gap:16px!important;align-items:start!important}#dashboard .dashboard-grid>.card{min-width:0!important;grid-column:auto!important;grid-row:auto!important}#dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important}#dashboard .kbo-standings-table.eo-standings-full{min-width:760px!important}#dashboard .dashboard-grid .schedule-card h3{font-size:18px!important}#dashboard .dashboard-grid .mini-row{font-size:14px!important;line-height:1.35!important;padding:10px!important}@media(max-width:1400px){#eoDashboardRankRow,#dashboard .dashboard-grid{grid-template-columns:1fr!important}}';
    if(!s){s=document.createElement('style');s.id='eoDashboardRestoreCss';document.head.appendChild(s)}
    s.textContent=css;
  }
  function patchRenderRank(){
    if(window.__eoRankPatched)return;
    var tryPatch=function(){
      if(typeof window.renderRank==='function'){
        var old=window.renderRank;
        window.renderRank=function(id,rows,key,suffix){var el=document.getElementById(id);if(!el)return;return old(id,rows||[],key,suffix||'')};
        try{renderRank=window.renderRank}catch(e){}
        window.__eoRankPatched=true;
      }
    };
    tryPatch(); setTimeout(tryPatch,300); setTimeout(tryPatch,1000);
  }
  function boot(){patchRenderRank();ensure();setTimeout(function(){ensure();try{if(typeof renderAll==='function')renderAll()}catch(e){}},800);setInterval(ensure,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
