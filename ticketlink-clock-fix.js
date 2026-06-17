(function(){
  const CARD_ID='ticketlinkServerClockCard';
  const STYLE_ID='ticketlinkClockFixStyle';
  function removeLegacyTicketlinkClock(){
    const card=document.getElementById(CARD_ID);
    if(card)card.remove();
    const style=document.getElementById(STYLE_ID);
    if(style)style.remove();
  }
  function boot(){
    removeLegacyTicketlinkClock();
    const links=document.getElementById('linkList');
    if(links&&!links.__legacyTicketlinkClockObserver){
      links.__legacyTicketlinkClockObserver=true;
      new MutationObserver(removeLegacyTicketlinkClock).observe(links,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
