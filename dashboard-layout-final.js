(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function ensureRankRow(){
    const dash=$('#dashboard');
    const metrics=$('#dashboard .grid4');
    const board=$('#dashboard .dashboard-grid');
    if(!dash||!metrics||!board)return;

    let row=$('#eoDashboardRankRow');
    if(!row){
      row=document.createElement('div');
      row.id='eoDashboardRankRow';
      row.className='eo-dashboard-rank-row';
      metrics.insertAdjacentElement('afterend',row);
    }else if(row.previousElementSibling!==metrics){
      metrics.insertAdjacentElement('afterend',row);
    }

    let next=$('#eoNextWatch');
    if(next && next.parentElement!==row)row.appendChild(next);
    if(!next){
      next=document.createElement('div');
      next.id='eoNextWatch';
      next.className='eo-next-watch';
      next.innerHTML='<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p>아직 체크된 직관 예정 경기가 없습니다.</p></div>';
      row.appendChild(next);
    }

    const cards=[
      ['dashAttendCard','직관 횟수 순','dashAttendRank'],
      ['dashWinCard','승리요정 횟수 순','dashWinRank'],
      ['dashRateCard','승률 순','dashRateRank']
    ];
    cards.forEach(([cid,title,ulid])=>{
      let card=$('#'+cid);
      if(!card){
        card=document.createElement('div');
        card.id=cid;
        card.className='card pad rank-card eo-personal-rank-card';
        card.innerHTML=`<h3>${title}</h3><ul id="${ulid}" class="rank-list"></ul>`;
      }
      if(card.parentElement!==row)row.appendChild(card);
    });

    if(board.previousElementSibling!==row)row.insertAdjacentElement('afterend',board);

    ['#dashSamsungWeek','#dashTodayAll','#dashYesterdayAll','#kboStandings'].forEach(sel=>{
      const card=$(sel)?.closest('.card');
      if(card&&card.parentElement===board)board.appendChild(card);
    });
  }

  function fillRanks(){
    if(typeof buildRankings!=='function')return;
    const ranks=buildRankings();
    if(typeof renderRank==='function'){
      renderRank('dashAttendRank',ranks.byAttend,'attendanceText','');
      renderRank('dashWinRank',ranks.byWins,'wins','회');
      renderRank('dashRateRank',ranks.byRate,'rateText','');
    }
  }

  function injectCss(){
    let s=$('#eoDashboardFinalLayoutStyle');
    const css=`
      #dashboard.section.active{display:block!important;}
      #dashboard .grid4{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important;width:100%!important;}
      #eoDashboardRankRow{display:grid!important;grid-template-columns:minmax(300px,1.15fr) repeat(3,minmax(210px,1fr))!important;gap:14px!important;align-items:stretch!important;margin:0 0 18px!important;width:100%!important;}
      #eoDashboardRankRow>.card,#eoDashboardRankRow>#eoNextWatch{min-width:0!important;width:100%!important;height:100%!important;}
      #eoDashboardRankRow .card.pad{padding:14px!important;}
      #eoDashboardRankRow h3{font-size:16px!important;margin:0 0 10px!important;line-height:1.25!important;}
      #eoDashboardRankRow .rank-list li{font-size:12px!important;padding:7px 0!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero{height:100%!important;min-height:0!important;padding:16px 22px!important;border-radius:18px!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero h3{font-size:16px!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero p{font-size:12px!important;line-height:1.35!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero p[style]{font-size:15px!important;}
      #eoDashboardRankRow #eoNextWatch .eo-pill{font-size:11px!important;padding:4px 7px!important;}
      #dashboard .dashboard-grid{display:grid!important;grid-template-columns:1.22fr 1.02fr 1.02fr minmax(430px,1.18fr)!important;gap:16px!important;align-items:start!important;width:100%!important;margin:0!important;}
      #dashboard .dashboard-grid>.card{grid-column:auto!important;grid-row:auto!important;order:0!important;min-width:0!important;}
      #dashboard .kbo-standings-card{overflow:hidden!important;}
      #dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important;}
      #dashboard .kbo-standings-table.eo-standings-full{min-width:560px!important;font-size:10px!important;table-layout:fixed!important;}
      #dashboard .kbo-standings-table.eo-standings-full th,#dashboard .kbo-standings-table.eo-standings-full td{font-size:10px!important;padding:5px 2px!important;}
      #dashboard .kbo-standings-table.eo-standings-full .team-logo{width:15px!important;height:15px!important;}
      #schedule .schedule-layout{display:grid!important;grid-template-columns:1fr 1.45fr!important;gap:18px!important;}
      #schedule #calendar.calendar{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:8px!important;}
      @media(max-width:1500px){#dashboard .dashboard-grid{grid-template-columns:1fr 1fr!important;}#eoDashboardRankRow{grid-template-columns:1fr 1fr!important;}}
      @media(max-width:900px){#dashboard .grid4,#dashboard .dashboard-grid,#eoDashboardRankRow,#schedule .schedule-layout{grid-template-columns:1fr!important;}}
    `;
    if(!s){s=document.createElement('style');s.id='eoDashboardFinalLayoutStyle';document.head.appendChild(s);}
    if(s.textContent!==css)s.textContent=css;
  }

  function apply(){
    ['eoEmergencyLayoutFix','eoLayoutRestoreStyle','eoStableDashboardLayout'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove();});
    ensureRankRow();
    fillRanks();
    injectCss();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setTimeout(apply,500);
  setTimeout(apply,1600);
  setInterval(apply,1200);
})();
