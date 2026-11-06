const {test}=require('node:test');
const assert=require('node:assert/strict');
const U=require('../kbo-record-utils.js'),M=require('../my-records-model.js'),S=require('../kbo-season.js');
const cache=require('../data/kbo-records.json');
test('qualification uses the same regular-season snapshot as PA, not preseason/postseason DB totals',()=>{
  const games=Array.from({length:180},(_,i)=>({game_date:'2026-04-01',game_time:String(i),status:'FINISHED',away_team:'삼성',home_team:'LG',season_type:'REGULAR'}));
  const counts=U.teamGames(cache,games,S.isRegular);
  assert.equal(counts['삼성'],144);
  const gu=cache.hitters.find(r=>r.name==='구자욱');assert.equal(gu.PA,497);assert.equal(U.qualification(gu.PA,counts['삼성'],'hitter'),true);
  const qualified=cache.hitters.filter(r=>U.qualification(r.PA,counts[r.team],'hitter')).sort((a,b)=>b.AVG-a.AVG);
  assert.equal(qualified[0].name,'구자욱');assert.equal(qualified[0].AVG,.371);
});
test('fallback counts only unique regular-season finished games in the player-data season',()=>{
  const game={game_date:'2026-04-02',game_time:'18:30',status:'FINISHED',away_team:'삼성',home_team:'KT',season_type:'REGULAR'};
  const games=[game,{...game,id:'duplicate'},{...game,season_type:'PRESEASON',game_date:'2026-03-12'},{...game,season_type:'POSTSEASON',game_date:'2026-11-04'},{...game,game_date:'2025-04-02'},{...game,status:'POSTPONED',game_date:'2026-04-03'}];
  assert.equal(U.teamGames({season:2026},games,S.isRegular)['삼성'],1);
});
test('qualification boundaries and innings distinguish zero from missing',()=>{
  assert.equal(U.qualification(446,144,'hitter'),true);assert.equal(U.qualification(445,144,'hitter'),false);
  assert.equal(U.qualification('',144,'hitter'),null);assert.equal(U.qualification(null,144,'pitcher'),null);
  assert.equal(U.qualification('144',144,'pitcher'),true);assert.equal(U.qualification('143 2/3',144,'pitcher'),false);
  assert.equal(U.innings('1/3'),1/3);assert.equal(U.innings('12.2'),12+2/3);assert.equal(U.innings('12⅓'),12+1/3);
});
test('WAR and other numeric metrics sort both ways, with missing last',()=>{
  const values=['6.14','-1.20','0','10.01','-',null].map(U.number);
  assert.deepEqual(values.toSorted((a,b)=>U.compare(a,b,'desc')),[10.01,6.14,0,-1.2,null,null]);
  assert.deepEqual(values.toSorted((a,b)=>U.compare(a,b,'asc')),[-1.2,0,6.14,10.01,null,null]);
  assert.equal(U.number('.371'),.371);assert.equal(U.number('1,024'),1024);assert.equal(U.number('13.3%'),13.3);
});
test('self identity uses the unique login link, with a safe unlinked-email fallback',()=>{
  const members=[{id:'a',auth_user_id:'u',email:'old@example.test'},{id:'b',email:'new@example.test'}];
  assert.equal(M.self(members,{id:'u',email:'new@example.test'}).id,'a');
  assert.equal(M.self(members,{id:'v',email:' NEW@example.test '}).id,'b');
  assert.equal(M.self(members,null),null);assert.equal(M.self([{id:'x'}],{id:'v'}),null);
  assert.equal(M.self([{id:'x',auth_user_id:'other',email:'a@test'}],{id:'v',email:'a@test'}),null);
  assert.equal(M.self([{id:'x',email:'a@test'},{id:'y',email:'a@test'}],{id:'v',email:'a@test'}),null);
});
const game=(id,date,rs,ra,extra={})=>({id,game_date:date,game_time:'18:30',status:'FINISHED',samsung_score:rs,opponent_score:ra,opponent:'KT',home_away:'HOME',season_type:'REGULAR',...extra});
const games=[game('1','2026-04-01',5,2),game('2','2026-04-02',0,0,{result:'L'}),game('3','2026-05-01',1,9,{home_away:'AWAY'}),game('4','2026-05-02','',null,{result:'W'}),game('5','2026-11-06',null,null,{status:'SCHEDULED',season_type:'POSTSEASON'}),game('6','2026-05-03',null,null,{status:'POSTPONED'}),game('7','2025-04-01',10,0),game('8','2026-05-04',2,1)];
const entries=games.slice(0,7).map(g=>({game_id:g.id,member_id:'me',attended:true,planned:true}));
test('personal history excludes others and duplicate attendance, retains doubleheaders',()=>{
  const rows=M.personalGames([...games,games[0],game('dh2','2026-04-01',3,2,{game_time:'20:00'})],[...entries,entries[0],{game_id:'8',member_id:'other',attended:true},{game_id:'dh2',member_id:'me',attended:true}],'me');
  assert.equal(rows.length,8);assert.equal(rows.filter(g=>g.id==='1').length,1);assert.equal(rows.some(g=>g.id==='8'),false);
  assert.equal(rows.filter(g=>g.game_date==='2026-04-01').length,2);
  assert.equal(M.personalGames(games,entries,null).length,0);
});
test('personal summaries separate score samples, draws, plans and canceled games',()=>{
  const rows=M.filter(M.personalGames(games,entries,'me'),{year:'2026'}),s=M.summary(rows);
  assert.equal(s.games,4);assert.equal(s.scored,3);assert.equal(s.wins,2);assert.equal(s.draws,1);assert.equal(s.losses,1);assert.equal(s.rate,2/3);
  assert.equal(s.rs,6);assert.equal(s.ra,11);assert.equal(s.avgRs,2);assert.equal(s.avgRa,11/3);assert.equal(s.pending,1);
  assert.equal(s.highRs.value,5);assert.equal(s.highRa.value,9);assert.equal(s.bestMargin.value,3);assert.equal(s.worstMargin.value,-8);
  assert.equal(s.highRs.games[0].game_date,'2026-04-01');assert.equal(s.shutoutWins,0);assert.equal(s.shutoutLosses,0);
});
test('month, season and year filters keep statistics and diary on the same games',()=>{
  const rows=M.personalGames(games,entries,'me');
  assert.equal(M.filter(rows,{year:'2026',month:'4'}).length,2);
  assert.equal(M.filter(rows,{season:'POSTSEASON'},S.kind).length,1);
  assert.equal(M.summary(M.filter(rows,{year:'2025'})).rs,10);
  assert.deepEqual(M.group(rows,g=>g.game_date.slice(0,7)).map(r=>r.label),['2025-04','2026-04','2026-05']);
});
test('streaks and extrema include ties without treating a missing score as zero',()=>{
  const rows=M.personalGames([game('a','2026-04-01',8,0),game('b','2026-04-02',8,1),game('c','2026-04-03',2,2),game('d','2026-04-04',0,5)],[...['a','b','c','d'].map(game_id=>({game_id,member_id:'m',attended:true}))],'m');
  const s=M.summary(rows);assert.equal(s.winStreak,2);assert.equal(s.lossStreak,1);assert.equal(s.highRs.games.length,2);assert.equal(s.shutoutWins,1);assert.equal(s.shutoutLosses,1);
});
test('empty or draw-only records never show NaN, Infinity or a made-up win rate',()=>{
  const s=M.summary([]);assert.equal(s.rate,null);assert.equal(s.avgRs,null);assert.equal(s.highRs,null);
  const draw=M.personalGames([game('d','2026-04-01',0,0)],[{game_id:'d',member_id:'m',attended:true}],'m');assert.equal(M.summary(draw).rate,null);
});
test('planned-only attendance never counts as an actual completed visit',()=>{
  assert.equal(M.personalGames([games[0]],[{game_id:'1',member_id:'m',planned:true,attended:false}],'m').length,0);
});
test('attendance pagination orders by its own ID and never asks for a nonexistent game_date',async()=>{
  const all=Array.from({length:1105},(_,id)=>({id,game_id:'g'+id,member_id:'me',attended:true})),orders=[];
  const query={select(){return this},order(column){assert.equal(column,'id');orders.push(column);return this},async range(a,b){return {data:all.slice(a,b+1),error:null}}};
  const result=await S.loadTable({from:table=>{assert.equal(table,'game_members');return query}},'game_members');
  assert.equal(result.data.length,1105);assert.deepEqual(orders,['id','id']);
});
test('official game details attach only to a unique matching date, teams, time and score',()=>{
  const rows=M.personalGames([games[0]],[entries[0]],'me');
  const detail={game_date:'2026-04-01',game_time:'18:30',away_team:'KT',home_team:'삼성',away_score:2,home_score:5,homeRuns:2,strikeouts:8,walkoffWin:false};
  assert.equal(M.attachDetails(rows,{2026:{games:[detail]}})[0].details.homeRuns,2);
  assert.equal(M.attachDetails(rows,{2026:{games:[{...detail,home_score:7}]}})[0].details,null);
  assert.equal(M.attachDetails(rows,{2026:{games:[{...detail,game_time:'14:00'}]}})[0].details,null);
  assert.equal(M.attachDetails(rows,{2026:{games:[detail,{...detail}]}})[0].details,null);
});
test('home runs, pitching strikeouts and walkoffs retain missing-data coverage and known zero',()=>{
  const rows=M.personalGames(games,entries,'me');
  rows[0].details={homeRuns:2,homeRunsAllowed:0,strikeouts:10,struckOut:7,walkoffWin:true,walkoffLoss:false};
  rows[1].details={homeRuns:0,homeRunsAllowed:1,strikeouts:6,struckOut:8,walkoffWin:false,walkoffLoss:false};
  const e=M.summary(rows).events;
  assert.equal(e.coverage,2);assert.equal(e.homeRuns,2);assert.equal(e.homeRunsAllowed,1);assert.equal(e.strikeouts,16);assert.equal(e.struckOut,15);
  assert.equal(e.walkoffWins,1);assert.equal(e.walkoffLosses,0);assert.equal(e.maxStrikeouts.value,10);assert.equal(e.maxHomeRuns.games[0].id,rows[0].id);
  assert.equal(M.summary([]).events.homeRuns,null);assert.equal(M.summary([]).events.walkoffWins,null);
});
