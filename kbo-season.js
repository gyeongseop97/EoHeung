(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EoSeason = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const rounds = [
    {id:'WC', name:'와일드카드', target:2},
    {id:'준PO', name:'준플레이오프', target:3},
    {id:'PO', name:'플레이오프', target:3},
    {id:'KS', name:'한국시리즈', target:4}
  ];
  const names = {SAMSUNG:'삼성',LIONS:'삼성',DOOSAN:'두산',HANWHA:'한화',LOTTE:'롯데',KIWOOM:'키움',HEROES:'키움','엘지':'LG'};
  const norm = value => names[String(value || '').trim().toUpperCase()] || String(value || '').trim().toUpperCase();
  const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
  const archive = new Map();
  const pending = new Map();
  const start = year => ({2025:'2025-03-22',2026:'2026-03-28'}[year] || `${year}-03-01`);
  const score = value => value === '' || value == null ? null : Number(value);
  const key = game => [game.game_date, norm(game.away_team), norm(game.home_team), (game.game_time || '').slice(0,5)].join('|');
  const number = game => game.game_number || Number(String(game.source || '').match(/\bgame(\d+)\b/i)?.[1]) || null;
  const sourceTag = game => [game.source || 'manual',game.season_type,game.postseason_round,number(game)?`game${number(game)}`:''].filter(Boolean).join(' ');
  async function saveGame(client, payload, id) {
    const save = row => id ? client.from('games').update(row).eq('id',id) : client.from('games').insert(row);
    let result = await save(payload);
    if (result.error?.code==='PGRST204' && /season_type|postseason_round|game_number/.test(result.error.message || '')) {
      const {season_type,postseason_round,game_number,...legacy} = payload;
      legacy.source=sourceTag(payload);
      result=await save(legacy);
    }
    return result;
  }
  function fromSamsung(game) {
    const away = game.home_away === 'AWAY';
    return {...game, away_team:away?'삼성':game.opponent, home_team:away?game.opponent:'삼성',
      away_score:away?game.samsung_score:game.opponent_score, home_score:away?game.opponent_score:game.samsung_score};
  }
  function round(game) {
    if (rounds.some(r => r.id === game.postseason_round)) return game.postseason_round;
    const text = [game.postseason_round,game.raw_status,game.note,game.memo,game.source].join(' ').toUpperCase();
    if (/KOREAN SERIES|한국시리즈|\bKS\b/.test(text)) return 'KS';
    if (/WILD|와일드/.test(text)) return 'WC';
    if (/SEMI|준플레이|준PO/.test(text)) return '준PO';
    if (/PLAYOFF|PLAY-OFF|플레이오프|\bPO\b/.test(text)) return 'PO';
    if (/\bWC\b/.test(text)) return 'WC';
    return null;
  }
  function kind(game, season = archive.get(Number(String(game.game_date).slice(0,4)))) {
    if (['REGULAR','PRESEASON','POSTSEASON'].includes(game.season_type)) return game.season_type;
    if (round(game)) return 'POSTSEASON';
    const text = [game.status,game.source,game.raw_status,game.note,game.memo].join(' ').toUpperCase();
    if (/PRESEASON|PRE-SEASON|EXHIBITION|시범/.test(text)) return 'PRESEASON';
    if (/POSTSEASON|포스트시즌/.test(text)) return 'POSTSEASON';
    if ((season?.games || []).some(g => key(g) === key(game))) return 'POSTSEASON';
    if (/REGULAR|정규/.test(text)) return 'REGULAR';
    if (/\bUNKNOWN\b/.test(text)) return 'UNKNOWN';
    const year = Number(String(game.game_date).slice(0,4));
    const firstPost = season?.games?.map(g => g.game_date).sort()[0];
    // Legacy rows have no TYPE. Exclude dates at/after a verified postseason
    // boundary instead of silently folding unclassified games into standings.
    if (!game.game_date || game.game_date < start(year) || (firstPost && game.game_date >= firstPost)) return 'UNKNOWN';
    return game.season_type === 'UNKNOWN' ? 'UNKNOWN' : 'REGULAR';
  }
  function isRegular(game, year) {
    return String(game.game_date || '').slice(0,4) === String(year) && kind(game) === 'REGULAR';
  }
  function isFinished(game) {
    return game.status === 'FINISHED' && score(game.away_score) !== null && score(game.home_score) !== null &&
      Number.isFinite(score(game.away_score)) && Number.isFinite(score(game.home_score));
  }
  function postseason(games, year, season = archive.get(Number(year))) {
    const combined = new Map();
    // The official archive repairs metadata on old DB rows and remains usable
    // before a database migration. DB updates take precedence for actual scores.
    for (const game of season?.games || []) combined.set(key(game), {...game});
    for (const game of games || []) {
      if (String(game.game_date || '').slice(0,4) !== String(year) || kind(game,season) !== 'POSTSEASON') continue;
      const previous = combined.get(key(game));
      combined.set(key(game), {...previous, ...game,
        postseason_round:game.postseason_round || previous?.postseason_round,
        game_number:game.game_number || previous?.game_number});
    }
    return [...combined.values()].filter(g => String(g.game_date).slice(0,4) === String(year))
      .map(g => ({...g,away_team:norm(g.away_team),home_team:norm(g.home_team)}))
      .sort((a,b) => `${a.game_date} ${a.game_time || ''}`.localeCompare(`${b.game_date} ${b.game_time || ''}`));
  }
  function series(games, standings = []) {
    return rounds.map(def => {
      const matches = games.filter(g => round(g) === def.id);
      const teams = [...new Set(matches.flatMap(g => [norm(g.away_team),norm(g.home_team)]))];
      const wins = Object.fromEntries(teams.map(t => [t,0]));
      const higher = [...teams].sort((a,b) => (standings.find(r => norm(r.team)===a)?.rank || 99) - (standings.find(r => norm(r.team)===b)?.rank || 99))[0];
      const knownSeed = standings.some(r => norm(r.team)===higher);
      let winner = null, draws = 0;
      const decorated = matches.map((g,index) => {
        const unnecessary = !!winner && !isFinished(g);
        if (!winner && isFinished(g)) {
          const a = score(g.away_score), h = score(g.home_score);
          if (a === h) draws++;
          else wins[a > h ? norm(g.away_team) : norm(g.home_team)]++;
          winner = teams.find(t => wins[t] >= def.target) || null;
          if (def.id === 'WC' && knownSeed && (wins[higher] >= 1 || draws >= 1)) winner = higher;
        }
        return {...g,game_number:number(g)||index+1,unnecessary,conditional:Number(number(g)||index+1)>def.target};
      });
      return {...def,games:decorated,teams,wins,draws,winner};
    });
  }
  function summary(games, year, season = archive.get(Number(year))) {
    const post = postseason(games,year,season);
    const stages = series(post,season?.standings || []);
    const champion = stages.find(r => r.id==='KS')?.winner;
    const regularComplete = season?.regular_complete === true;
    let finalStandings = null;
    if (champion && regularComplete && stages.every(r => r.winner && r.teams.length===2)) {
      const order=[champion,...[...stages].reverse().map(r => r.teams.find(t => t!==r.winner)),...season.standings.map(r => r.team)];
      finalStandings=[...new Set(order)].map((team,i) => ({...season.standings.find(r => norm(r.team)===team),rank:i+1,regular_rank:season.standings.find(r => norm(r.team)===team)?.rank}));
    }
    const phase = champion ? 'COMPLETE' : post.some(isFinished) || post.some(g => g.game_date <= today()) ? 'POSTSEASON' : regularComplete ? 'REGULAR_COMPLETE' : 'REGULAR';
    return {year:Number(year),season,post,stages,champion,regularComplete,finalStandings,phase};
  }
  async function load(year, force = false) {
    year = Number(year);
    if (!force && archive.has(year)) return archive.get(year);
    if (pending.has(year)) return pending.get(year);
    const request = (async () => {
      try {
        const response = await fetch(`/data/kbo-seasons/${year}.json?t=${Math.floor(Date.now()/300000)}`,{cache:'no-store'});
        if (!response.ok) return null;
        const data = await response.json();
        if (data.year !== year || !Array.isArray(data.standings) || data.standings.length !== 10 || !Array.isArray(data.games)) return null;
        archive.set(year,data);
        return data;
      } catch (_) { return null; }
      finally { pending.delete(year); }
    })();
    pending.set(year,request);
    return request;
  }
  async function loadTable(client, table) {
    // Supabase's default 1000-row limit otherwise truncates multi-year results.
    const rows = [];
    for (let from=0;;from+=1000) {
      let query = client.from(table).select('*');
      // Attendance rows reference a game; they do not have their own game_date.
      if (table !== 'game_members') query = query.order('game_date');
      const result = await query.order('id').range(from,from+999);
      if (result.error) return result;
      rows.push(...(result.data || []));
      if ((result.data || []).length < 1000) return {data:rows,error:null};
    }
  }
  return {rounds,norm,today,key,number,sourceTag,saveGame,fromSamsung,round,kind,isRegular,isFinished,postseason,series,summary,load,loadTable,archive};
});
