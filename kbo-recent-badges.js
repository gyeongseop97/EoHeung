(function(){
  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const TEAM_COLORS={삼성:'#074CA1',LG:'#C30452',KT:'#111111',SSG:'#CE0E2D',KIA:'#EA0029',두산:'#131230',한화:'#FF6600',롯데:'#041E42',키움:'#820024',NC:'#315288'};
  const START={2025:'2025-03-22',2026:'2026-03-28'};
  const trendState={mode:'game',selected:new Set(TEAMS),fingerprint:''};
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
  function blankStats(){return Object.fromEntries(TEAMS.map(t=>[t,{team:t,g:0,w:0,d:0,l:0,pct:0,gb:0}]));}
  function applyGame(stats,g){const a=norm(g.away_team),h=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);if(!stats[a]||!stats[h])return;stats[a].g++;stats[h].g++;if(as>hs){stats[a].w++;stats[h].l++}else if(as<hs){stats[h].w++;stats[a].l++}else{stats[a].d++;stats[h].d++;}}
  function rankedStats(stats){
    const arr=Object.values(stats).map(r=>({...r}));
    arr.forEach(r=>{const denom=r.w+r.l;r.pct=denom?r.w/denom:0});
    arr.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.l-b.l||a.team.localeCompare(b.team));
    const leader=arr[0]||{w:0,l:0};arr.forEach((r,i)=>{r.gb=i?((leader.w-r.w)+(r.l-leader.l))/2:0});
    let rank=0,prev='';arr.forEach((r,i)=>{const k=`${r.pct.toFixed(3)}|${r.w}|${r.l}`;if(k!==prev)rank=i+1;r.rank=rank;prev=k});
    return arr;
  }
  function rows(){
    const stats=blankStats(),gs=finished();
    gs.forEach(g=>applyGame(stats,g));
    const arr=rankedStats(stats);
    arr.forEach(r=>{const res=[];for(let i=gs.length-1;i>=0;i--){const v=result(gs[i],r.team);if(v)res.push(v)}const decisive=res.filter(v=>v!=='D');let type=decisive[0]||'',cnt=0;for(const v of decisive){if(v===type)cnt++;else break}r.streak=cnt?`${cnt}${label(type)}`:'-';r.recent5=res.slice(0,5).reverse();r.nextOpponent=nextOpp(r.team)});
    return arr;
  }
  function badges(list){return Array.isArray(list)&&list.length?`<div class="recent5-badges">${list.map(v=>`<span class="recent-badge ${cls(v)}">${label(v)}</span>`).join('')}</div>`:'-'}
  function render(){
    const root=document.getElementById('kboStandings');if(!root)return;const rs=rows();const total=finished().length;if(!rs.some(r=>r.g>0)){root.innerHTML='<div class="empty">순위 계산에 필요한 전체 경기 결과가 아직 없습니다.</div>';ensureTrendPanel();renderTrend(true);return}
    root.innerHTML=`<table class="kbo-standings-table eo-standings-full eo-game-standings eo-badge-standings"><thead><tr><th>순위</th><th>팀명</th><th>승률</th><th>게임차</th><th>승</th><th>무</th><th>패</th><th>경기</th><th>연속</th><th>최근5경기</th><th>다음경기</th></tr></thead><tbody>${rs.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td class="rank-num">${r.rank}</td><td class="team-cell"><div class="team-cell-inner">${logo(r.team)}<span>${esc(r.team)}</span></div></td><td class="pct">${r.pct.toFixed(3)}</td><td>${r.gb===0?'0.0':r.gb.toFixed(1)}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.g}</td><td>${esc(r.streak)}</td><td class="recent5-cell">${badges(r.recent5)}</td><td class="next-cell">${r.nextOpponent?`${logo(r.nextOpponent)}<span>${esc(r.nextOpponent)}</span>`:'-'}</td></tr>`).join('')}</tbody></table><div class="eo-standings-foot"><span>KBO 정규리그 경기 결과 기반 자동 계산 · 반영 경기 ${total}건 · 시작일 ${seasonStart()}</span><a href="https://sports.news.naver.com/kbaseball/record/index" target="_blank" rel="noopener">전체보기</a></div>`;
    const note=document.querySelector('.kbo-standings-head .note');if(note)note.textContent='KBO 정규리그 경기 결과 기반 자동 계산';
    ensureTrendPanel();renderTrend(false);
  }
  function historySnapshots(){
    const gs=finished(),stats=blankStats(),byDate=new Map();
    gs.forEach(g=>{if(!byDate.has(g.game_date))byDate.set(g.game_date,[]);byDate.get(g.game_date).push(g)});
    const out=[];
    [...byDate.keys()].sort().forEach(date=>{
      byDate.get(date).sort((a,b)=>key(a).localeCompare(key(b))).forEach(g=>applyGame(stats,g));
      const ranked=rankedStats(stats),rankMap={},recordMap={};
      ranked.forEach(r=>{rankMap[r.team]=r.rank;recordMap[r.team]={g:r.g,w:r.w,d:r.d,l:r.l,pct:r.pct}});
      const parts=date.split('-');
      out.push({date,label:`${Number(parts[1])}/${Number(parts[2])}`,month:`${parts[0]}-${parts[1]}`,ranks:rankMap,records:recordMap});
    });
    return out;
  }
  function monthlySnapshots(all){
    const map=new Map();all.forEach(s=>map.set(s.month,s));
    return [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,s])=>{const p=month.split('-');return{...s,label:`${Number(p[1])}월`,monthLabel:`${p[0]}년 ${Number(p[1])}월`}});
  }
  function trendData(){const all=historySnapshots();return trendState.mode==='month'?monthlySnapshots(all):all;}
  function trendFingerprint(){const gs=finished(),last=gs[gs.length-1];return [ymd(),gs.length,last&&last.game_date,last&&last.away_score,last&&last.home_score,trendState.mode,[...trendState.selected].join(',')].join('|');}
  function ensureTrendPanel(){
    const dash=document.getElementById('dashboard'),grid=dash&&dash.querySelector('.dashboard-grid');if(!dash||!grid)return null;
    let card=document.getElementById('kboRankTrendCard');
    if(!card){
      card=document.createElement('div');card.id='kboRankTrendCard';card.className='card pad rank-trend-card';
      card.innerHTML=`<div class="rank-trend-head"><div><h3>KBO 팀별 순위 추이</h3><p>정규리그 결과를 누적해 시점별 순위를 다시 계산합니다.</p></div><div class="rank-trend-mode"><button type="button" data-rank-mode="game" class="active">경기별</button><button type="button" data-rank-mode="month">월별</button></div></div><div class="rank-trend-actions"><button type="button" class="rank-trend-small" data-rank-preset="all">전체 팀</button><button type="button" class="rank-trend-small" data-rank-preset="samsung">삼성만</button><span class="rank-trend-note">경기별 = 각 경기일 종료 시점 · 월별 = 월말(진행월은 최신 경기) 기준</span></div><div id="rankTrendTeams" class="rank-trend-teams"></div><div id="rankTrendChart" class="rank-trend-chart"><div class="empty">순위 추이 데이터를 계산하는 중입니다...</div></div>`;
      grid.insertAdjacentElement('afterend',card);
      card.addEventListener('click',e=>{
        const mode=e.target.closest('[data-rank-mode]');if(mode){trendState.mode=mode.dataset.rankMode;card.querySelectorAll('[data-rank-mode]').forEach(b=>b.classList.toggle('active',b.dataset.rankMode===trendState.mode));renderTrend(true);return}
        const preset=e.target.closest('[data-rank-preset]');if(preset){trendState.selected=preset.dataset.rankPreset==='samsung'?new Set(['삼성']):new Set(TEAMS);renderTrend(true);return}
        const team=e.target.closest('[data-rank-team]');if(team){const t=team.dataset.rankTeam;if(trendState.selected.has(t)){if(trendState.selected.size>1)trendState.selected.delete(t)}else trendState.selected.add(t);renderTrend(true)}
      });
    }
    return card;
  }
  function renderTeamButtons(){
    const root=document.getElementById('rankTrendTeams');if(!root)return;
    root.innerHTML=TEAMS.map(t=>`<button type="button" class="rank-team-btn ${trendState.selected.has(t)?'selected':''} ${t==='삼성'?'samsung':''}" data-rank-team="${t}" style="--team:${TEAM_COLORS[t]}"><span class="rank-team-dot"></span>${esc(t)}</button>`).join('');
  }
  function tickIndices(data){
    if(data.length<=8)return data.map((_,i)=>i);
    if(trendState.mode==='month')return data.map((_,i)=>i);
    const ticks=[0];let prev=data[0]&&data[0].month;
    data.forEach((d,i)=>{if(i&&d.month!==prev){ticks.push(i);prev=d.month}});
    if(ticks[ticks.length-1]!==data.length-1)ticks.push(data.length-1);
    return ticks;
  }
  function svgTrend(data){
    const W=1120,H=430,L=48,R=34,T=22,B=48,pw=W-L-R,ph=H-T-B;
    const x=i=>data.length<=1?L+pw/2:L+(i/(data.length-1))*pw;
    const y=rank=>T+((Number(rank)-1)/9)*ph;
    const selected=TEAMS.filter(t=>trendState.selected.has(t));
    const grid=Array.from({length:10},(_,i)=>{const yy=y(i+1);return `<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" class="rank-grid-line"/><text x="${L-12}" y="${yy+4}" text-anchor="end" class="rank-axis-label">${i+1}위</text>`}).join('');
    const ticks=tickIndices(data).map(i=>`<text x="${x(i)}" y="${H-18}" text-anchor="middle" class="rank-x-label">${esc(data[i].label)}</text>`).join('');
    const monthLines=trendState.mode==='game'?data.map((d,i)=>i>0&&d.month!==data[i-1].month?`<line x1="${x(i)}" y1="${T}" x2="${x(i)}" y2="${H-B}" class="rank-month-line"/>`:'').join(''):'';
    const lines=selected.map(t=>{
      const pts=data.map((d,i)=>`${x(i).toFixed(2)},${y(d.ranks[t]||10).toFixed(2)}`);
      const d=pts.map((p,i)=>(i?'L':'M')+p).join(' '),last=data[data.length-1],lastX=x(data.length-1),lastY=y(last.ranks[t]||10),width=t==='삼성'?3.6:2.3;
      return `<path d="${d}" fill="none" stroke="${TEAM_COLORS[t]}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" class="rank-team-line" data-svg-team="${t}"/><circle cx="${lastX}" cy="${lastY}" r="${t==='삼성'?4.5:3.5}" fill="${TEAM_COLORS[t]}" class="rank-last-point"/>`;
    }).join('');
    return `<svg id="rankTrendSvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="KBO 팀별 순위 추이 그래프"><rect x="${L}" y="${T}" width="${pw}" height="${ph}" class="rank-chart-bg"/>${grid}${monthLines}${lines}${ticks}<line class="rank-hover-line" x1="0" y1="${T}" x2="0" y2="${H-B}" visibility="hidden"/><rect x="${L}" y="${T}" width="${pw}" height="${ph}" fill="transparent" class="rank-hit-area"/></svg>`;
  }
  function bindTrendHover(data){
    const svg=document.getElementById('rankTrendSvg'),wrap=document.querySelector('#rankTrendChart .rank-trend-scroll'),tip=document.getElementById('rankTrendTooltip');if(!svg||!wrap||!tip||!data.length)return;
    const W=1120,L=48,R=34,pw=W-L-R,hover=svg.querySelector('.rank-hover-line'),selected=()=>TEAMS.filter(t=>trendState.selected.has(t));
    function show(e){const rect=svg.getBoundingClientRect(),scale=W/rect.width,px=(e.clientX-rect.left)*scale;let idx=data.length<=1?0:Math.round(((px-L)/pw)*(data.length-1));idx=Math.max(0,Math.min(data.length-1,idx));const xx=data.length<=1?L+pw/2:L+(idx/(data.length-1))*pw;hover.setAttribute('x1',xx);hover.setAttribute('x2',xx);hover.setAttribute('visibility','visible');const s=data[idx],teams=selected().slice().sort((a,b)=>(s.ranks[a]||99)-(s.ranks[b]||99));const head=trendState.mode==='month'?(s.monthLabel||s.label):`${s.date.replaceAll('-','.')} 경기 종료`;tip.innerHTML=`<b>${esc(head)}</b>${teams.map(t=>`<span><i style="background:${TEAM_COLORS[t]}"></i>${esc(t)} <strong>${s.ranks[t]}위</strong></span>`).join('')}`;tip.hidden=false;const host=wrap.getBoundingClientRect(),localX=e.clientX-host.left+wrap.scrollLeft;tip.style.left=Math.max(8,Math.min(wrap.scrollWidth-218,localX+12))+'px';tip.style.top='12px'}
    function hide(){hover.setAttribute('visibility','hidden');tip.hidden=true}
    svg.addEventListener('pointermove',show);svg.addEventListener('pointerdown',show);svg.addEventListener('pointerleave',hide);
  }
  function renderTrend(force){
    const card=ensureTrendPanel(),root=document.getElementById('rankTrendChart');if(!card||!root)return;
    renderTeamButtons();card.querySelectorAll('[data-rank-mode]').forEach(b=>b.classList.toggle('active',b.dataset.rankMode===trendState.mode));
    const fp=trendFingerprint();if(!force&&trendState.fingerprint===fp&&root.querySelector('svg'))return;trendState.fingerprint=fp;
    const data=trendData();if(!data.length){root.innerHTML='<div class="empty">완료된 정규리그 경기가 없어 순위 추이를 표시할 수 없습니다.</div>';return}
    root.innerHTML=`<div class="rank-trend-scroll">${svgTrend(data)}<div id="rankTrendTooltip" class="rank-trend-tooltip" hidden></div></div>`;
    bindTrendHover(data);
  }
  function style(){
    if(document.getElementById('kboRecentBadgesStyle'))return;const s=document.createElement('style');s.id='kboRecentBadgesStyle';s.textContent=`
.recent5-badges{display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap}.recent-badge{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border-radius:4px;font-size:11px;font-weight:900;line-height:1;border:1px solid transparent}.recent-badge.win{color:#059669;border-color:#34d399;background:#ecfdf5}.recent-badge.loss{color:#2563eb;border-color:#60a5fa;background:#eff6ff}.recent-badge.draw{color:#6b7280;border-color:#cbd5e1;background:#f8fafc}.kbo-standings-table.eo-badge-standings th:nth-child(10),.kbo-standings-table.eo-badge-standings td:nth-child(10){width:92px!important}.kbo-standings-table.eo-badge-standings th:nth-child(11),.kbo-standings-table.eo-badge-standings td:nth-child(11){width:58px!important}.kbo-standings-table.eo-badge-standings .recent5-cell{overflow:visible!important;text-overflow:clip!important}
.rank-trend-card{margin-top:18px;min-width:0}.rank-trend-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.rank-trend-head h3{margin:0;font-size:19px}.rank-trend-head p{margin:5px 0 0;color:var(--muted);font-size:12px}.rank-trend-mode{display:inline-flex;padding:3px;border:1px solid var(--line);border-radius:12px;background:#f8fafc;flex:0 0 auto}.rank-trend-mode button{border:0;background:transparent;color:var(--muted);padding:7px 12px;border-radius:9px;font-weight:900;font-size:12px}.rank-trend-mode button.active{background:var(--blue);color:#fff;box-shadow:0 4px 12px rgba(7,76,161,.18)}.rank-trend-actions{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:14px 0 10px}.rank-trend-small{border:1px solid var(--line);background:#fff;color:var(--text);border-radius:9px;padding:6px 9px;font-size:11px;font-weight:900}.rank-trend-note{font-size:11px;color:var(--muted);margin-left:4px}.rank-trend-teams{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.rank-team-btn{--team:#64748b;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:#fff;color:#64748b;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:850;opacity:.5;transition:.15s}.rank-team-btn.selected{opacity:1;color:var(--text);border-color:color-mix(in srgb,var(--team) 48%,#dce5f2);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--team) 35%,transparent)}.rank-team-btn.samsung.selected{font-weight:950}.rank-team-dot{width:9px;height:9px;border-radius:50%;background:var(--team);flex:0 0 auto}.rank-trend-chart{min-width:0}.rank-trend-scroll{position:relative;overflow-x:auto;overflow-y:hidden;border:1px solid var(--line);border-radius:14px;background:#fff}.rank-trend-scroll svg{display:block;width:100%;min-width:760px;height:auto;touch-action:pan-x}.rank-chart-bg{fill:#fff}.rank-grid-line{stroke:#e6edf6;stroke-width:1}.rank-month-line{stroke:#dbe5f1;stroke-width:1;stroke-dasharray:4 5}.rank-axis-label,.rank-x-label{fill:#69778b;font-size:11px;font-weight:700}.rank-team-line{vector-effect:non-scaling-stroke}.rank-last-point{vector-effect:non-scaling-stroke}.rank-hover-line{stroke:#64748b;stroke-width:1;stroke-dasharray:4 4;pointer-events:none;vector-effect:non-scaling-stroke}.rank-hit-area{cursor:crosshair}.rank-trend-tooltip{position:absolute;z-index:5;width:206px;max-height:330px;overflow:auto;padding:10px 11px;border-radius:11px;background:rgba(15,23,42,.94);color:#fff;box-shadow:0 10px 26px rgba(15,23,42,.22);pointer-events:none;font-size:11px}.rank-trend-tooltip>b{display:block;margin-bottom:7px;font-size:12px}.rank-trend-tooltip span{display:flex;align-items:center;gap:6px;padding:2px 0}.rank-trend-tooltip i{width:8px;height:8px;border-radius:50%;flex:0 0 auto}.rank-trend-tooltip strong{margin-left:auto}.theme-excel .rank-trend-mode,.theme-excel .rank-trend-scroll,.theme-excel .rank-team-btn,.theme-excel .rank-trend-small{border-radius:0!important}.theme-excel .rank-trend-mode button{border-radius:0!important}.theme-excel .rank-trend-mode button.active{background:#217346!important}.theme-groupware .rank-trend-mode,.theme-groupware .rank-trend-scroll,.theme-groupware .rank-team-btn,.theme-groupware .rank-trend-small{border-radius:2px!important}.theme-groupware .rank-trend-mode button{border-radius:2px!important}.theme-groupware .rank-trend-mode button.active{background:#174ea6!important}
@media(max-width:900px){.kbo-standings-table.eo-badge-standings{min-width:590px!important}.recent-badge{min-width:17px;height:17px;font-size:10px}.rank-trend-card{padding:14px!important}.rank-trend-head{align-items:stretch;flex-direction:column}.rank-trend-mode{align-self:flex-start}.rank-trend-note{flex-basis:100%;margin:2px 0 0}.rank-trend-scroll svg{min-width:700px}.rank-team-btn{padding:6px 9px}.rank-trend-tooltip{width:190px}}
`;
    document.head.appendChild(s)
  }
  function install(){style();window.buildKboStandings=rows;window.renderKboStandings=render;window.renderKboRankTrend=()=>renderTrend(true);render()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setInterval(render,1200);
})();
