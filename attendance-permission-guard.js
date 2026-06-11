(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const low=s=>String(s||'').trim().toLowerCase();
  let user=null,members=[];

  function msg(t){const el=document.getElementById('toast');if(el){const d=document.createElement('div');d.textContent=t;el.appendChild(d);setTimeout(()=>d.remove(),2600)}else console.warn(t)}
  function role(m){return m?.member_role||'associate'}
  function me(){const uid=String(user?.id||''),email=low(user?.email);return members.find(m=>String(m.auth_user_id||'')===uid)||members.find(m=>low(m.email)===email)||null}
  function isAdmin(){const mine=me();if(mine&&role(mine)==='admin')return true;return !members.some(m=>role(m)==='admin')}
  function isRegular(){const mine=me();return !!mine&&role(mine)==='regular'}
  function memberById(id){return members.find(m=>String(m.id)===String(id))}
  function canCheck(memberId){const target=memberById(memberId);if(isAdmin())return !!target&&role(target)==='regular';const mine=me();return isRegular()&&mine&&String(mine.id)===String(memberId)}

  function cleanup(){['eoEmergencyLayoutFix','eoLayoutRestoreStyle','eoStableDashboardLayout'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove()})}

  function ensureDashboardRow(){
    const dash=$('#dashboard'), metrics=$('#dashboard .grid4'), board=$('#dashboard .dashboard-grid');
    if(!dash||!metrics||!board)return;
    let row=$('#eoDashboardRankRow');
    if(!row){row=document.createElement('div');row.id='eoDashboardRankRow';row.className='eo-dashboard-rank-row';metrics.insertAdjacentElement('afterend',row)}
    else if(row.previousElementSibling!==metrics){metrics.insertAdjacentElement('afterend',row)}

    let next=$('#eoNextWatch');
    if(next&&next.parentElement!==row)row.appendChild(next);
    if(!next){next=document.createElement('div');next.id='eoNextWatch';next.className='eo-next-watch';next.innerHTML='<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p>아직 체크된 직관 예정 경기가 없습니다.</p></div>';row.appendChild(next)}

    [['dashAttendCard','직관 횟수 순','dashAttendRank'],['dashWinCard','승리요정 횟수 순','dashWinRank'],['dashRateCard','승률 순','dashRateRank']].forEach(([cid,title,ulid])=>{
      let card=$('#'+cid);
      if(!card){card=document.createElement('div');card.id=cid;card.className='card pad rank-card eo-personal-rank-card';card.innerHTML=`<h3>${title}</h3><ul id="${ulid}" class="rank-list"></ul>`}
      if(card.parentElement!==row)row.appendChild(card);
    });

    if(board.previousElementSibling!==row)row.insertAdjacentElement('afterend',board);
    ['#dashSamsungWeek','#dashTodayAll','#dashYesterdayAll','#kboStandings'].forEach(sel=>{const card=$(sel)?.closest('.card');if(card&&card.parentElement===board)board.appendChild(card)});
  }

  function renderPersonalRanks(){
    if(typeof buildRankings!=='function'||typeof renderRank!=='function')return;
    const ranks=buildRankings();
    renderRank('dashAttendRank',ranks.byAttend,'attendanceText','');
    renderRank('dashWinRank',ranks.byWins,'wins','회');
    renderRank('dashRateRank',ranks.byRate,'rateText','');
  }

  function injectCss(){
    let st=$('#eoVisibleDashboardFix');
    const css=`
      /* dashboard visible layout fix: 2026-06 */
      #dashboard.section.active{display:block!important;}
      #dashboard .grid4{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important;width:100%!important;}
      #eoDashboardRankRow{display:grid!important;grid-template-columns:minmax(360px,1.05fr) repeat(3,minmax(250px,.75fr))!important;gap:14px!important;align-items:stretch!important;margin:0 0 18px!important;width:100%!important;}
      #eoDashboardRankRow>#eoNextWatch,#eoDashboardRankRow>.card{min-width:0!important;width:100%!important;height:100%!important;}
      #eoDashboardRankRow .card.pad{padding:18px!important;}
      #eoDashboardRankRow h3{font-size:18px!important;margin:0 0 12px!important;line-height:1.28!important;}
      #eoDashboardRankRow .rank-list li{font-size:14px!important;padding:9px 0!important;}
      #eoDashboardRankRow .rank-list b{font-size:14px!important;}
      #eoDashboardRankRow #eoNextWatch{display:block!important;margin:0!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero{height:100%!important;min-height:0!important;padding:18px 24px!important;border-radius:18px!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero h3{font-size:18px!important;}
      #eoDashboardRankRow #eoNextWatch .eo-next-hero p{font-size:14px!important;line-height:1.45!important;}
      #eoDashboardRankRow #eoNextWatch .eo-pill{font-size:12px!important;padding:5px 8px!important;}

      #dashboard .dashboard-grid{display:grid!important;grid-template-columns:minmax(300px,.78fr) minmax(260px,.7fr) minmax(260px,.7fr) minmax(640px,1.55fr)!important;gap:16px!important;align-items:start!important;width:100%!important;margin:0!important;}
      #dashboard .dashboard-grid>.card{grid-column:auto!important;grid-row:auto!important;order:0!important;min-width:0!important;}
      #dashboard .dashboard-grid .schedule-card{padding:22px!important;}
      #dashboard .dashboard-grid .schedule-card h3{font-size:18px!important;margin-bottom:14px!important;}
      #dashboard .dashboard-grid .mini-row{font-size:14px!important;line-height:1.45!important;padding:14px 12px!important;}
      #dashboard .dashboard-grid .mini-row b{font-size:15px!important;}
      #dashboard .dashboard-grid .note{font-size:13px!important;}
      #dashboard .dashboard-grid .weather{font-size:13px!important;}
      #dashboard .dashboard-grid .team-logo.sm{width:20px!important;height:20px!important;}

      #dashboard .kbo-standings-card{overflow:visible!important;min-width:0!important;}
      #dashboard .kbo-standings-wrap{overflow-x:auto!important;width:100%!important;max-width:none!important;}
      #dashboard .kbo-standings-table.eo-standings-full{min-width:720px!important;width:100%!important;font-size:12px!important;table-layout:fixed!important;}
      #dashboard .kbo-standings-table.eo-standings-full th,#dashboard .kbo-standings-table.eo-standings-full td{font-size:12px!important;padding:7px 4px!important;line-height:1.25!important;}
      #dashboard .kbo-standings-table.eo-standings-full .team-logo,#dashboard .kbo-standings-table.eo-standings-full img{width:18px!important;height:18px!important;object-fit:contain!important;}
      #dashboard .eo-standings-foot{font-size:12px!important;}

      #schedule.section.active{display:block!important;}
      #schedule .schedule-layout{display:grid!important;grid-template-columns:1fr 1.45fr!important;gap:18px!important;align-items:start!important;}
      #schedule #calendar.calendar{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:8px!important;}
      @media(max-width:1700px){#dashboard .dashboard-grid{grid-template-columns:1fr 1fr!important;}#eoDashboardRankRow{grid-template-columns:1fr 1fr!important;}}
      @media(max-width:900px){#dashboard .grid4,#dashboard .dashboard-grid,#eoDashboardRankRow,#schedule .schedule-layout{grid-template-columns:1fr!important;}}
    `;
    if(!st){st=document.createElement('style');st.id='eoVisibleDashboardFix';document.head.appendChild(st)}
    if(st.textContent!==css)st.textContent=css;
  }

  async function loadMembers(){try{if(!window.state?.client)return;const s=await state.client.auth.getSession();user=s.data.session?.user||null;if(!user)return;const r=await state.client.from('members').select('id,name,email,auth_user_id,member_role').order('name');if(!r.error)members=r.data||[];applyAttendancePermission();applyAboutPermission()}catch(e){console.warn('permission guard load failed',e)}}

  function applyAttendancePermission(){const root=$('#dateDetail');if(!root||!members.length)return;$$('.member-checks',root).forEach(box=>{const rows=$$('.check-row',box);if(!rows.length)return;let visible=0;rows.forEach(row=>{const input=row.querySelector('input[data-member]');if(!input)return;const ok=canCheck(input.dataset.member);if(ok){row.style.display='';input.disabled=false;visible++}else{row.style.display='none';input.disabled=true}});let note=box.querySelector('.role-attendance-note');if(!visible){if(!note){note=document.createElement('div');note.className='permission-banner warn role-attendance-note';note.style.cssText='border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;margin:8px 0';box.appendChild(note)}note.textContent=isAdmin()?'체크 가능한 정회원이 없습니다. 회원관리에서 정회원 권한을 부여해 주세요.':'준회원은 직관 체크 권한이 없습니다. 정회원은 본인 이름만 체크할 수 있습니다.'}else if(note)note.remove()})}

  function applyAboutPermission(){const allowed=isAdmin();const selector=['[data-cmd-toggle]','[data-cmd-save]','[data-cmd-reset]','.eo-about-edit button','.eo-about-edit textarea','.eo-about-edit input','.eo-about-edit select','[data-about-edit]','[data-about-save]'].join(',');$$(selector).forEach(el=>{el.style.display=allowed?'':'none';if('disabled'in el)el.disabled=!allowed});if(!allowed)$('#eoCmdEdit')?.classList.remove('show')}

  function applyAll(){cleanup();ensureDashboardRow();renderPersonalRanks();injectCss();applyAttendancePermission();applyAboutPermission()}

  document.addEventListener('change',e=>{const checkbox=e.target.closest('input[type="checkbox"][data-game][data-member]');if(!checkbox)return;if(!canCheck(checkbox.dataset.member)){e.preventDefault();e.stopImmediatePropagation();checkbox.checked=!checkbox.checked;msg(isAdmin()?'관리자는 정회원만 직관 체크할 수 있습니다.':'정회원은 본인 이름만 체크할 수 있고, 준회원은 체크할 수 없습니다.')}},true);
  document.addEventListener('click',e=>{if(isAdmin())return;if(e.target.closest('[data-cmd-toggle],[data-cmd-save],[data-cmd-reset],.eo-about-edit button,[data-about-edit],[data-about-save]')){e.preventDefault();e.stopImmediatePropagation();msg('모임 소개와 십계명 수정은 관리자만 가능합니다.')}},true);

  function boot(){applyAll();loadMembers();setTimeout(applyAll,600);setTimeout(()=>{try{if(typeof renderDashboard==='function')renderDashboard()}catch(e){}applyAll()},1600);setInterval(applyAll,900);setInterval(loadMembers,30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
