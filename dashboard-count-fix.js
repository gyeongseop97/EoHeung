(function(){
  function makeText(){
    if(!window.state || !state.games || !state.gameMembers) return '';
    var map={};
    state.games.forEach(function(g){ map[String(g.id)]=g; });
    var watched={};
    var future={};
    state.gameMembers.forEach(function(e){
      if(e && e.attended){
        var g=map[String(e.game_id)];
        if(g){
          if(g.status==='FINISHED') watched[String(g.id)]=g;
          else future[String(g.id)]=g;
        }
      }
    });
    var win=0, lose=0, draw=0;
    Object.keys(watched).forEach(function(id){
      var g=watched[id];
      if(g.result==='W') win++;
      else if(g.result==='L') lose++;
      else if(g.result==='D') draw++;
    });
    var total=Object.keys(watched).length;
    var plan=Object.keys(future).length;
    var text=win+'승'+lose+'패';
    if(draw) text+=draw+'무';
    text+=' ('+total+'경기)';
    if(plan) text+=' · 예정 '+plan+'경기';
    return text;
  }
  function apply(){
    var text=makeText();
    var el=document.getElementById('dashGames');
    if(el && text) el.textContent=text;
    var sub=el && el.closest('.metric') && el.closest('.metric').querySelector('.sub');
    if(sub) sub.textContent='직관 경기 기준, 중복 인원 제외';
  }
  function patch(){
    var original=window.renderDashboard;
    if(typeof original==='function' && !original.eoGameResultPatch){
      var next=function(){ var r=original.apply(this,arguments); apply(); return r; };
      next.eoGameResultPatch=true;
      window.renderDashboard=next;
      try{ renderDashboard=next; }catch(err){}
    }
  }
  function boot(){
    patch(); apply();
    setTimeout(function(){ patch(); apply(); },300);
    setTimeout(function(){ patch(); apply(); },1000);
    setInterval(apply,2000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
