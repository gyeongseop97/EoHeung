(function(){
  const CARD_ID='ticketlinkServerClockCard';
  const STYLE_ID='ticketlinkClockFixStyle';
  function removeLegacyTicketlinkClock(){
    const card=document.getElementById(CARD_ID);if(card)card.remove();
    const style=document.getElementById(STYLE_ID);if(style)style.remove();
  }
  function loadPremiumDefaultTheme(){
    if(document.getElementById('premiumDefaultThemeCss'))return;
    const link=document.createElement('link');
    link.id='premiumDefaultThemeCss';
    link.rel='stylesheet';
    link.href='premium-default-theme.css?v=2';
    document.head.appendChild(link);
  }
  function patchAccountPanel(){
    const panel=document.getElementById('eoAccountPanel');
    if(!panel)return;
    if(!document.getElementById('eoAccountPanelPatchStyle')){
      const s=document.createElement('style');
      s.id='eoAccountPanelPatchStyle';
      s.textContent='.eo-account-panel{width:340px!important}.eo-account-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;align-items:end!important}.eo-account-field{display:grid!important;gap:5px!important;min-width:0!important}.eo-account-field label{font-size:12px!important;font-weight:900!important;color:#475569!important}.eo-account-field input{width:100%!important;box-sizing:border-box!important}.eo-account-theme button.active{border-color:#074ca1!important;background:#eef4ff!important;color:#074ca1!important}@media(max-width:520px){.eo-account-grid{grid-template-columns:1fr!important}.eo-account-panel{left:10px!important;right:10px!important;width:auto!important}}';
      document.head.appendChild(s);
    }
    const name=document.getElementById('eoAccountName');
    const phone=document.getElementById('eoAccountPhone');
    if(name&&phone&&!name.closest('.eo-account-field')){
      const grid=name.parentElement;
      grid.innerHTML='<div class="eo-account-field"><label for="eoAccountName">이름</label></div><div class="eo-account-field"><label for="eoAccountPhone">전화번호</label></div>';
      grid.children[0].appendChild(name);
      grid.children[1].appendChild(phone);
    }
    const labels={default:'기본',groupware:'그룹웨어',excel:'엑셀'};
    document.querySelectorAll('[data-theme-value]').forEach(btn=>{const v=btn.dataset.themeValue;if(labels[v])btn.textContent=labels[v]});
  }
  function loadScript(id,src){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.head.appendChild(s)}
  function loadChat(){loadScript('eoLiveChatScript','live-chat-widget.js?v=8')}
  function loadPhotoFrame(){loadScript('eoPhotoFrameWidget','photo-frame-widget.js?v=13')}
  function loadScheduleTodayFix(){loadScript('eoScheduleTodayFix','schedule-today-fix.js?v=1')}
  function formatAvg(n){return !isFinite(n)?'-':(Number.isInteger(n)?String(n):n.toFixed(1).replace(/\.0$/,''))}
  function setMetric(id,label,value,subText){
    const el=document.getElementById(id);if(!el)return;
    const card=el.closest('.metric');
    const labelEl=card&&card.querySelector('.label');
    const sub=card&&card.querySelector('.sub');
    if(labelEl&&labelEl.textContent!==label)labelEl.textContent=label;
    if(el.textContent!==value)el.textContent=value;
    if(sub&&sub.textContent!==subText)sub.textContent=subText;
  }
  function applyTicketMetrics(){
    try{
      if(typeof state==='undefined'||!Array.isArray(state.games)||!Array.isArray(state.gameMembers))return;
      const gamesById={};
      let completedTickets=0;
      let plannedTickets=0;
      const completedGameIds={};
      state.games.forEach(g=>{gamesById[String(g.id)]=g});
      state.gameMembers.forEach(e=>{
        if(!e||!e.attended)return;
        const g=gamesById[String(e.game_id)];
        if(!g)return;
        if(g.status==='FINISHED'){
          completedTickets++;
          completedGameIds[String(g.id)]=true;
        }else if(g.status!=='POSTPONED'){
          plannedTickets++;
        }
      });
      let ticketText=completedTickets+'매';
      if(plannedTickets)ticketText+=' · 예정 '+plannedTickets+'매';
      const gameCount=Object.keys(completedGameIds).length;
      const avgText=gameCount?formatAvg(completedTickets/gameCount)+'명 / 경기':'-';
      setMetric('dashGames','누적 티켓 기여',ticketText,'전 회원 직관 체크 합산');
      setMetric('dashRate','경기당 평균 참석',avgText,'완료 직관 경기별 평균 인원');
      document.body.classList.add('eo-ticket-metrics-ready');
    }catch(e){console.warn(e)}
  }
  function patchRenderDashboard(){
    try{
      if(typeof window.renderDashboard==='function'&&!window.renderDashboard.__eoTicketMetricFixed){
        const original=window.renderDashboard;
        window.renderDashboard=function(){
          const result=original.apply(this,arguments);
          requestAnimationFrame(applyTicketMetrics);
          return result;
        };
        window.renderDashboard.__eoTicketMetricFixed=true;
      }
    }catch(e){console.warn(e)}
  }
  function watchMetricMutations(){
    const a=document.getElementById('dashGames');
    const b=document.getElementById('dashRate');
    if(!a||!b||window.__eoMetricMutationWatch)return;
    window.__eoMetricMutationWatch=true;
    let pending=false;
    const run=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;applyTicketMetrics()})};
    [a,b,a.closest('.metric'),b.closest('.metric')].filter(Boolean).forEach(node=>new MutationObserver(run).observe(node,{childList:true,subtree:true,characterData:true}));
  }
  function boot(){
    loadPremiumDefaultTheme();
    loadScheduleTodayFix();
    removeLegacyTicketlinkClock();
    loadChat();
    loadPhotoFrame();
    patchAccountPanel();
    patchRenderDashboard();
    applyTicketMetrics();
    watchMetricMutations();
    [100,300,800,1600,3000].forEach(ms=>setTimeout(()=>{loadPremiumDefaultTheme();loadScheduleTodayFix();patchAccountPanel();loadChat();loadPhotoFrame();patchRenderDashboard();applyTicketMetrics();watchMetricMutations()},ms));
    const links=document.getElementById('linkList');
    if(links&&!links.__legacyTicketlinkClockObserver){
      links.__legacyTicketlinkClockObserver=true;
      new MutationObserver(removeLegacyTicketlinkClock).observe(links,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();