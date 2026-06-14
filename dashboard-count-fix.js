(function(){
  function fixCount(){
    try{
      if(!window.state||!state.games||!state.gameMembers)return;
      var done={};
      var plan={};
      state.gameMembers.forEach(function(e){
        if(!e||!e.attended)return;
        var g=state.games.find(function(x){return String(x.id)===String(e.game_id)});
        if(!g)return;
        if(g.status==='FINISHED')done[g.id]=1;else plan[g.id]=1;
      });
      var a=Object.keys(done).length;
      var b=Object.keys(plan).length;
      var el=document.getElementById('dashGames');
      if(el)el.textContent=b?a+'('+b+')':String(a);
    }catch(e){}
  }
  function start(){
    var old=window.renderDashboard;
    if(typeof old==='function'&&!old.__uniqueCount){
      var wrapped=function(){var r=old.apply(this,arguments);fixCount();return r};
      wrapped.__uniqueCount=true;
      window.renderDashboard=wrapped;
      try{renderDashboard=wrapped}catch(e){}
    }
    fixCount();
    setTimeout(fixCount,500);
    setTimeout(fixCount,1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
