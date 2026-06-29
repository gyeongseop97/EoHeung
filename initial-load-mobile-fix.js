(function(){
  function qs(id){return document.getElementById(id)}
  function ensureStatusNodes(){
    var host=document.querySelector('.syncbox')||document.body;
    var db=qs('dbStatus');
    if(!db){db=document.createElement('span');db.id='dbStatus';db.style.display='none';db.textContent='연결 준비 중';host.appendChild(db)}
    var btn=qs('reloadAllBtn');
    if(!btn){btn=document.createElement('button');btn.id='reloadAllBtn';btn.type='button';btn.style.display='none';host.appendChild(btn)}
  }
  function installMobileAccountFix(){
    var s=qs('eoInitialMobileFixStyle');
    var css='@media(max-width:900px){.syncbox,.topbar>.toolbar,#desktopAccountActions,#desktopAccountPanel,#eoAccountFixed,#eoAccountPanel,#eoHardAccount,#eoHardPop,#eoNewAccount,#eoAccountPop,#eoCleanAccount,#eoCleanPop,#accountShell,#accountPanel,.account-shell,.account-strip,.account-pop,.eo-account-fixed,.eo-account-panel,.eo-hard-account,.eo-hard-pop,.eo-new-account,.eo-account-pop,.eo-clean-account,.eo-clean-pop{display:none!important;visibility:hidden!important;pointer-events:none!important}#mobileMenuToggle{position:fixed!important;right:12px!important;top:12px!important;z-index:95020!important;width:44px!important;height:44px!important;margin:0!important}.mobile-menu-backdrop{z-index:95000!important}.sidebar.mobile-menu-open{z-index:95010!important}.sidebar.mobile-menu-open #mobileDrawerFooter{display:grid!important;gap:8px;margin-top:14px;padding:12px;border-top:1px solid rgba(255,255,255,.18)}.sidebar:not(.mobile-menu-open) #mobileDrawerFooter{display:none!important}.mobile-drawer-user{font-size:12px;color:#dbeafe;word-break:break-all}.mobile-logout-btn{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:#fff;border-radius:10px;padding:9px 10px;font-weight:900}}';
    if(!s){s=document.createElement('style');s.id='eoInitialMobileFixStyle';document.head.appendChild(s)}
    if(s.textContent!==css)s.textContent=css;
  }
  function requiredDataReady(){
    if(typeof window.state==='undefined')return false;
    var membersReady=Array.isArray(state.members)&&state.members.length>0;
    var gamesReady=Array.isArray(state.games)&&state.games.length>0;
    var gameMembersReady=Array.isArray(state.gameMembers);
    var linksReady=Array.isArray(state.links);
    var allGamesReady=Array.isArray(state.allGames);
    return membersReady&&gamesReady&&gameMembersReady&&linksReady&&allGamesReady;
  }
  function patchLoadAll(){
    if(typeof window.loadAll!=='function'||window.loadAll.__eoInitialPatched)return;
    var original=window.loadAll;
    window.loadAll=async function(){
      ensureStatusNodes();
      window.__eoLoadAllInFlight=true;
      try{return await original.apply(this,arguments)}
      finally{window.__eoLoadAllInFlight=false;window.__eoInitialLoadDone=requiredDataReady()}
    };
    window.loadAll.__eoInitialPatched=true;
  }
  async function retryInitialLoad(){
    try{
      ensureStatusNodes();
      installMobileAccountFix();
      patchLoadAll();
      if(window.__eoLoadAllInFlight)return;
      if(typeof window.loadAll!=='function')return;
      if(typeof window.state==='undefined'||!state.user||!state.client)return;
      var app=document.getElementById('appView');
      if(app&&app.classList.contains('hide'))return;
      if(requiredDataReady()){window.__eoInitialLoadDone=true;return}
      if(window.__eoInitialRetryCount>=6)return;
      window.__eoInitialRetryCount=(window.__eoInitialRetryCount||0)+1;
      await window.loadAll();
    }catch(e){console.warn('initial load retry',e)}
  }
  function boot(){
    ensureStatusNodes();
    installMobileAccountFix();
    patchLoadAll();
    [80,250,600,1200,2200,3600,5500,8000].forEach(function(ms){setTimeout(function(){installMobileAccountFix();retryInitialLoad()},ms)});
    window.addEventListener('resize',installMobileAccountFix);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)retryInitialLoad()});
    document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#reloadAllBtn'))ensureStatusNodes()},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
