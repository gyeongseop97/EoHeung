(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.EoMyRecords=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const numeric=value=>value==null||String(value).trim()===''?null:Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;
  const id=value=>value==null?'':String(value);
  function self(members,user){
    if(!user?.id)return null;
    const linked=(members||[]).filter(m=>id(m.auth_user_id)===id(user.id));
    if(linked.length)return linked.length===1?linked[0]:null;
    const email=String(user.email||'').trim().toLowerCase();if(!email)return null;
    const matches=(members||[]).filter(m=>!m.auth_user_id&&String(m.email||'').trim().toLowerCase()===email);
    return matches.length===1?matches[0]:null;
  }
  function personalGames(games,entries,memberId){
    if(!memberId)return [];
    const selected=new Map();
    for(const entry of entries||[]){
      if(id(entry.member_id)!==id(memberId)||!(entry.attended||entry.planned))continue;
      const old=selected.get(id(entry.game_id));
      selected.set(id(entry.game_id),{attended:!!(old?.attended||entry.attended),planned:!!(old?.planned||entry.planned)});
    }
    const seen=new Set(),rows=[];
    for(const game of games||[]){
      const entry=selected.get(id(game.id));if(!entry||seen.has(id(game.id)))continue;
      seen.add(id(game.id));
      if(game.status==='FINISHED'&&!entry.attended)continue;
      const rs=numeric(game.samsung_score),ra=numeric(game.opponent_score),finished=game.status==='FINISHED';
      const scored=finished&&rs!=null&&ra!=null;
      const result=scored?(rs>ra?'W':rs<ra?'L':'D'):finished&&['W','L','D'].includes(game.result)?game.result:null;
      rows.push({...game,rs,ra,scored,finished,result,margin:scored?rs-ra:null});
    }
    return rows.sort((a,b)=>(a.game_date+' '+(a.game_time||'')).localeCompare(b.game_date+' '+(b.game_time||''))||id(a.id).localeCompare(id(b.id)));
  }
  function summary(rows){
    const games=rows.filter(g=>g.finished),scored=games.filter(g=>g.scored);
    const wins=games.filter(g=>g.result==='W').length,losses=games.filter(g=>g.result==='L').length,draws=games.filter(g=>g.result==='D').length;
    const rs=scored.reduce((s,g)=>s+g.rs,0),ra=scored.reduce((s,g)=>s+g.ra,0);
    let winStreak=0,lossStreak=0,w=0,l=0;
    for(const game of games){w=game.result==='W'?w+1:0;l=game.result==='L'?l+1:0;winStreak=Math.max(winStreak,w);lossStreak=Math.max(lossStreak,l);}
    const extreme=(key,mode)=>{
      if(!scored.length)return null;
      const value=Math[mode](...scored.map(g=>g[key]));return {value,games:scored.filter(g=>g[key]===value)};
    };
    return {games:games.length,scored:scored.length,pending:rows.filter(g=>!g.finished&&g.status!=='POSTPONED'&&g.status!=='CANCELED'&&g.status!=='CANCELLED').length,
      wins,losses,draws,unknown:games.length-wins-losses-draws,rate:wins+losses?wins/(wins+losses):null,
      rs,ra,diff:rs-ra,avgRs:scored.length?rs/scored.length:null,avgRa:scored.length?ra/scored.length:null,
      highRs:extreme('rs','max'),lowRs:extreme('rs','min'),highRa:extreme('ra','max'),lowRa:extreme('ra','min'),
      bestMargin:extreme('margin','max'),worstMargin:extreme('margin','min'),winStreak,lossStreak,
      shutoutWins:scored.filter(g=>g.ra===0&&g.rs>0).length,shutoutLosses:scored.filter(g=>g.rs===0&&g.ra>0).length,
      close:games.filter(g=>g.scored&&Math.abs(g.margin)===1).length};
  }
  function group(rows,key){
    const grouped=new Map();
    for(const game of rows.filter(g=>g.finished)){const label=key(game);if(!grouped.has(label))grouped.set(label,[]);grouped.get(label).push(game);}
    return Array.from(grouped,([label,games])=>({label,...summary(games)}));
  }
  function filter(rows,{year='ALL',month='ALL',season='ALL'}={},kind=()=>null){
    return rows.filter(g=>(year==='ALL'||String(g.game_date).slice(0,4)===String(year))&&(month==='ALL'||Number(String(g.game_date).slice(5,7))===Number(month))&&(season==='ALL'||kind(g)===season));
  }
  return {self,personalGames,summary,group,filter};
});
