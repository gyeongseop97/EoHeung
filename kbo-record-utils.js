(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EoKboRecordUtils=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const teams=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  function number(value){
    if(value==null)return null;
    const text=String(value).trim().replace(/,/g,'').replace(/%$/,'').replace(/^\+/, '');
    if(!/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(text))return null;
    const n=Number(text);return Number.isFinite(n)?n:null;
  }
  function innings(value){
    const s=String(value??'').trim();
    let m=s.match(/^(?:(\d+)\s+)?([12])\/3$/);if(m)return Number(m[1]||0)+Number(m[2])/3;
    m=s.match(/^(\d+)\.([12])$/);if(m)return Number(m[1])+Number(m[2])/3;
    m=s.match(/^(\d+)?\s*([⅓⅔])$/);if(m)return Number(m[1]||0)+(m[2]==='⅓'?1/3:2/3);
    return number(s);
  }
  // Missing values stay last in both directions, with stable player-name ties.
  function compare(a,b,direction='desc'){
    const missing=v=>v==null||v==='';
    if(missing(a)||missing(b))return missing(a)===missing(b)?0:missing(a)?1:-1;
    const result=typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b),'ko-KR',{numeric:true});
    return direction==='asc'?result:-result;
  }
  function teamGames(cache,rows,isRegular){
    const counts=Object.fromEntries(teams.map(t=>[t,0])),seen=new Set();
    const year=String(cache?.season||new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
    for(const game of rows||[]){
      if(String(game.game_date||'').slice(0,4)!==year||game.status!=='FINISHED'||!isRegular(game,year))continue;
      const key=[game.game_date,game.away_team,game.home_team,(game.game_time||'').slice(0,5)].join('|');
      if(seen.has(key))continue;seen.add(key);
      for(const team of [game.away_team,game.home_team])if(team in counts)counts[team]++;
    }
    // Same snapshot as player PA/IP: no preseason/postseason or later DB games.
    for(const team of cache?.teamHitting||[]){const g=number(team.G);if(team.team in counts&&g>0)counts[team.team]=g;}
    return counts;
  }
  function qualification(value,games,type){
    const n=type==='pitcher'?innings(value):number(value);
    if(!(games>0)||n==null)return null;
    return n+1e-9>=(type==='pitcher'?games:Math.round(games*3.1));
  }
  return {number,innings,compare,teamGames,qualification};
});
