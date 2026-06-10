(function(){
  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const START={2025:'2025-03-22',2026:'2026-03-28'};
  const norm=(name)=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const logo=t=>typeof teamLogo==='function'?teamLogo(t,'team-logo'):'';
  const label=r=>r==='W'?'승':r==='L'?'패':r==='D'?'무':'-';
  const cls=r=>r==='W'?'win':r==='L'?'loss':r==='D'?'draw':'none';
  const ymd=()=>String((typeof state!=='undefined'&&state.year)||new Date().getFullYear());
  const seasonStart=()=>START[ymd()]||`${ymd()}-03-22`;
  const key=g=>`${String(g.game_date||'')} ${String(g.game_time||'')}`;
  function fromSamsung(g){if(!g)return null;const opp=norm(g.opponent);const away=g.home_away==='AWAY';return {game_date:g.game_date,game_time:g.game_time,away_team:away?'삼성':opp,home_team:away?opp:'삼성',status:g.status,away_score:g.status==='FINISHED'?(away?g.samsung_score:g.opponent_score):null,home_score:g.status==='FINISHED'?(away?g.opponent_score:g.samsung_score):null,source:g.source,raw_status:g.raw_status,note:g.note};}
  function games(){
    if(typeof state==='undefined')return [];
    const src=(state.allGames&&state.allGames.length)?state.allGames:(state.games||[]).map(fromSamsung);
    const seen=new Set(),start=seasonStart();
    return (src||[]).filter(Boolean).map(g=>({...g,away_team:norm(g.away_team),home_team:norm(g.home_team),away_score:g.away_score===''||g.away_score==null?null:Number(g.away_score),home_score:g.home_score===''||g.home_score==null?null:Number(g.home_score)})).filter(g=>{
      if(!g.game_date||String(g.game_date)<start)return false;
      const chk=(String(g.status||'')+' '+String(g.source||'')+' '+String(g.raw_status||'')+' '+String(g.note||'')).toUpperCase();
      if(/PRESEASON|EXHIBITION|시범/.test(chk))return false;
      const k=[g.game_date,g.game_time||'',g.away_team,g.home_team,g.away_score,g.home_score,g.status].join('|');
      if(seen.has(k))return false;seen.add(k);
      return TEAMS.includes(g.away_team)&&TEAMS.includes(g.home_team);
    }).sort((a,b)=>key(a).localeCompare(key(b)));
  }
  const finished=()=>games().filter(g=>g.status==='FINISHED'&&Number.isFinite(g.away_score)&&Number.isFinite(g.home_score));
  function scheduled(){const d=new Date();const today=typeof toYmd==='function'?toYmd(d):d.toISOString().slice(0,10);return games().filter(g=>g.status!=='FINISHED'&&String(g.game_date||'')>=today).sort((a,b)=>key(a).localeCompare(key(b)));}
  function result(g,t){const a=norm(g.away_team),h=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);if(a!==t&&h!==t)return null;if(as===hs)return'D';return (as>hs?a:h)===t?'W':'L';}
  function nextOpp(t){const g=scheduled().find(x=>x.away_team===t||x.home_team===t);return g?(g.away_team===t?g.home_team:g.away_team):'';}
  function rows(){
    const rows=Object.fromEntries(TEAMS.map(t=>[t,{team:t,g:0,w:0,d:0,l:0,pct:0,gb:0,streak:'-',recent5:[],nextOpponent:''}]));
    const gs=finished();
    gs.forEach(g=>{const a=norm(g.away_team),h=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);if(!rows[a]||!rows[h])return;rows[a].g++;rows[h].g++;if(as>hs){rows[a].w++;rows[h].l++}else if(as<hs){rows[h].w++;rows[a].l++}else{rows[a].d++;rows[h].d++}});
    const arr=Object.values(rows);arr.forEach(r=>{const denom=r.w+r.l;r.pct=denom?r.w/denom:0});
    arr.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.l-b.l||a.team.localeCompare(b.team));
    const leader=arr[0]||{w:0,l:0};arr.forEach((r,i)=>{r.gb=i?((leader.w-r.w)+(r.l-leader.l))/2:0});
    arr.forEach(r=>{const res=[];for(let i=gs.length-1;i>=0;i--){const v=result(gs[i],r.team);if(v)res.push(v)}let type=res[0]||'',cnt=0;for(const v of res){if(v===type)cnt++;else break}r.streak=cnt?`${cnt}${label(type)}`:'-';r.recent5=res.slice(0,5).reverse();r.nextOpponent=nextOpp(r.team)});
    let rank=0,prev='';arr.forEach((r,i)=>{const k=`${r.pct.toFixed(3)}|${r.w}|${r.l}`;if(k!==prev)rank=i+1;r.rank=rank;prev=k});return arr;
  }
  function badges(list){return Array.isArray(list)&&list.length?`<div class="recent5-badges">${list.map(v=>`<span class="recent-badge ${cls(v)}">${label(v)}</span>`).join('')}</div>`:'-'}
  function render(){
    const root=document.getElementById('kboStandings');if(!root)return;const rs=rows();const total=finished().length;if(!rs.some(r=>r.g>0)){root.innerHTML='<div class="empty">순위 계산에 필요한 전체 경기 결과가 아직 없습니다.</div>';return}
    root.innerHTML=`<table class="kbo-standings-table eo-standings-full eo-game-standings eo-badge-standings"><thead><tr><th>순위</th><th>팀명</th><th>승률</th><th>게임차</th><th>승</th><th>무</th><th>패</th><th>경기</th><th>연속</th><th>최근5경기</th><th>다음경기</th></tr></thead><tbody>${rs.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td class="rank-num">${r.rank}</td><td class="team-cell"><div class="team-cell-inner">${logo(r.team)}<span>${esc(r.team)}</span></div></td><td class="pct">${r.pct.toFixed(3)}</td><td>${r.gb===0?'0.0':r.gb.toFixed(1)}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.g}</td><td>${esc(r.streak)}</td><td class="recent5-cell">${badges(r.recent5)}</td><td class="next-cell">${r.nextOpponent?`${logo(r.nextOpponent)}<span>${esc(r.nextOpponent)}</span>`:'-'}</td></tr>`).join('')}</tbody></table><div class="eo-standings-foot"><span>KBO 정규리그 경기 결과 기반 자동 계산 · 반영 경기 ${total}건 · 시작일 ${seasonStart()}</span><a href="https://sports.news.naver.com/kbaseball/record/index" target="_blank" rel="noopener">전체보기</a></div>`;
    const note=document.querySelector('.kbo-standings-head .note');if(note)note.textContent='KBO 정규리그 경기 결과 기반 자동 계산';
  }
  function style(){if(document.getElementById('kboRecentBadgesStyle'))return;const s=document.createElement('style');s.id='kboRecentBadgesStyle';s.textContent='.recent5-badges{display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}.recent-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:4px;font-size:11px;font-weight:900;line-height:1;border:1px solid transparent}.recent-badge.win{color:#059669;border-color:#34d399;background:#ecfdf5}.recent-badge.loss{color:#2563eb;border-color:#60a5fa;background:#eff6ff}.recent-badge.draw{color:#6b7280;border-color:#cbd5e1;background:#f8fafc}.kbo-standings-table.eo-badge-standings th:nth-child(10),.kbo-standings-table.eo-badge-standings td:nth-child(10){width:92px!important}.kbo-standings-table.eo-badge-standings th:nth-child(11),.kbo-standings-table.eo-badge-standings td:nth-child(11){width:58px!important}.kbo-standings-table.eo-badge-standings .recent5-cell{overflow:visible!important;text-overflow:clip!important}@media(max-width:900px){.kbo-standings-table.eo-badge-standings{min-width:590px!important}.recent-badge{min-width:17px;height:17px;font-size:10px}}';document.head.appendChild(s)}
  function install(){style();window.buildKboStandings=rows;window.renderKboStandings=render;render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setInterval(render,1200);
})();
