(function(){
  function qs(sel){return document.querySelector(sel)}
  function qsa(sel){return Array.from(document.querySelectorAll(sel))}
  function isMobileLike(){return window.innerWidth<=900||window.matchMedia('(hover:none) and (pointer:coarse) and (max-width:920px)').matches}

  function injectLayoutFixStyle(){
    if(qs('#eoheungLayoutFixStyle'))return;
    const style=document.createElement('style');
    style.id='eoheungLayoutFixStyle';
    style.textContent=`
@media(min-width:901px){
  .syncbox{display:none!important}
  .topbar>.toolbar{display:none!important}
  body:not(.theme-excel):not(.theme-groupware) .sidebar{grid-template-columns:280px minmax(0,1fr)!important;padding-right:250px!important;overflow:visible!important}
  body.theme-excel .sidebar{grid-template-columns:250px minmax(0,1fr)!important;padding-right:235px!important;overflow:visible!important}
  body.theme-groupware .sidebar{grid-template-columns:260px minmax(0,1fr)!important;padding-right:235px!important;overflow:visible!important}
  .desktop-account-actions{position:fixed!important;right:16px!important;top:13px!important;z-index:5000!important;display:flex!important;align-items:center!important;gap:10px!important;margin:0!important;padding:7px 10px!important;border-radius:16px!important;background:rgba(255,255,255,.96)!important;border:1px solid rgba(220,229,242,.95)!important;box-shadow:0 8px 22px rgba(4,30,66,.14)!important;backdrop-filter:blur(10px)!important}
  .desktop-account-actions #userEmail{display:block!important;max-width:175px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#475569!important;font-size:12px!important;line-height:1!important}
  .desktop-account-actions #signOutBtn{border:1px solid #fecdd3!important;background:#fff1f2!important;color:#be123c!important;border-radius:12px!important;padding:8px 10px!important;font-size:12px!important;font-weight:900!important;line-height:1!important;box-shadow:none!important;cursor:pointer!important}
  body.theme-excel .desktop-account-actions{top:5px!important;right:10px!important;border-radius:2px!important;background:#fff!important;border:1px solid #b7c9b7!important;box-shadow:none!important;padding:5px 8px!important}
  body.theme-excel .desktop-account-actions #signOutBtn{border-radius:2px!important;padding:7px 9px!important}
  body.theme-groupware .desktop-account-actions{top:8px!important;right:14px!important;border-radius:2px!important;background:#fff!important;border:1px solid #c7d8ea!important;box-shadow:0 1px 4px rgba(0,0,0,.12)!important;padding:5px 9px!important}
  body.theme-groupware .desktop-account-actions #signOutBtn{border-radius:2px!important;padding:7px 9px!important}
}

.link-clock-card{background:#050505!important;color:#fff!important;border:1px solid #111!important;border-radius:2px!important;box-shadow:0 2px 10px rgba(0,0,0,.18)!important;min-height:132px!important;padding:14px 16px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;gap:10px!important;overflow:hidden!important}
.link-clock-title{font-size:15px!important;font-weight:950!important;line-height:1.25!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.link-clock-title a{color:#00d439!important;text-decoration:underline!important;text-underline-offset:2px!important;font-size:13px!important;margin-left:6px!important}.link-clock-sub{font-size:11px!important;color:#d1d5db!important;line-height:1.3!important}.link-clock-time{font-family:Arial,Helvetica,sans-serif!important;font-size:clamp(42px,4.4vw,72px)!important;font-weight:950!important;letter-spacing:-.07em!important;line-height:.9!important;color:#fff!important;white-space:nowrap!important}.link-clock-time .link-clock-sec{color:#00d41f!important}.link-clock-actions{display:flex!important;justify-content:flex-end!important;gap:8px!important}.link-clock-actions a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:32px!important;padding:6px 10px!important;border:1px solid #334155!important;border-radius:6px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important}.link-clock-actions a.primary{background:#00a629!important;border-color:#00d439!important;color:#001405!important}
body.theme-excel .link-clock-card{border-radius:0!important}body.theme-groupware .link-clock-card{border-radius:0!important;box-shadow:none!important}

@media(max-width:900px){
  .syncbox{display:none!important}
  .desktop-account-actions{display:none!important}
  .topbar>.toolbar{display:none!important}
  .link-clock-card{min-height:116px!important;padding:13px!important}.link-clock-title{font-size:14px!important}.link-clock-time{font-size:clamp(40px,13vw,62px)!important}.link-clock-actions a{min-height:34px!important;flex:1!important}
}`;
    document.head.appendChild(style);
  }

  function moveDesktopAccountToolbar(){
    /* 예전 패치가 만든 중복 계정 박스가 있으면 제거 */
    qsa('#desktopAccountActions').forEach(function(el){
      if(!el.querySelector('#signOutBtn'))el.remove();
    });

    const signOut=qs('#signOutBtn');
    const userEmail=qs('#userEmail');
    if(!signOut||!userEmail)return;

    let toolbar=signOut.closest('.toolbar')||userEmail.closest('.toolbar');
    if(!toolbar)return;

    toolbar.id='desktopAccountActions';
    toolbar.classList.add('desktop-account-actions');
    toolbar.style.margin='0';
    if(toolbar.parentElement!==document.body){
      document.body.appendChild(toolbar);
    }
  }

  function ensureMobileDrawer(){
    const sidebar=qs('.sidebar');
    const nav=qs('.nav');
    if(!sidebar||!nav)return;

    if(!qs('#mobileMenuBackdrop')){
      const backdrop=document.createElement('div');
      backdrop.id='mobileMenuBackdrop';
      backdrop.className='mobile-menu-backdrop';
      document.body.appendChild(backdrop);
      backdrop.addEventListener('click',closeMenu);
    }

    let btn=qs('#mobileMenuToggle');
    if(!btn){
      btn=document.createElement('button');
      btn.id='mobileMenuToggle';
      btn.className='mobile-menu-toggle';
      btn.type='button';
      btn.setAttribute('aria-label','메뉴 열기');
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML='<span></span><span></span><span></span>';
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        const willOpen=!sidebar.classList.contains('mobile-menu-open');
        sidebar.classList.toggle('mobile-menu-open',willOpen);
        document.body.classList.toggle('mobile-menu-open',willOpen);
        btn.setAttribute('aria-expanded',willOpen?'true':'false');
      });
    }
    if(btn.parentElement!==sidebar)sidebar.appendChild(btn);
    else sidebar.appendChild(btn);

    if(!qs('#mobileDrawerFooter')){
      const footer=document.createElement('div');
      footer.id='mobileDrawerFooter';
      footer.className='mobile-drawer-footer';
      footer.innerHTML='<div class="mobile-drawer-user">로그인 계정</div><button type="button" class="mobile-logout-btn">로그아웃</button>';
      nav.appendChild(footer);
      footer.querySelector('.mobile-logout-btn').addEventListener('click',function(e){
        e.preventDefault();
        closeMenu();
        const signOut=qs('#signOutBtn');
        if(signOut)signOut.click();
      });
    }

    syncMobileUser();
    nav.querySelectorAll('button[data-page]').forEach(function(button){
      button.addEventListener('click',closeMenu);
    });
  }

  function enhanceScheduleControls(){
    const manual=qs('#openGameModalBtn');
    const sync=qs('#callSyncBtn');
    if(manual)manual.classList.add('schedule-hidden-action');
    if(sync)sync.classList.add('schedule-hidden-action');

    const head=qs('#schedule .calendar-head');
    const prev=qs('#prevMonthBtn');
    const today=qs('#todayBtn');
    const next=qs('#nextMonthBtn');
    if(!head||!prev||!today||!next)return;

    let controls=qs('#calendarNavControls');
    if(!controls){
      controls=document.createElement('div');
      controls.id='calendarNavControls';
      controls.className='calendar-nav-controls';
      head.appendChild(controls);
    }
    prev.classList.add('calendar-nav-btn');
    today.classList.add('calendar-nav-btn','calendar-today-btn');
    next.classList.add('calendar-nav-btn');
    controls.appendChild(prev);
    controls.appendChild(today);
    controls.appendChild(next);
  }



  function linkClockCardHtml(){
    const ticketUrl='https://'+'www.ticketlink.co.kr/sports/baseball/57';
    const checkUrl='https://'+'time.navyism.com/?host=www.ticketlink.co.kr';
    return '<div id="linkClockCard" class="card pad quick-link-card link-clock-card">'
      + '<div><div class="link-clock-title">티켓링크(ticketlink.co.kr)의 서버시간 <a href="'+checkUrl+'" target="_blank" rel="noopener">보정보기</a></div>'
      + '<div class="link-clock-sub">예매 시작 전 확인용 · KST 기준 실시간 표시</div></div>'
      + '<div id="linkClockTime" class="link-clock-time">--:--:<span class="link-clock-sec">--.---</span></div>'
      + '<div class="link-clock-actions"><a class="primary" href="'+ticketUrl+'" target="_blank" rel="noopener">티켓링크 열기</a></div>'
      + '</div>';
  }

  function updateLinkClock(){
    const el=qs('linkClockTime');
    if(!el)return;
    const now=new Date();
    const parts=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now);
    const get=function(type){return (parts.find(p=>p.type===type)||{}).value||'00'};
    const ms=String(now.getMilliseconds()).padStart(3,'0');
    el.innerHTML=get('hour')+':'+get('minute')+':<span class="link-clock-sec">'+get('second')+'.'+ms+'</span>';
  }

  function installQuickLinkDelete(){
    if(window.__quickLinkDeleteInstalled)return;
    window.__quickLinkDeleteInstalled=true;

    function fallbackEsc(s){return String(s??'').replace(/[&<>\"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
    function safeEsc(s){try{return typeof esc==='function'?esc(s):fallbackEsc(s)}catch(e){return fallbackEsc(s)}}

    function enhancedRenderLinks(){
      const root=document.getElementById('linkList');
      if(!root)return;
      const dbLinks=(typeof state!=='undefined'&&Array.isArray(state.links))?state.links:[];
      const defaults=(typeof DEFAULT_LINKS!=='undefined')?DEFAULT_LINKS:[];
      const links=dbLinks.length?dbLinks:defaults;
      root.innerHTML=linkClockCardHtml()+links.map(function(l){
        const canDelete=!!l.id&&dbLinks.length>0;
        return '<div class="card pad quick-link-card">'
          + '<a class="quick-link-main" href="'+safeEsc(l.url)+'" target="_blank" rel="noopener">'
          + '<h3>'+safeEsc(l.title)+'</h3>'
          + '<p class="note">'+safeEsc(l.description||l.url)+'</p>'
          + '</a>'
          + '<div class="quick-link-actions">'
          + '<a class="btn secondary quick-link-open" href="'+safeEsc(l.url)+'" target="_blank" rel="noopener">열기</a>'
          + (canDelete?'<button type="button" class="btn danger quick-link-delete" data-delete-link="'+safeEsc(l.id)+'">삭제</button>':'')
          + '</div></div>';
      }).join('');
    }

    try{renderLinks=enhancedRenderLinks}catch(e){window.renderLinks=enhancedRenderLinks}

    document.body.addEventListener('click',async function(e){
      const btn=e.target.closest('[data-delete-link]');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      const id=btn.dataset.deleteLink;
      const title=btn.closest('.quick-link-card')?.querySelector('h3')?.textContent||'선택한 링크';
      if(!confirm('"'+title+'" 링크를 삭제할까요?'))return;
      btn.disabled=true;
      try{
        const res=await state.client.from('quick_links').delete().eq('id',id);
        if(res.error)throw res.error;
        state.links=state.links.filter(function(x){return String(x.id)!==String(id)});
        enhancedRenderLinks();
        if(typeof toast==='function')toast('링크를 삭제했습니다.');
      }catch(err){
        btn.disabled=false;
        if(typeof toast==='function')toast('링크 삭제 오류: '+(err.message||err));
      }
    },true);

    if(!window.__linkClockInterval){window.__linkClockInterval=setInterval(updateLinkClock,43)}
    setTimeout(function(){try{enhancedRenderLinks();updateLinkClock()}catch(e){}},300);
  }

  function syncMobileUser(){
    const target=qs('#mobileDrawerFooter .mobile-drawer-user');
    const source=qs('#userEmail');
    if(target)target.textContent=(source&&source.textContent.trim())?source.textContent.trim():'로그인 계정';
  }

  function closeMenu(){
    const sidebar=qs('.sidebar');
    const btn=qs('#mobileMenuToggle');
    if(sidebar)sidebar.classList.remove('mobile-menu-open');
    document.body.classList.remove('mobile-menu-open');
    if(btn)btn.setAttribute('aria-expanded','false');
  }

  function closeOnDesktop(){
    if(!isMobileLike())closeMenu();
  }

  function runFixes(){
    injectLayoutFixStyle();
    moveDesktopAccountToolbar();
    ensureMobileDrawer();
    enhanceScheduleControls();
    installQuickLinkDelete();
    syncMobileUser();
    updateLinkClock();
  }

  document.addEventListener('DOMContentLoaded',function(){
    runFixes();
    setInterval(runFixes,1000);
  });
  window.addEventListener('resize',function(){runFixes();closeOnDesktop()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
})();
