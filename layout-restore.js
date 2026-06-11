(function(){
  function apply(){
    var old=document.getElementById('eoEmergencyLayoutFix');
    if(old) old.remove();
    var st=document.getElementById('eoLayoutRestoreStyle');
    var css=`
      #dashboard.section.active{display:block!important;}
      #dashboard #eoNextWatch{display:none!important;}
      #dashboard .grid4{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:14px!important;
        margin:0 0 18px 0!important;
        width:100%!important;
      }
      #dashboard .dashboard-grid{
        display:grid!important;
        grid-template-columns:1.2fr 1fr 1fr 1fr!important;
        gap:16px!important;
        align-items:start!important;
        width:100%!important;
        margin:0!important;
      }
      #dashboard .metric{min-height:0!important;}
      #dashboard .kbo-standings-card{grid-column:auto!important;grid-row:auto!important;}
      #dashboard .schedule-card{grid-column:auto!important;grid-row:auto!important;}
      #schedule.section.active{display:block!important;}
      #schedule .schedule-layout{
        display:grid!important;
        grid-template-columns:1fr 1.45fr!important;
        gap:18px!important;
        align-items:start!important;
      }
      #schedule #calendar.calendar{
        display:grid!important;
        grid-template-columns:repeat(7,1fr)!important;
        gap:8px!important;
      }
      @media(max-width:1200px){
        #dashboard .grid4{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
        #dashboard .dashboard-grid,#schedule .schedule-layout{grid-template-columns:1fr!important;}
      }
      @media(max-width:720px){
        #dashboard .grid4{grid-template-columns:1fr!important;}
      }
    `;
    if(!st){st=document.createElement('style');st.id='eoLayoutRestoreStyle';document.head.appendChild(st);}
    if(st.textContent!==css) st.textContent=css;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setInterval(apply,1000);
})();
