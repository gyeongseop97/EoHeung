(function(){
  function id(x){return document.getElementById(x)}
  function clearAuthKeys(){
    [localStorage,sessionStorage].forEach(function(store){
      try{
        Object.keys(store).forEach(function(k){
          if(String(k).indexOf('chaddxsntnokjjcrwiyb')>-1||String(k).indexOf('supabase')>-1)store.removeItem(k);
        });
      }catch(e){}
    });
  }
  function showLogin(){
    try{if(typeof state!=='undefined'){state.user=null;state.members=[];state.games=[];state.gameMembers=[];state.links=[];state.allGames=[]}}catch(e){}
    if(typeof window.eoShowAuthRoute==='function'){window.eoShowAuthRoute({rememberRoute:false});return}
    var app=id('appView'),auth=id('authView');
    if(app)app.classList.add('hide');
    if(auth)auth.classList.remove('hide');
    if(window.location.pathname!=='/login')window.history.replaceState({auth:true},'','/login');
    document.title='로그인 | 어흥';
    document.body.classList.remove('mobile-menu-open');
    var side=document.querySelector('.sidebar');if(side)side.classList.remove('mobile-menu-open');
    var back=id('mobileMenuBackdrop');if(back)back.classList.remove('show');
    var pw=id('loginPassword');if(pw)pw.value='';
  }
  async function doLogout(e){
    if(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation&&e.stopImmediatePropagation()}
    try{if(typeof state!=='undefined'&&state.client&&state.client.auth)await state.client.auth.signOut()}catch(err){console.warn(err)}
    clearAuthKeys();
    showLogin();
  }
  function isLogout(el){
    if(!el||!el.closest)return false;
    var target=el.closest('#eoAccountOutBtn,#eoHardLogout,#eoLogoutBtn,#accountLogoutBtn,#mobileAccountLogout,.mobile-account-logout,.desktop-account-logout,.eo-account-out,.eo-hard-logout,.account-logout');
    if(target)return true;
    var btn=el.closest('button,a');
    return !!(btn&&String(btn.textContent||'').trim()==='로그아웃');
  }
  function bind(){
    if(window.__eoLogoutFixBound)return;
    window.__eoLogoutFixBound=true;
    document.addEventListener('click',function(e){if(isLogout(e.target))doLogout(e)},true);
    window.eoForceLogout=doLogout;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
