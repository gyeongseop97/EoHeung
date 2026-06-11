(function(){
  function apply(){
    var s=document.getElementById('eoEmergencyLayoutFix');
    if(s) s.remove();
    var st=document.getElementById('eoLayoutRestoreStyle');
    if(st) st.remove();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})();
