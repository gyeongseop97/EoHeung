(function(){
  function qs(sel){return document.querySelector(sel)}
  function isMobileLike(){return window.innerWidth<=900||window.matchMedia('(hover:none) and (pointer:coarse) and (max-width:920px)').matches}

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
    /* 항상 sidebar의 직접 자식 마지막에 두고, CSS는 fixed/right로 강제한다 */
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
      root.innerHTML=links.map(function(l){
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

    setTimeout(function(){try{enhancedRenderLinks()}catch(e){}},300);
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

  document.addEventListener('DOMContentLoaded',function(){
    ensureMobileDrawer();
    enhanceScheduleControls();
    installQuickLinkDelete();
    setInterval(function(){syncMobileUser();enhanceScheduleControls();ensureMobileDrawer()},1200);
  });
  window.addEventListener('resize',function(){closeOnDesktop();enhanceScheduleControls();ensureMobileDrawer()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
})();
