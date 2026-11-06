(function(){
  'use strict';
  const panels=[['week','삼성 일정','dashSamsungWeek'],['today','오늘 경기','dashTodayAll'],['yesterday','어제 결과','dashYesterdayAll']];
  let active='week';
  function setTab(value,focus=false){
    active=value;
    const overview=document.getElementById('eoGameOverview');if(!overview)return;
    overview.querySelectorAll('[data-overview-tab]').forEach(button=>{
      const selected=button.dataset.overviewTab===value;
      button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
      if(selected&&focus)button.focus();
    });
    overview.querySelectorAll('[data-overview-panel]').forEach(panel=>{panel.hidden=panel.dataset.overviewPanel!==value;});
  }
  function apply(){
    const board=document.querySelector('#dashboard>.dashboard-grid');if(!board)return;
    let overview=document.getElementById('eoGameOverview');
    if(!overview){
      overview=document.createElement('section');overview.id='eoGameOverview';overview.className='card eo-game-overview';
      overview.setAttribute('aria-label','경기 일정과 결과');
      overview.innerHTML='<div class="eo-overview-head"><div><span class="eo-section-kicker">GAME CENTER</span><h3>경기 일정과 결과</h3></div><button class="eo-text-action" type="button" data-open-calendar>캘린더 보기 ↗</button></div><div class="eo-overview-tabs" role="tablist" aria-label="경기 정보">'+panels.map(([key,title])=>`<button type="button" role="tab" id="overview-tab-${key}" data-overview-tab="${key}" aria-controls="overview-panel-${key}">${title}</button>`).join('')+'</div><div class="eo-overview-panels"></div>';
      overview.addEventListener('click',event=>{
        const tab=event.target.closest('[data-overview-tab]');if(tab)setTab(tab.dataset.overviewTab);
        if(event.target.closest('[data-open-calendar]'))document.querySelector('.nav button[data-page="schedule"]')?.click();
      });
      overview.querySelector('[role=tablist]').addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        const index=panels.findIndex(([key])=>key===active);
        const next=event.key==='Home'?0:event.key==='End'?panels.length-1:(index+(event.key==='ArrowRight'?1:-1)+panels.length)%panels.length;
        event.preventDefault();setTab(panels[next][0],true);
      });
    }
    if(overview.parentElement!==board)board.prepend(overview);
    const root=overview.querySelector('.eo-overview-panels');
    panels.forEach(([key,,id])=>{
      const card=document.getElementById(id)?.closest('.card');if(!card||card===overview)return;
      card.classList.add('eo-overview-panel');card.dataset.overviewPanel=key;card.id=`overview-panel-${key}`;
      card.setAttribute('role','tabpanel');card.setAttribute('aria-labelledby',`overview-tab-${key}`);
      if(card.parentElement!==root)root.appendChild(card);
    });
    setTab(active);
    const today=document.querySelector('.metric.today-game-clickable');
    if(today)today.setAttribute('aria-label','오늘 삼성 경기 상세 보기');
    window.placeSeasonBracket?.();
  }
  function install(){
    document.body.classList.add('eo-layout');window.eoApplyDashboardLayout=apply;apply();
    const previous=window.renderAll;
    if(typeof previous==='function')window.renderAll=function(){const result=previous.apply(this,arguments);apply();return result;};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
