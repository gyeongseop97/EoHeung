(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function makeCard(id,title,ul){var c=document.getElementById(id);if(!c){c=document.createElement('div');c.id=id;c.className='card pad rank-card';c.innerHTML='<h3>'+title+'</h3><ul id="'+ul+'" class="rank-list"></ul>'}return c}
  function cardFor(sel){var el=$(sel);return el&&el.closest('.card')}
  function ensure(){
    var d=document.getElementById('dashboard'); if(!d)return;
    var g=$('.grid4',d), board=$('.dashboard-grid',d); if(!g||!board)return;

    var row=document.getElementById('eoDashboardRankRow');
    if(!row){row=document.createElement('div');row.id='eoDashboardRankRow';row.className='rank-grid';}

    if(g.parentElement!==d)d.appendChild(g);
    if(row.parentElement!==d)d.appendChild(row);
    if(board.parentElement!==d)d.appendChild(board);

    var next=document.getElementById('eoNextWatch');
    if(next)row.appendChild(next);
    row.appendChild(makeCard('dashAttendCard','직관 횟수 순','dashAttendRank'));
    row.appendChild(makeCard('dashWinCard','승리요정 횟수 순','dashWinRank'));
    row.appendChild(makeCard('dashRateCard','승률 순','dashRateRank'));

    ['#dashSamsungWeek','#dashTodayAll','#dashYesterdayAll','#kboStandings'].forEach(function(sel){
      var card=cardFor(sel);
      if(card&&card.parentElement===board)board.appendChild(card);
    });
    style();
  }
  function style(){
    var s=document.getElementById('eoDashboardRestoreCss');
    var css=`
      #dashboard.section.active{display:flex!important;flex-direction:column!important;gap:0!important;}
      #dashboard>.grid4{order:1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important;width:100%!important;}
      #dashboard>#eoDashboardRankRow{order:2!important;display:grid!important;grid-template-columns:1.15fr 1fr 1fr 1fr!important;gap:14px!important;margin:0 0 18px!important;width:100%!important;}
      #dashboard>.dashboard-grid{order:3!important;display:grid!important;grid-template-columns:minmax(300px,.62fr) minmax(250px,.5fr) minmax(250px,.5fr) minmax(820px,1.75fr)!important;gap:16px!important;align-items:start!important;width:100%!important;margin:0!important;}
      #dashboard .dashboard-grid>.card{min-width:0!important;grid-column:auto!important;grid-row:auto!important;}
      #dashboard .dashboard-grid .schedule-card{padding:16px!important;}
      #dashboard .dashboard-grid .schedule-card h3{font-size:18px!important;line-height:1.25!important;margin-bottom:12px!important;}
      #dashboard .dashboard-grid .mini-row{font-size:14px!important;line-height:1.35!important;padding:10px!important;}
      #dashboard .dashboard-grid .mini-row b{font-size:15px!important;}
      #dashboard .dashboard-grid .team-logo.sm{width:20px!important;height:20px!important;}
      #dashSamsungWeek,#dashTodayAll,#dashYesterdayAll{max-height:500px!important;overflow:auto!important;}
      #dashboard .kbo-standings-card{overflow:visible!important;}
      #dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important;}
      #dashboard .kbo-standings-table.eo-standings-full{min-width:760px!important;width:100%!important;}
      #dashboard .kbo-standings-table.eo-standings-full th,#dashboard .kbo-standings-table.eo-standings-full td{font-size:12px!important;padding:7px 4px!important;}
      #eoDashboardRankRow>.card,#eoDashboardRankRow>#eoNextWatch{min-width:0!important;width:100%!important;}
      #eoDashboardRankRow .card.pad{padding:14px!important;}
      #eoDashboardRankRow h3{font-size:16px!important;margin:0 0 10px!important;}
      #eoDashboardRankRow .rank-list li{font-size:12px!important;padding:7px 0!important;}
      @media(max-width:1400px){#dashboard>#eoDashboardRankRow,#dashboard>.dashboard-grid{grid-template-columns:1fr!important;}}
      @media(max-width:900px){#dashboard>.grid4{grid-template-columns:1fr!important;}}
    `;
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
    tryPatch();setTimeout(tryPatch,300);setTimeout(tryPatch,1000);
  }
  function boot(){patchRenderRank();ensure();setTimeout(function(){ensure();try{if(typeof renderAll==='function')renderAll()}catch(e){}},800);setInterval(ensure,800)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
