(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const low=s=>String(s||'').trim().toLowerCase();
  let user=null,members=[];

  function msg(t){
    const el=document.getElementById('toast');
    if(el){const d=document.createElement('div');d.textContent=t;el.appendChild(d);setTimeout(()=>d.remove(),2600)}
    else console.warn(t);
  }
  function role(m){return m?.member_role||'associate'}
  function me(){
    const uid=String(user?.id||''),email=low(user?.email);
    return members.find(m=>String(m.auth_user_id||'')===uid)||members.find(m=>low(m.email)===email)||null;
  }
  function isAdmin(){const mine=me();if(mine&&role(mine)==='admin')return true;return !members.some(m=>role(m)==='admin')}
  function isRegular(){const mine=me();return !!mine&&role(mine)==='regular'}
  function memberById(id){return members.find(m=>String(m.id)===String(id))}
  function canCheck(memberId){
    const target=memberById(memberId);
    if(isAdmin())return !!target&&role(target)==='regular';
    const mine=me();
    return isRegular()&&mine&&String(mine.id)===String(memberId);
  }

  function removeBadLayoutHelpers(){
    ['eoEmergencyLayoutFix','eoLayoutRestoreStyle'].forEach(id=>{const el=document.getElementById(id);if(el)el.remove()});
  }

  function injectStableDashboardCss(){
    let st=document.getElementById('eoStableDashboardLayout');
    const css=`
      #dashboard.section.active{display:block!important;}
      #dashboard .grid4{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important;margin:0 0 18px!important;width:100%!important;}
      #dashboard #eoNextWatch{display:block!important;margin:0 0 18px!important;width:100%!important;}
      #dashboard #eoNextWatch .eo-next-hero{min-height:0!important;height:auto!important;}
      #dashboard .dashboard-grid{display:grid!important;grid-template-columns:1.2fr 1fr 1fr 1fr!important;gap:16px!important;align-items:start!important;width:100%!important;margin:0!important;}
      #dashboard .dashboard-grid>.card{grid-column:auto!important;grid-row:auto!important;order:0!important;}
      #schedule.section.active{display:block!important;}
      #schedule .schedule-layout{display:grid!important;grid-template-columns:1fr 1.45fr!important;gap:18px!important;align-items:start!important;}
      #schedule #calendar.calendar{display:grid!important;grid-template-columns:repeat(7,1fr)!important;gap:8px!important;}
      @media(max-width:1200px){#dashboard .grid4{grid-template-columns:repeat(2,minmax(0,1fr))!important;}#dashboard .dashboard-grid,#schedule .schedule-layout{grid-template-columns:1fr!important;}}
      @media(max-width:720px){#dashboard .grid4{grid-template-columns:1fr!important;}}
    `;
    if(!st){st=document.createElement('style');st.id='eoStableDashboardLayout';document.head.appendChild(st)}
    if(st.textContent!==css)st.textContent=css;
  }

  function reorderDashboard(){
    const dash=$('#dashboard'); if(!dash)return;
    const metrics=dash.querySelector('.grid4');
    const board=dash.querySelector('.dashboard-grid');
    const next=$('#eoNextWatch');
    if(metrics&&dash.firstElementChild!==metrics)dash.insertBefore(metrics,dash.firstChild);
    if(next&&metrics&&next.previousElementSibling!==metrics)metrics.insertAdjacentElement('afterend',next);
    if(board){
      if(next&&board.previousElementSibling!==next)next.insertAdjacentElement('afterend',board);
      else if(!next&&metrics&&board.previousElementSibling!==metrics)metrics.insertAdjacentElement('afterend',board);
      const bySelector=[
        '#dashSamsungWeek',
        '#dashTodayAll',
        '#dashYesterdayAll',
        '#kboStandings'
      ];
      bySelector.forEach(sel=>{const child=$(sel)?.closest('.card');if(child&&child.parentElement===board)board.appendChild(child)});
    }
  }

  function safeRenderRank(id,rows,key,suffix){
    const el=typeof qs==='function'?qs(id):document.getElementById(id);
    if(!el)return;
    el.innerHTML=rows&&rows.length?rows.slice(0,5).map(r=>`<li><b>${esc(r.name)}</b><span>${r[key]}${suffix}</span></li>`).join(''):'<li><span>기록 없음</span><span>-</span></li>';
  }

  function patchRenderFunctions(){
    try{window.renderRank=safeRenderRank;renderRank=safeRenderRank}catch(e){}
    try{
      const safe=function(){
        try{
          if(typeof state==='undefined'||!state)return;
          const setTxt=(id,v)=>{const el=typeof qs==='function'?qs(id):document.getElementById(id);if(el)el.textContent=v};
          const setHtml=(id,v)=>{const el=typeof qs==='function'?qs(id):document.getElementById(id);if(el)el.innerHTML=v};
          if(typeof buildRankings!=='function')return;
          const ranks=buildRankings();
          setTxt('dashMembers',(state.members||[]).filter(m=>m.status!=='dormant').length);
          const total=ranks.rows.reduce((a,b)=>a+b.attended,0);
          const planned=ranks.rows.reduce((a,b)=>a+b.planned,0);
          setTxt('dashGames',typeof watchCountText==='function'?watchCountText(total,planned):`${total}${planned?`(${planned})`:''}`);
          const wins=(state.gameMembers||[]).filter(e=>e.attended).reduce((acc,e)=>{const g=(state.games||[]).find(x=>x.id===e.game_id);return acc+(typeof isActualWatchGame==='function'&&isActualWatchGame(g)&&g.result==='W'?1:0)},0);
          const losses=(state.gameMembers||[]).filter(e=>e.attended).reduce((acc,e)=>{const g=(state.games||[]).find(x=>x.id===e.game_id);return acc+(typeof isActualWatchGame==='function'&&isActualWatchGame(g)&&g.result==='L'?1:0)},0);
          setTxt('dashRate',(wins+losses)?`${Math.round(wins/(wins+losses)*100)}%`:'-');
          const today=typeof toYmd==='function'?toYmd(new Date()):new Date().toISOString().slice(0,10);
          const upcoming=(state.games||[]).filter(g=>g.game_date>=today&&g.status!=='FINISHED').sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')))[0];
          setHtml('dashNext',upcoming?`${(upcoming.game_time||'').slice(0,5)} ${upcoming.home_away==='HOME'?'vs':'@'} ${esc(upcoming.opponent)} ${typeof teamLogo==='function'?teamLogo(upcoming.opponent,'team-logo'):''}`:'-');
          safeRenderRank('dashAttendRank',ranks.byAttend,'attendanceText','');
          safeRenderRank('dashWinRank',ranks.byWins,'wins','회');
          safeRenderRank('dashRateRank',ranks.byRate,'rateText','');
          if(typeof renderDashboardSchedules==='function')renderDashboardSchedules();
          if(typeof renderKboStandings==='function')renderKboStandings();
          if(typeof renderNextWatchPanel==='function')renderNextWatchPanel();
          reorderDashboard();
          if(typeof renderWeatherCards==='function')renderWeatherCards();
        }catch(e){console.error('stable dashboard render failed',e)}
      };
      window.renderDashboard=safe;renderDashboard=safe;
    }catch(e){}
  }

  async function loadMembers(){
    try{
      if(!window.state?.client)return;
      const sessionResult=await state.client.auth.getSession();
      user=sessionResult.data.session?.user||null;
      if(!user)return;
      const result=await state.client.from('members').select('id,name,email,auth_user_id,member_role').order('name');
      if(!result.error)members=result.data||[];
      applyAttendancePermission();
      applyAboutPermission();
    }catch(e){console.warn('permission guard load failed',e)}
  }

  function applyAttendancePermission(){
    const root=$('#dateDetail');
    if(!root||!members.length)return;
    $$('.member-checks',root).forEach(box=>{
      const rows=$$('.check-row',box); if(!rows.length)return;
      let visible=0;
      rows.forEach(row=>{
        const input=row.querySelector('input[data-member]'); if(!input)return;
        const ok=canCheck(input.dataset.member);
        if(ok){row.style.display='';input.disabled=false;visible++}
        else{row.style.display='none';input.disabled=true}
      });
      let note=box.querySelector('.role-attendance-note');
      if(!visible){
        if(!note){note=document.createElement('div');note.className='permission-banner warn role-attendance-note';note.style.cssText='border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;margin:8px 0';box.appendChild(note)}
        note.textContent=isAdmin()?'체크 가능한 정회원이 없습니다. 회원관리에서 정회원 권한을 부여해 주세요.':'준회원은 직관 체크 권한이 없습니다. 정회원은 본인 이름만 체크할 수 있습니다.';
      }else if(note)note.remove();
    });
  }

  function applyAboutPermission(){
    const allowed=isAdmin();
    const selector=['[data-cmd-toggle]','[data-cmd-save]','[data-cmd-reset]','.eo-about-edit button','.eo-about-edit textarea','.eo-about-edit input','.eo-about-edit select','[data-about-edit]','[data-about-save]'].join(',');
    $$(selector).forEach(el=>{el.style.display=allowed?'':'none';if('disabled'in el)el.disabled=!allowed});
    if(!allowed)$('#eoCmdEdit')?.classList.remove('show');
  }

  function applyAll(){
    removeBadLayoutHelpers();
    injectStableDashboardCss();
    patchRenderFunctions();
    reorderDashboard();
    applyAttendancePermission();
    applyAboutPermission();
  }

  document.addEventListener('change',e=>{
    const checkbox=e.target.closest('input[type="checkbox"][data-game][data-member]');
    if(!checkbox)return;
    if(!canCheck(checkbox.dataset.member)){
      e.preventDefault();e.stopImmediatePropagation();checkbox.checked=!checkbox.checked;
      msg(isAdmin()?'관리자는 정회원만 직관 체크할 수 있습니다.':'정회원은 본인 이름만 체크할 수 있고, 준회원은 체크할 수 없습니다.');
    }
  },true);

  document.addEventListener('click',e=>{
    if(isAdmin())return;
    if(e.target.closest('[data-cmd-toggle],[data-cmd-save],[data-cmd-reset],.eo-about-edit button,[data-about-edit],[data-about-save]')){
      e.preventDefault();e.stopImmediatePropagation();msg('모임 소개와 십계명 수정은 관리자만 가능합니다.');
    }
  },true);

  function boot(){
    applyAll();
    loadMembers();
    setTimeout(()=>{applyAll();try{if(typeof renderDashboard==='function')renderDashboard()}catch(e){}},800);
    setTimeout(()=>{applyAll();try{if(typeof renderAll==='function')renderAll()}catch(e){}},1800);
    setInterval(applyAll,700);
    setInterval(loadMembers,30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
