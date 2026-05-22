(function(){
  function qs(sel){return document.querySelector(sel)}

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

    if(!qs('#mobileMenuToggle')){
      const btn=document.createElement('button');
      btn.id='mobileMenuToggle';
      btn.className='mobile-menu-toggle';
      btn.type='button';
      btn.setAttribute('aria-label','메뉴 열기');
      btn.setAttribute('aria-expanded','false');
      btn.innerHTML='<span></span><span></span><span></span>';
      sidebar.appendChild(btn);
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        const willOpen=!sidebar.classList.contains('mobile-menu-open');
        sidebar.classList.toggle('mobile-menu-open',willOpen);
        document.body.classList.toggle('mobile-menu-open',willOpen);
        btn.setAttribute('aria-expanded',willOpen?'true':'false');
      });
    }

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
    if(window.innerWidth>768&&!window.matchMedia('(hover:none) and (pointer:coarse) and (max-width:920px)').matches){
      closeMenu();
    }
  }

  document.addEventListener('DOMContentLoaded',function(){
    ensureMobileDrawer();
    enhanceScheduleControls();
    setInterval(function(){syncMobileUser();enhanceScheduleControls()},1500);
  });
  window.addEventListener('resize',function(){closeOnDesktop();enhanceScheduleControls()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
})();
