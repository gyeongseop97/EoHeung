const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../kbo-season.js');
const season = require('./fixtures/season-2026.json');
const game = (overrides={}) => ({game_date:'2026-10-15',game_time:'18:30:00',away_team:'삼성',home_team:'KT',
  status:'FINISHED',away_score:3,home_score:1,season_type:'POSTSEASON',postseason_round:'KS',...overrides});

test('regular standings exclude preseason, postseason and other years', () => {
  assert.equal(S.isRegular(game({season_type:'REGULAR'}),2026),true);
  for(const type of ['PRESEASON','POSTSEASON','UNKNOWN']) assert.equal(S.isRegular(game({season_type:type}),2026),false);
  assert.equal(S.isRegular(game({season_type:'REGULAR',game_date:'2027-04-01'}),2026),false);
});
test('legacy playoff rows are recognized against official archive', () => {
  S.archive.set(2026,season);
  const legacy = {...season.games[0]};
  delete legacy.season_type;delete legacy.postseason_round;delete legacy.game_number;
  assert.equal(S.kind(legacy),'POSTSEASON');
  assert.equal(S.isRegular(legacy,2026),false);
  assert.equal(S.kind(game({season_type:undefined,postseason_round:undefined,game_date:'2026-03-10'})),'UNKNOWN');
  assert.equal(S.isRegular(game({season_type:undefined,postseason_round:undefined,game_date:'2026-12-01'}),2026),false);
});
test('compatibility source tags retain round and season type', () => {
  assert.equal(S.round({source:'kbo-english-official POSTSEASON KS game1'}),'KS');
  assert.equal(S.kind({source:'kbo-english-official POSTSEASON PO game1'}),'POSTSEASON');
});
test('same game from archive, all-team DB and Samsung DB appears once', () => {
  const original=season.games[0];
  const result=S.postseason([original,{...original,source_key:'different',away_team:original.away_team==='삼성'?'SAMSUNG':original.away_team}],2026,season);
  assert.equal(result.length,season.games.length);
});
test('wildcard high seed advances with a win or draw', () => {
  const standings=[{team:'KT',rank:4},{team:'삼성',rank:5}];
  for(const [a,h] of [[1,2],[2,2]]) {
    const stages=S.series([game({postseason_round:'WC',away_score:a,home_score:h})],standings);
    assert.equal(stages[0].winner,'KT');
  }
});
test('wildcard low seed needs two actual wins', () => {
  const standings=[{team:'KT',rank:4},{team:'삼성',rank:5}];
  const first=game({postseason_round:'WC',game_number:1});
  assert.equal(S.series([first],standings)[0].winner,null);
  assert.equal(S.series([first,{...first,game_number:2,game_date:'2026-10-16'}],standings)[0].winner,'삼성');
});
test('Korean Series clinches at four wins, skips cancelled games and marks remaining slots', () => {
  const gs=Array.from({length:7},(_,i)=>game({game_date:`2026-11-${String(i+1).padStart(2,'0')}`,game_number:i+1,
    status:i<4?'FINISHED':'SCHEDULED',away_score:i<4?3:null,home_score:i<4?1:null}));
  const stage=S.series(gs)[3];
  assert.equal(stage.winner,'삼성');
  assert.equal(stage.wins['삼성'],4);
  assert.equal(stage.games.filter(g=>g.unnecessary).length,3);
  gs[0].status='CANCELLED';
  assert.equal(S.series(gs)[3].winner,null);
});
test('draws and missing scores cannot fabricate a series winner', () => {
  const gs=Array.from({length:7},(_,i)=>game({game_number:i+1,away_score:0,home_score:0}));
  assert.equal(S.series(gs)[3].winner,null);
  assert.equal(S.isFinished(game({away_score:null})),false);
  assert.equal(S.isFinished(game({home_score:''})),false);
});
test('official season is postseason with 144-game regular standings preserved', () => {
  const info=S.summary([],2026,season);
  assert.equal(info.regularComplete,true);
  assert.equal(info.phase,'POSTSEASON');
  assert.equal(info.champion,null);
  assert.equal(info.season.standings[0].team,'KT');
  assert.ok(info.season.standings.every(r=>r.g===144));
  assert.equal(info.stages[2].winner,'삼성');
  assert.equal(info.stages[3].wins['삼성'],1);
  assert.equal(info.stages[3].wins.KT,1);
});
test('other seasons cannot leak into postseason results', () => {
  assert.equal(S.postseason(season.games,2025,{games:[]}).length,0);
  assert.equal(S.summary([],2027,{games:[],standings:[],regular_complete:false}).phase,'REGULAR');
});
test('pagination retrieves more than Supabase default row limit', async () => {
  const all=Array.from({length:2150},(_,id)=>({id}));
  const client={from:()=>({select:()=>({order:()=>({order:()=>({range:async(a,b)=>({data:all.slice(a,b+1),error:null})})})})})};
  const result=await S.loadTable(client,'games');
  assert.equal(result.data.length,2150);
});
test('archive failure preserves the last verified data', async () => {
  const previous=global.fetch;
  global.fetch=async()=>{throw Error('offline');};
  assert.equal(await S.load(2026,true),null);
  assert.equal(S.archive.get(2026),season);
  global.fetch=previous;
});
test('completed postseason distinguishes final ranking from regular ranking', () => {
  const clone=structuredClone(season);
  let wins=0;
  for(const g of clone.games.filter(g=>g.postseason_round==='KS')) {
    if(g.status==='FINISHED')continue;
    if(wins++>=3)continue;
    g.status='FINISHED';
    g.away_score=g.away_team==='삼성'?5:1;
    g.home_score=g.home_team==='삼성'?5:1;
  }
  const result=S.summary([],2026,clone);
  assert.equal(result.phase,'COMPLETE');
  assert.equal(result.champion,'삼성');
  assert.equal(result.finalStandings[0].team,'삼성');
  assert.equal(result.finalStandings[0].regular_rank,2);
  assert.equal(result.season.standings[0].team,'KT');
  assert.equal(result.finalStandings.length,10);
  assert.equal(result.stages[3].games.filter(g=>g.unnecessary).length,2);
});
test('manual games remain editable before optional DB migration', async () => {
  const payload=game({source:'manual',game_number:3});
  const calls=[];
  const client={from:()=>({insert:async p=>{calls.push(p);return calls.length===1?{error:{code:'PGRST204',message:'column season_type missing'}}:{error:null};}})};
  const result=await S.saveGame(client,payload);
  assert.equal(result.error,null);
  assert.equal(calls.length,2);
  assert.equal(calls[1].season_type,undefined);
  assert.equal(S.kind(calls[1]),'POSTSEASON');
  assert.equal(S.round(calls[1]),'KS');
  assert.equal(S.number(calls[1]),3);
});
