(function(){
  const CARD_ID='ticketlinkServerClockCard';
  const STYLE_ID='ticketlinkClockFixStyle';
  function removeLegacyTicketlinkClock(){
    const card=document.getElementById(CARD_ID);if(card)card.remove();
    const style=document.getElementById(STYLE_ID);if(style)style.remove();
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
  function boot(){
    removeLegacyTicketlinkClock();
    loadChat();
    loadPhotoFrame();
    patchAccountPanel();
    [300,1200,3000].forEach(ms=>setTimeout(()=>{patchAccountPanel();loadChat();loadPhotoFrame()},ms));
    const links=document.getElementById('linkList');
    if(links&&!links.__legacyTicketlinkClockObserver){
      links.__legacyTicketlinkClockObserver=true;
      new MutationObserver(removeLegacyTicketlinkClock).observe(links,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();