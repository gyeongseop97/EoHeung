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
    if(qs('eoInitialMobileFixStyle'))return;
    var s=document.createElement('style');
    s.id='eoInitialMobileFixStyle';
    s.textContent='@media(max-width:900px){#eoAccountFixed,#eoAccountPanel{display:none!important}#mobileMenuToggle{right:12px!important;top:12px!important;z-index:90020!important}.mobile-menu-backdrop{z-index:90000!important}.sidebar.mobile-menu-open{z-index:90010!important}.sidebar.mobile-menu-open #mobileDrawerFooter{display:grid!important;gap:8px;margin-top:14px;padding:12px;border-top:1px solid rgba(255,255,255,.18)}.mobile-drawer-user{font-size:12px;color:#dbeafe;word-break:break-all}.mobile-logout-btn{border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.10);color:#fff;border-radius:10px;padding:9px 10px;font-weight:900}}';
    document.head.appendChild(s);
  }
  function patchLoadAll(){
    if(typeof window.loadAll!=='function'||window.loadAll.__eoInitialPatched)return;
    var original=window.loadAll;
    window.loadAll=async function(){
      ensureStatusNodes();
      window.__eoLoadAllInFlight=true;
      try{return await original.apply(this,arguments)}
      finally{window.__eoLoadAllInFlight=false;window.__eoInitialLoadDone=!!(window.state&&Array.isArray(state.members)&&Array.isArray(state.games)&&Array.isArray(state.gameMembers))}
    };
    window.loadAll.__eoInitialPatched=true;
  }
  async function retryInitialLoad(){
    try{
      ensureStatusNodes();
      patchLoadAll();
      if(window.__eoLoadAllInFlight)return;
      if(typeof window.loadAll!=='function')return;
      if(typeof window.state==='undefined'||!state.user||!state.client)return;
      var app=document.getElementById('appView');
      if(app&&app.classList.contains('hide'))return;
      var hasData=(Array.isArray(state.members)&&state.members.length>0)||(Array.isArray(state.games)&&state.games.length>0)||(Array.isArray(state.gameMembers)&&state.gameMembers.length>0);
      if(hasData){window.__eoInitialLoadDone=true;return}
      if(window.__eoInitialRetryCount>=3)return;
      window.__eoInitialRetryCount=(window.__eoInitialRetryCount||0)+1;
      await window.loadAll();
    }catch(e){console.warn('initial load retry',e)}
  }
  function boot(){
    ensureStatusNodes();
    installMobileAccountFix();
    patchLoadAll();
    [80,250,600,1200,2500,4500].forEach(function(ms){setTimeout(function(){ensureStatusNodes();installMobileAccountFix();patchLoadAll();retryInitialLoad()},ms)});
    document.addEventListener('visibilitychange',function(){if(!document.hidden)retryInitialLoad()});
    document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#reloadAllBtn'))ensureStatusNodes()},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
