// Disabled broken layout overrides. Permissions are handled by member-permission-control.js.
(function(){
  function boot(){
    var bad = document.getElementById('eoEmergencyLayoutFix');
    if(bad) bad.remove();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
