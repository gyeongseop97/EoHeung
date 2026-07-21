(function(){
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const esc=value=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const notify=message=>{try{if(typeof toast==='function')return toast(message)}catch(e){}console.warn(message)};

  function appState(){try{return typeof state!=='undefined'?state:null}catch(e){return null}}
  function me(){
    const current=appState();
    if(!current?.user)return null;
    const uid=String(current.user.id||'');
    const email=String(current.user.email||'').toLowerCase();
    return (current.members||[]).find(member=>String(member.auth_user_id||'')===uid)
      ||(current.members||[]).find(member=>String(member.email||'').toLowerCase()===email)
      ||null;
  }
  function role(member){return member?.member_role||'associate'}
  function isAdmin(){return role(me())==='admin'}
  function isRegular(){return role(me())==='regular'}
  function memberById(id){return (appState()?.members||[]).find(member=>String(member.id)===String(id))}
  function canAttend(id){
    const member=memberById(id);
    if(!member)return false;
    if(isAdmin())return ['regular','admin'].includes(role(member));
    return isRegular()&&String(me()?.id)===String(id);
  }
  function attendance(gameId,memberId){return (appState()?.gameMembers||[]).find(item=>String(item.game_id)===String(gameId)&&String(item.member_id)===String(memberId))}

  function style(){
    if($('#eoGuardStyle'))return;
    const sheet=document.createElement('style');
    sheet.id='eoGuardStyle';
    sheet.textContent='.check-row{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px}.check-row label{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.check-row.eo-noauth{display:none!important}.attendance-memo-line{grid-column:1/-1;display:grid;grid-template-columns:1fr auto;gap:6px}.attendance-memo-line textarea{height:30px!important;min-height:28px!important;font-size:12px!important;padding:5px 7px!important}.attendance-memo-line .btn{padding:5px 8px!important;font-size:12px!important}';
    document.head.appendChild(sheet);
  }

  function removeLegacyAccountPanels(){
    ['eoAccountFixed','eoAccountPanel','desktopAccountPanel'].forEach(id=>document.getElementById(id)?.remove());
  }

  function addMemo(row,checkbox){
    if(row.querySelector('[data-attendance-memo]'))return;
    const entry=attendance(checkbox.dataset.game,checkbox.dataset.member);
    const wrapper=document.createElement('div');
    wrapper.className='attendance-memo-line';
    wrapper.innerHTML=`<textarea class="input" data-attendance-memo="${checkbox.dataset.game}|${checkbox.dataset.member}" placeholder="직관 메모">${esc(entry?.memo||'')}</textarea><button class="btn secondary" data-save-attendance-memo="${checkbox.dataset.game}|${checkbox.dataset.member}">저장</button>`;
    row.appendChild(wrapper);
  }

  function apply(){
    style();
    removeLegacyAccountPanels();
    const root=$('#dateDetail');
    if(!root)return;
    $$('.check-row',root).forEach(row=>{
      const checkbox=row.querySelector('input[data-game][data-member]');
      if(!checkbox)return;
      const allowed=canAttend(checkbox.dataset.member);
      row.classList.toggle('eo-noauth',!allowed);
      checkbox.disabled=!allowed;
      if(allowed)addMemo(row,checkbox);
    });
  }

  async function saveMemo(key){
    const current=appState();
    if(!current?.client)return;
    const [game_id,member_id]=key.split('|');
    const memo=($(`[data-attendance-memo="${key}"]`)?.value||'').trim();
    if(!canAttend(member_id))return notify('권한이 없습니다.');
    const result=await current.client.from('game_members').upsert({game_id,member_id,planned:true,attended:true,memo},{onConflict:'game_id,member_id'}).select().single();
    if(result.error)return notify('메모 저장 오류: '+result.error.message);
    const old=attendance(game_id,member_id);
    old?Object.assign(old,result.data):current.gameMembers.push(result.data);
    notify('직관 메모를 저장했습니다.');
    try{renderDashboard();renderCalendar();renderWatchList();renderRecords()}catch(e){}
  }

  function loadScript(id,src){
    if(document.getElementById(id))return;
    const script=document.createElement('script');
    script.id=id;
    script.src=src;
    script.defer=true;
    document.head.appendChild(script);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-save-attendance-memo]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    saveMemo(button.dataset.saveAttendanceMemo);
  },true);

  function boot(){
    loadScript('eoLiveChatScript','live-chat-widget.js?v=10');
    loadScript('eoDashboardCountFinal','dashboard-count-final.js?v=10');
    loadScript('eoPhotoFrameWidgetDirect','photo-frame-widget.js?v=13');
    apply();
    setTimeout(apply,800);
    const root=$('#dateDetail');
    if(root)new MutationObserver(()=>setTimeout(apply,0)).observe(root,{childList:true,subtree:true});
    setInterval(apply,3000);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
