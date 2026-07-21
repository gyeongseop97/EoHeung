(function(){
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const byId=(id)=>document.getElementById(id);
  const TICKETLINK_URL='https://www.ticketlink.co.kr/sports/baseball/57';
  const TICKETLINK_HOST='https://www.ticketlink.co.kr/';
  const SUPABASE_URL='https://chaddxsntnokjjcrwiyb.supabase.co';
  const SUPABASE_ANON='sb_publishable_NiKj0BxbW3VauGK_kkflbg_OqMXPpCT';
  const EDGE_TIME_URL=SUPABASE_URL+'/functions/v1/ticketlink-time';
  const clockState={offsetMs:0,source:'syncing',rtt:null,lastSync:null,error:'',syncing:false};

  function isMobileLike(){return window.innerWidth<=900||window.matchMedia('(hover:none) and (pointer:coarse) and (max-width:920px)').matches}
  function safeEsc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
  function getEmail(){try{if(typeof state!=='undefined'&&state.user?.email)return state.user.email}catch(e){} return window.currentUserEmail||''}
  async function doLogout(){
    try{if(typeof state!=='undefined'&&state.client){await state.client.auth.signOut();state.user=null}}catch(e){}
    try{if(typeof showAuth==='function')showAuth();else location.reload()}catch(e){location.reload()}
  }

  function injectStyle(){
    let style=byId('eoheungLayoutFixStyle');
    const css=`
@media(min-width:901px){
  .syncbox{display:none!important}
  .topbar>.toolbar{display:none!important}
  .nav>.mobile-drawer-footer,.mobile-drawer-footer{display:none!important}
  body:not(.theme-excel):not(.theme-groupware) .sidebar{grid-template-columns:280px minmax(0,1fr)!important;padding-right:250px!important;overflow:visible!important}
  body.theme-excel .sidebar{grid-template-columns:250px minmax(0,1fr)!important;padding-right:235px!important;overflow:visible!important}
  body.theme-groupware .sidebar{grid-template-columns:260px minmax(0,1fr)!important;padding-right:235px!important;overflow:visible!important}
  #desktopAccountActions{position:fixed!important;right:14px!important;top:12px!important;z-index:8000!important;display:flex!important;align-items:center!important;gap:10px!important;margin:0!important;padding:8px 10px!important;border-radius:16px!important;background:rgba(255,255,255,.97)!important;border:1px solid rgba(220,229,242,.95)!important;box-shadow:0 8px 22px rgba(4,30,66,.14)!important;backdrop-filter:blur(10px)!important}
  #desktopAccountActions .desktop-account-email{display:block!important;max-width:190px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#475569!important;font-size:12px!important;font-weight:850!important;line-height:1!important;border:0!important;background:transparent!important;padding:7px 5px!important;cursor:pointer!important}
  #desktopAccountActions .desktop-account-logout{border:1px solid #fecdd3!important;background:#fff1f2!important;color:#be123c!important;border-radius:12px!important;padding:8px 10px!important;font-size:12px!important;font-weight:900!important;line-height:1!important;box-shadow:none!important;cursor:pointer!important}
  body.theme-excel #desktopAccountActions{top:5px!important;right:10px!important;border-radius:2px!important;background:#fff!important;border:1px solid #b7c9b7!important;box-shadow:none!important;padding:5px 8px!important}
  body.theme-excel #desktopAccountActions .desktop-account-logout{border-radius:2px!important;padding:7px 9px!important}
  body.theme-groupware #desktopAccountActions{top:8px!important;right:14px!important;border-radius:2px!important;background:#fff!important;border:1px solid #c7d8ea!important;box-shadow:0 1px 4px rgba(0,0,0,.12)!important;padding:5px 9px!important}
  body.theme-groupware #desktopAccountActions .desktop-account-logout{border-radius:2px!important;padding:7px 9px!important}
}
.link-clock-card{background:linear-gradient(135deg,#050505 0%,#101827 100%)!important;color:#fff!important;border:1px solid #111827!important;border-radius:16px!important;box-shadow:0 16px 34px rgba(2,6,23,.24)!important;min-height:150px!important;padding:16px 18px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;gap:12px!important;overflow:hidden!important;position:relative!important}.link-clock-card::after{content:'';position:absolute;inset:auto -40px -48px auto;width:170px;height:170px;border-radius:50%;background:rgba(0,212,31,.12);pointer-events:none}.link-clock-title{font-size:15px!important;font-weight:950!important;line-height:1.25!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.link-clock-title .sync-state{display:inline-flex;align-items:center;margin-left:8px;padding:2px 7px;border-radius:999px;background:rgba(0,212,31,.14);color:#30ff5a;font-size:11px;font-weight:950;vertical-align:middle}.link-clock-sub{font-size:11px!important;color:#cbd5e1!important;line-height:1.4!important}.link-clock-time{font-family:Arial,Helvetica,sans-serif!important;font-size:clamp(42px,4.6vw,76px)!important;font-weight:950!important;letter-spacing:-.075em!important;line-height:.92!important;color:#fff!important;white-space:nowrap!important;position:relative;z-index:1}.link-clock-time .link-clock-sec{color:#00d41f!important}.link-clock-actions{display:flex!important;justify-content:flex-end!important;gap:8px!important;position:relative;z-index:1}.link-clock-actions a,.link-clock-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:32px!important;padding:6px 10px!important;border:1px solid #334155!important;border-radius:8px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important;cursor:pointer!important}.link-clock-actions a.primary{background:#00a629!important;border-color:#00d439!important;color:#001405!important}.link-clock-actions button{background:#0f172a!important}.link-clock-error{color:#fca5a5!important}
body.theme-excel .link-clock-card{background:#fff!important;color:#111827!important;border:1px solid #70ad47!important;border-radius:0!important;box-shadow:none!important;min-height:142px!important}.theme-excel .link-clock-card::before{content:'SERVER TIME';position:absolute;top:0;left:0;right:0;height:28px;background:#217346;color:#fff;font-size:12px;font-weight:900;display:flex;align-items:center;padding-left:10px}.theme-excel .link-clock-card::after{display:none}.theme-excel .link-clock-title{color:#185c37!important;margin-top:22px}.theme-excel .link-clock-title .sync-state{background:#e2f0d9;color:#185c37}.theme-excel .link-clock-sub{color:#548235!important}.theme-excel .link-clock-time{color:#111827!important}.theme-excel .link-clock-time .link-clock-sec{color:#217346!important}.theme-excel .link-clock-actions a,.theme-excel .link-clock-actions button{border-radius:0!important;background:#fff!important;color:#185c37!important;border:1px solid #70ad47!important}.theme-excel .link-clock-actions a.primary{background:#217346!important;color:#fff!important}
body.theme-groupware .link-clock-card{background:#fff!important;color:#111827!important;border:1px solid #c7d8ea!important;border-radius:0!important;box-shadow:0 1px 4px rgba(0,0,0,.12)!important;min-height:142px!important}.theme-groupware .link-clock-card::after{background:rgba(23,78,166,.08)}.theme-groupware .link-clock-title{color:#111827!important}.theme-groupware .link-clock-title .sync-state{background:#eaf3ff;color:#174ea6}.theme-groupware .link-clock-sub{color:#64748b!important}.theme-groupware .link-clock-time{color:#0f172a!important}.theme-groupware .link-clock-time .link-clock-sec{color:#174ea6!important}.theme-groupware .link-clock-actions a,.theme-groupware .link-clock-actions button{border-radius:2px!important;background:#fff!important;color:#174ea6!important;border:1px solid #c7d8ea!important}.theme-groupware .link-clock-actions a.primary{background:#174ea6!important;color:#fff!important}.quick-link-card{display:grid;gap:12px}.quick-link-main h3{margin:0 0 6px}.quick-link-actions{display:flex;gap:8px;justify-content:flex-end;align-items:center}.quick-link-open,.quick-link-delete{padding:8px 11px!important;font-size:12px!important}
@media(max-width:900px){.syncbox{display:none!important}#desktopAccountActions{display:none!important}.topbar>.toolbar{display:none!important}.link-clock-card{min-height:128px!important;padding:14px!important}.link-clock-title{font-size:14px!important}.link-clock-time{font-size:clamp(40px,13vw,62px)!important}.link-clock-actions a,.link-clock-actions button{min-height:34px!important;flex:1!important}}
`;
    if(!style){style=document.createElement('style');style.id='eoheungLayoutFixStyle';document.head.appendChild(style)}
    if(style.textContent!==css)style.textContent=css;
  }

  function ensureDesktopAccount(){
    let box=byId('desktopAccountActions');
    if(!box){
      box=document.createElement('div');
      box.id='desktopAccountActions';
      box.innerHTML='<button type="button" class="desktop-account-email" title="내 설정 열기"></button><button type="button" class="desktop-account-logout">로그아웃</button>';
      document.body.appendChild(box);
      box.querySelector('.desktop-account-email').addEventListener('click',()=>{if(window.eoSettingsHub?.open)window.eoSettingsHub.open('account');else if(typeof navigateToPage==='function')navigateToPage('settings')});
      box.querySelector('.desktop-account-logout').addEventListener('click',doLogout);
    }
    const email=getEmail();
    const emailEl=box.querySelector('.desktop-account-email');
    if(emailEl)emailEl.textContent=email||'로그인 계정';
    $$('.nav>.mobile-drawer-footer').forEach(el=>{el.style.display=isMobileLike()?'':'none'});
  }

  function ensureMobileDrawer(){
    const sidebar=$('.sidebar'); const nav=$('.nav'); if(!sidebar||!nav)return;
    if(!byId('mobileMenuBackdrop')){const backdrop=document.createElement('div');backdrop.id='mobileMenuBackdrop';backdrop.className='mobile-menu-backdrop';document.body.appendChild(backdrop);backdrop.addEventListener('click',closeMenu)}
    let btn=byId('mobileMenuToggle');
    if(!btn){btn=document.createElement('button');btn.id='mobileMenuToggle';btn.className='mobile-menu-toggle';btn.type='button';btn.setAttribute('aria-label','메뉴 열기');btn.setAttribute('aria-expanded','false');btn.innerHTML='<span></span><span></span><span></span>';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const open=!sidebar.classList.contains('mobile-menu-open');sidebar.classList.toggle('mobile-menu-open',open);document.body.classList.toggle('mobile-menu-open',open);btn.setAttribute('aria-expanded',open?'true':'false')})}
    sidebar.appendChild(btn);
    let footer=byId('mobileDrawerFooter');
    if(!footer){footer=document.createElement('div');footer.id='mobileDrawerFooter';footer.className='mobile-drawer-footer';footer.innerHTML='<div class="mobile-drawer-user">로그인 계정</div><button type="button" class="mobile-logout-btn">로그아웃</button>';nav.appendChild(footer);footer.querySelector('.mobile-logout-btn').addEventListener('click',e=>{e.preventDefault();closeMenu();doLogout()})}
    const user=footer.querySelector('.mobile-drawer-user'); if(user)user.textContent=getEmail()||'로그인 계정';
    nav.querySelectorAll('button[data-page]').forEach(button=>button.addEventListener('click',closeMenu));
  }

  function enhanceScheduleControls(){
    const manual=byId('openGameModalBtn'); const sync=byId('callSyncBtn'); if(manual)manual.classList.add('schedule-hidden-action'); if(sync)sync.classList.add('schedule-hidden-action');
    const head=$('#schedule .calendar-head'); const prev=byId('prevMonthBtn'); const today=byId('todayBtn'); const next=byId('nextMonthBtn'); if(!head||!prev||!today||!next)return;
    let controls=byId('calendarNavControls'); if(!controls){controls=document.createElement('div');controls.id='calendarNavControls';controls.className='calendar-nav-controls';head.appendChild(controls)}
    prev.classList.add('calendar-nav-btn'); today.classList.add('calendar-nav-btn','calendar-today-btn'); next.classList.add('calendar-nav-btn'); controls.appendChild(prev); controls.appendChild(today); controls.appendChild(next);
  }

  async function syncTicketlinkServerTime(force=false){
    if(clockState.syncing&&!force)return; clockState.syncing=true; clockState.source=clockState.lastSync?'resyncing':'syncing'; updateLinkClock();
    const started=Date.now();
    try{
      let res=await fetch(EDGE_TIME_URL+'?t='+started,{cache:'no-store',headers:{apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON}});
      if(res.ok){
        const data=await res.json();
        if(!data.serverMs)throw new Error(data.error||'Edge 응답 오류');
        const ended=Date.now(); const rtt=data.rtt ?? (ended-started);
        clockState.offsetMs=Number(data.serverMs)+Math.round(rtt/2)-ended;
        clockState.rtt=rtt; clockState.lastSync=new Date(); clockState.source='server'; clockState.error='';
      }else{
        throw new Error('Edge Function 미배포 또는 오류 '+res.status);
      }
    }catch(edgeErr){
      try{
        const s=Date.now(); let direct;
        try{direct=await fetch(TICKETLINK_HOST+'?_eoheung_time='+s,{method:'HEAD',cache:'no-store',mode:'cors',credentials:'omit'})}
        catch(e){direct=await fetch(TICKETLINK_HOST+'?_eoheung_time='+s,{method:'GET',cache:'no-store',mode:'cors',credentials:'omit'})}
        const e=Date.now(); const h=direct.headers.get('date'); if(!h)throw new Error('Ticketlink Date header 접근 차단');
        const serverMs=Date.parse(h); if(!Number.isFinite(serverMs))throw new Error('Date 파싱 실패');
        const rtt=e-s; clockState.offsetMs=serverMs+Math.round(rtt/2)-e; clockState.rtt=rtt; clockState.lastSync=new Date(); clockState.source='server'; clockState.error='';
      }catch(directErr){
        clockState.source='fallback'; clockState.error=(edgeErr?.message||edgeErr)+' / '+(directErr?.message||directErr);
      }
    }finally{clockState.syncing=false; updateLinkClock()}
  }
  function clockNow(){return clockState.source==='server'?new Date(Date.now()+clockState.offsetMs):new Date()}
  function linkClockCardHtml(){
    const status=clockState.source==='server'?'서버 동기화':clockState.source==='fallback'?'연결 필요':'동기화 중';
    const sub=clockState.source==='server'?`Ticketlink 서버 기준 · RTT ${clockState.rtt??'-'}ms`:clockState.source==='fallback'?`Supabase Edge Function 확인 필요 · ${safeEsc(clockState.error||'')}`:'티켓링크 서버시간 확인 중';
    return '<div id="linkClockCard" class="card pad quick-link-card link-clock-card"><div><div class="link-clock-title">티켓링크 서버시간 <span class="sync-state">'+safeEsc(status)+'</span></div><div id="linkClockSub" class="link-clock-sub '+(clockState.source==='fallback'?'link-clock-error':'')+'">'+sub+'</div></div><div id="linkClockTime" class="link-clock-time">--:--:<span class="link-clock-sec">--.---</span></div><div class="link-clock-actions"><a class="primary" href="'+TICKETLINK_URL+'" target="_blank" rel="noopener">티켓링크 열기</a><button type="button" id="linkClockSyncBtn">재동기화</button></div></div>';
  }
  function updateLinkClock(){
    const el=byId('linkClockTime'); if(!el)return; const now=clockNow(); const parts=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now); const get=t=>(parts.find(p=>p.type===t)||{}).value||'00'; const ms=String(now.getMilliseconds()).padStart(3,'0'); el.innerHTML=get('hour')+':'+get('minute')+':<span class="link-clock-sec">'+get('second')+'.'+ms+'</span>';
    const sub=byId('linkClockSub'); if(sub){sub.classList.toggle('link-clock-error',clockState.source==='fallback'); sub.textContent=clockState.source==='server'?`Ticketlink 서버 기준 · RTT ${clockState.rtt??'-'}ms`:clockState.source==='fallback'?`Supabase Edge Function 확인 필요 · ${clockState.error||''}`:'티켓링크 서버시간 확인 중'}
    const badge=$('.link-clock-title .sync-state'); if(badge)badge.textContent=clockState.source==='server'?'서버 동기화':clockState.source==='fallback'?'연결 필요':'동기화 중';
  }

  function installQuickLinkFeatures(){
    if(window.__quickLinkFeaturesInstalled)return; window.__quickLinkFeaturesInstalled=true;
    function enhancedRenderLinks(){
      const root=byId('linkList'); if(!root)return; const dbLinks=(typeof state!=='undefined'&&Array.isArray(state.links))?state.links:[]; const defaults=(typeof DEFAULT_LINKS!=='undefined')?DEFAULT_LINKS:[]; const links=dbLinks.length?dbLinks:defaults;
      root.innerHTML=linkClockCardHtml()+links.map(l=>{const canDelete=!!l.id&&dbLinks.length>0;return '<div class="card pad quick-link-card"><a class="quick-link-main" href="'+safeEsc(l.url)+'" target="_blank" rel="noopener"><h3>'+safeEsc(l.title)+'</h3><p class="note">'+safeEsc(l.description||l.url)+'</p></a><div class="quick-link-actions"><a class="btn secondary quick-link-open" href="'+safeEsc(l.url)+'" target="_blank" rel="noopener">열기</a>'+(canDelete?'<button type="button" class="btn danger quick-link-delete" data-delete-link="'+safeEsc(l.id)+'">삭제</button>':'')+'</div></div>'}).join(''); updateLinkClock();
    }
    try{window.renderLinks=enhancedRenderLinks; renderLinks=enhancedRenderLinks}catch(e){window.renderLinks=enhancedRenderLinks}
    document.body.addEventListener('click',async e=>{const sync=e.target.closest('#linkClockSyncBtn'); if(sync){e.preventDefault();syncTicketlinkServerTime(true);return} const btn=e.target.closest('[data-delete-link]'); if(!btn)return; e.preventDefault(); e.stopPropagation(); const id=btn.dataset.deleteLink; const title=btn.closest('.quick-link-card')?.querySelector('h3')?.textContent||'선택한 링크'; if(!confirm('"'+title+'" 링크를 삭제할까요?'))return; btn.disabled=true; try{const res=await state.client.from('quick_links').delete().eq('id',id); if(res.error)throw res.error; state.links=state.links.filter(x=>String(x.id)!==String(id)); enhancedRenderLinks(); if(typeof toast==='function')toast('링크를 삭제했습니다.')}catch(err){btn.disabled=false; if(typeof toast==='function')toast('링크 삭제 오류: '+(err.message||err))}},true);
    if(!window.__linkClockInterval)window.__linkClockInterval=setInterval(updateLinkClock,41);
    if(!window.__ticketlinkSyncInterval)window.__ticketlinkSyncInterval=setInterval(()=>syncTicketlinkServerTime(false),15000);
    setTimeout(()=>{try{enhancedRenderLinks();syncTicketlinkServerTime(true)}catch(e){}},250);
  }
  function closeMenu(){const sidebar=$('.sidebar');const btn=byId('mobileMenuToggle'); if(sidebar)sidebar.classList.remove('mobile-menu-open'); document.body.classList.remove('mobile-menu-open'); if(btn)btn.setAttribute('aria-expanded','false')}
  function runFixes(){injectStyle(); ensureDesktopAccount(); ensureMobileDrawer(); enhanceScheduleControls(); installQuickLinkFeatures(); updateLinkClock()}
  function init(){runFixes(); setInterval(runFixes,1000); window.addEventListener('resize',()=>{runFixes(); if(!isMobileLike())closeMenu()}); document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
