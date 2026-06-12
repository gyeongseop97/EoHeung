(function(){
  function clean(){
    ['eoDashboardRankRow','eoEmergencyLayoutFix','eoLayoutRestoreStyle','eoStableDashboardLayout','eoVisibleDashboardFix','eoDashboardFinalLayoutStyle'].forEach(function(id){var el=document.getElementById(id);if(el)el.remove();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean);else clean();
  setInterval(clean,1000);
})();
