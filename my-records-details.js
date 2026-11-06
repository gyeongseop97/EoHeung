(function(){
  'use strict';
  const archives={},pending=new Map(),attempts=new Map();
  async function ensure(years){
    await Promise.all(Array.from(new Set(years)).filter(year=>/^20\d\d$/.test(String(year))).map(year=>{
      if(archives[year])return archives[year];
      if(pending.has(year))return pending.get(year);
      if(Date.now()-(attempts.get(year)||0)<300000)return null;
      attempts.set(year,Date.now());
      const request=fetch(`data/kbo-game-details/${year}.json`,{cache:'no-cache'}).then(response=>{if(!response.ok)throw Error('details '+response.status);return response.json();}).then(data=>{if(Number(data.year)!==Number(year)||!Array.isArray(data.games))throw Error('Invalid game details');archives[year]=data;return data;}).catch(error=>{console.warn('KBO game details unavailable for '+year,error);return null;}).finally(()=>{pending.delete(year);window.renderMyRecords?.();});
      pending.set(year,request);return request;
    }));
  }
  window.EoGameDetails={ensure,attach:rows=>EoMyRecords.attachDetails(rows,archives)};
})();
