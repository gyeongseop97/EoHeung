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
        sidebar.classList.toggle('mobile-menu-open');
        document.body.classList.toggle('mobile-menu-open',sidebar.classList.contains('mobile-menu-open'));
        btn.setAttribute('aria-expanded',sidebar.classList.contains('mobile-menu-open')?'true':'false');
      });
    }

    nav.querySelectorAll('button').forEach(function(button){
      button.addEventListener('click',closeMenu);
    });
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

  document.addEventListener('DOMContentLoaded',ensureMobileDrawer);
  window.addEventListener('resize',closeOnDesktop);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu()});
})();
