(function(){
  function todayParts(){
    var d=new Date();
    var yyyy=d.getFullYear();
    var mm=String(d.getMonth()+1).padStart(2,'0');
    var dd=String(d.getDate()).padStart(2,'0');
    return {year:yyyy,month:d.getMonth()+1,date:yyyy+'-'+mm+'-'+dd};
  }
  function applyToday(force){
    try{
      if(typeof state==='undefined')return false;
      if(!force&&state.__eoScheduleTodayApplied)return true;
      var t=todayParts();
      state.year=t.year;
      state.month=t.month;
      state.selectedDate=t.date;
      state.__eoScheduleTodayApplied=true;
      if(typeof syncSelects==='function')syncSelects();
      if(typeof renderCalendar==='function')renderCalendar();
      if(typeof renderWatchList==='function')renderWatchList();
      if(typeof renderDateDetail==='function')renderDateDetail();
      return true;
    }catch(e){console.warn('schedule today fix',e);return false;}
  }
  function patchRenderCalendar(){
    try{
      if(typeof window.renderCalendar==='function'&&!window.renderCalendar.__eoTodayPatched){
        var original=window.renderCalendar;
        window.renderCalendar=function(){
          if(typeof state!=='undefined'&&!state.__eoScheduleTodayApplied){
            var t=todayParts();
            state.year=t.year;
            state.month=t.month;
            state.selectedDate=t.date;
            state.__eoScheduleTodayApplied=true;
            if(typeof syncSelects==='function')syncSelects();
          }
          return original.apply(this,arguments);
        };
        window.renderCalendar.__eoTodayPatched=true;
      }
    }catch(e){console.warn('calendar patch',e)}
  }
  function boot(){
    patchRenderCalendar();
    [80,250,700,1500,3000].forEach(function(ms){
      setTimeout(function(){patchRenderCalendar();applyToday(false)},ms);
    });
    document.addEventListener('click',function(e){
      if(e.target.closest('button[data-page="schedule"]')||e.target.closest('#todayBtn')){
        setTimeout(function(){applyToday(true)},30);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
