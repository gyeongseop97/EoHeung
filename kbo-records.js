(()=>{
  'use strict';

  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const TEAM_COLORS={삼성:'#074CA1',LG:'#C30452',KT:'#111111',SSG:'#CE0E2D',KIA:'#EA0029',두산:'#131230',한화:'#FF6600',롯데:'#041E42',키움:'#820024',NC:'#315288'};
  const ui={main:'eoheung',kbo:'team',team:'overall',player:'hitter',teamFilter:'ALL',search:'',sort:'AVG'};
  let cache=null,cacheLoading=false,lastGameFingerprint='',searchTimer=null;
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=name=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','기아':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const fmt=(v,d=0)=>v==null||!Number.isFinite(Number(v))?'-':Number(v).toFixed(d);
  const pct=v=>v==null||!Number.isFinite(Number(v))?'-':Number(v).toFixed(3);
  const signed=v=>v==null||!Number.isFinite(Number(v))?'-':(Number(v)>0?'+':'')+Number(v);
  const logo=t=>typeof teamLogo==='function'?teamLogo(t,'team-logo'):'';
  const currentSeason=()=>new Date().getFullYear();

  function installStyle(){
    if($('#eoKboRecordsStyle'))return;
    const s=document.createElement('style');s.id='eoKboRecordsStyle';s.textContent=`
#records .eo-record-main-tabs{display:flex;gap:8px;margin:0 0 16px;padding:5px;background:#eef4fb;border:1px solid var(--line);border-radius:14px;width:max-content;max-width:100%}
#records .eo-record-main-tabs button,#records .eo-kbo-subtabs button,#records .eo-record-mini-tabs button{border:0;background:transparent;color:var(--muted);font-weight:900;cursor:pointer}
#records .eo-record-main-tabs button{padding:10px 16px;border-radius:10px;font-size:14px}
#records .eo-record-main-tabs button.active{background:var(--blue);color:#fff;box-shadow:0 5px 14px rgba(7,76,161,.18)}
#records .eo-kbo-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
#records .eo-kbo-head h3{margin:0;font-size:22px}.eo-kbo-head p{margin:5px 0 0;color:var(--muted);font-size:12px}
#records .eo-kbo-subtabs,#records .eo-record-mini-tabs{display:flex;gap:6px;flex-wrap:wrap}
#records .eo-kbo-subtabs{margin-bottom:14px}.eo-kbo-subtabs button,.eo-record-mini-tabs button{padding:8px 12px;border-radius:9px;background:#f6f8fb;border:1px solid var(--line)!important;font-size:12px}
#records .eo-kbo-subtabs button.active,.eo-record-mini-tabs button.active{color:var(--blue);background:#eef5ff;border-color:#bcd6fa!important}
#records .eo-record-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
#records .eo-record-toolbar select,#records .eo-record-toolbar input{height:38px;border:1px solid var(--line);background:#fff;border-radius:9px;padding:0 10px;color:var(--text);min-width:130px}
#records .eo-record-toolbar input{min-width:190px}
#records .eo-kbo-source{font-size:11px;color:var(--muted);margin-left:auto}
#records .eo-record-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0 14px}
#records .eo-record-card{border:1px solid var(--line);background:#fff;border-radius:13px;padding:13px;min-width:0}
#records .eo-record-card .k{font-size:11px;color:var(--muted);font-weight:800}.eo-record-card .v{font-size:23px;font-weight:950;margin-top:4px;letter-spacing:-.03em}.eo-record-card .s{font-size:11px;color:var(--muted);margin-top:3px}
#records .eo-samsung-card{border-color:#9fc4ef;background:linear-gradient(145deg,#f7fbff,#fff)}
#records .eo-team-name{display:flex;align-items:center;gap:6px;font-weight:900;white-space:nowrap}.eo-team-name img{width:20px!important;height:20px!important;object-fit:contain!important}
#records .eo-record-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:13px;background:#fff}
#records .eo-record-table{width:100%;min-width:850px;border:0!important;border-collapse:collapse;table-layout:auto}
#records .eo-record-table th{position:sticky;top:0;z-index:1;background:#f1f6fd;color:#34445d;font-size:11px;white-space:nowrap;text-align:center;padding:9px 8px}
#records .eo-record-table td{font-size:12px;padding:9px 8px;text-align:center;white-space:nowrap;border-bottom:1px solid #edf2f7}
#records .eo-record-table td.name-cell{text-align:left;font-weight:900}.eo-record-table tr.samsung-row{background:#f4f9ff}.eo-record-table tr:hover{background:#f8fbff}
#records .eo-record-empty{padding:30px 16px;text-align:center;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:13px}
#records .eo-record-note{font-size:11px;color:var(--muted);margin:8px 2px 0;line-height:1.5}
#records .eo-leader-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:10px 0 14px}.eo-leader{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fff}.eo-leader .rank{font-size:11px;color:var(--muted)}.eo-leader b{display:block;margin-top:4px}.eo-leader strong{display:block;font-size:21px;margin-top:5px}.eo-leader.samsung{border-color:#9fc4ef;background:#f5faff}
body.theme-excel #records .eo-record-main-tabs,body.theme-excel #records .eo-record-card,body.theme-excel #records .eo-record-table-wrap,body.theme-excel #records .eo-leader,body.theme-excel #records .eo-record-toolbar select,body.theme-excel #records .eo-record-toolbar input{border-radius:0!important}
body.theme-groupware #records .eo-record-main-tabs,body.theme-groupware #records .eo-record-card,body.theme-groupware #records .eo-record-table-wrap,body.theme-groupware #records .eo-leader,body.theme-groupware #records .eo-record-toolbar select,body.theme-groupware #records .eo-record-toolbar input{border-radius:2px!important}
@media(max-width:900px){#records .eo-record-cards{grid-template-columns:repeat(2,minmax(0,1fr))}#records .eo-kbo-head{flex-direction:column}.eo-kbo-source{margin-left:0!important}.eo-leader-strip{grid-template-columns:1fr!important}#records .eo-record-main-tabs{width:100%}#records .eo-record-main-tabs button{flex:1}.eo-record-toolbar input{width:100%;min-width:0!important}}
`;
    document.head.appendChild(s);
  }

  function ensureStructure(){
    const rec=$('#records');if(!rec)return null;
    let tabs=$('#eoRecordMainTabs');
    let eo=$('#eoheungRecordsPane');
    let kbo=$('#kboRecordsPane');
    if(!tabs){
      tabs=document.createElement('div');tabs.id='eoRecordMainTabs';tabs.className='eo-record-main-tabs';tabs.innerHTML='<button type="button" data-record-main="eoheung" class="active">🦁 어흥 기록</button><button type="button" data-record-main="kbo">⚾ KBO 기록</button>';
      rec.insertBefore(tabs,rec.firstChild);
    }
    if(!eo){eo=document.createElement('div');eo.id='eoheungRecordsPane';tabs.insertAdjacentElement('afterend',eo)}
    if(!kbo){
      kbo=document.createElement('div');kbo.id='kboRecordsPane';kbo.hidden=true;
      kbo.innerHTML='<div class="card pad"><div class="eo-kbo-head"><div><h3>KBO 기록실</h3><p>팀 성적은 어흥 경기 DB, 세부 팀·선수 기록은 KBO 공식 기록실 기준입니다.</p></div><div id="eoKboUpdated" class="eo-kbo-source">기록 데이터 확인 중</div></div><div class="eo-kbo-subtabs"><button type="button" class="active" data-kbo-main="team">팀 기록</button><button type="button" data-kbo-main="player">선수 기록</button></div><div id="eoKboRecordBody"></div></div>';
      eo.insertAdjacentElement('afterend',kbo);
    }
    [...rec.children].forEach(child=>{if(child!==tabs&&child!==eo&&child!==kbo)eo.appendChild(child)});
    return {rec,tabs,eo,kbo};
  }

  function setMain(name){
    const x=ensureStructure();if(!x)return;ui.main=name;
    x.tabs.querySelectorAll('[data-record-main]').forEach(b=>b.classList.toggle('active',b.dataset.recordMain===name));
    x.eo.hidden=name!=='eoheung';x.kbo.hidden=name!=='kbo';
    if(name==='kbo'){loadCache();renderKbo()}
  }

  function gameRows(){
    if(typeof state==='undefined')return [];
    const yr=String(currentSeason());
    return (state.allGames||[]).filter(g=>String(g.game_date||'').startsWith(yr+'-')&&String(g.status||'').toUpperCase()==='FINISHED'&&num(g.away_score)!=null&&num(g.home_score)!=null)
      .map(g=>({...g,away_team:norm(g.away_team),home_team:norm(g.home_team),away_score:Number(g.away_score),home_score:Number(g.home_score)}))
      .filter(g=>TEAMS.includes(g.away_team)&&TEAMS.includes(g.home_team));
  }

  function teamOverall(){
    const stats=Object.fromEntries(TEAMS.map(team=>[team,{team,g:0,w:0,d:0,l:0,rs:0,ra:0,homeG:0,homeW:0,homeD:0,homeL:0,awayG:0,awayW:0,awayD:0,awayL:0}]));
    gameRows().forEach(g=>{
      const a=stats[g.away_team],h=stats[g.home_team];if(!a||!h)return;
      a.g++;h.g++;a.awayG++;h.homeG++;a.rs+=g.away_score;a.ra+=g.home_score;h.rs+=g.home_score;h.ra+=g.away_score;
      if(g.away_score>g.home_score){a.w++;h.l++;a.awayW++;h.homeL++}else if(g.away_score<g.home_score){h.w++;a.l++;h.homeW++;a.awayL++}else{a.d++;h.d++;a.awayD++;h.homeD++}
    });
    const rows=Object.values(stats);rows.forEach(r=>{r.pct=r.w+r.l?r.w/(r.w+r.l):0;r.diff=r.rs-r.ra;r.rpg=r.g?r.rs/r.g:0;r.rapg=r.g?r.ra/r.g:0});
    rows.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.l-b.l||a.team.localeCompare(b.team));
    let rank=0,prev='';rows.forEach((r,i)=>{const key=`${r.pct.toFixed(6)}|${r.w}|${r.l}`;if(key!==prev)rank=i+1;r.rank=rank;prev=key});
    return rows;
  }

  function recordCards(rows){
    const s=rows.find(r=>r.team==='삼성');if(!s)return '';
    return `<div class="eo-record-cards"><div class="eo-record-card eo-samsung-card"><div class="k">삼성 현재 순위</div><div class="v">${s.rank}위</div><div class="s">${s.w}승 ${s.d}무 ${s.l}패</div></div><div class="eo-record-card"><div class="k">삼성 승률</div><div class="v">${pct(s.pct)}</div><div class="s">무승부 제외 승률</div></div><div class="eo-record-card"><div class="k">득실차</div><div class="v">${signed(s.diff)}</div><div class="s">${s.rs}득점 · ${s.ra}실점</div></div><div class="eo-record-card"><div class="k">경기당 득실</div><div class="v">${fmt(s.rpg,1)} / ${fmt(s.rapg,1)}</div><div class="s">득점 / 실점</div></div></div>`;
  }

  function overallTeamTable(){
    const rows=teamOverall();if(!rows.some(r=>r.g))return '<div class="eo-record-empty">전체 경기 결과가 아직 없어 팀 기록을 계산할 수 없습니다.</div>';
    return `${recordCards(rows)}<div class="eo-record-table-wrap"><table class="eo-record-table"><thead><tr><th>순위</th><th>팀</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>승률</th><th>득점</th><th>실점</th><th>득실차</th><th>경기당 득점</th><th>경기당 실점</th><th>홈</th><th>원정</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td>${r.rank}</td><td class="name-cell"><span class="eo-team-name">${logo(r.team)}${esc(r.team)}</span></td><td>${r.g}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${pct(r.pct)}</td><td>${r.rs}</td><td>${r.ra}</td><td><b>${signed(r.diff)}</b></td><td>${fmt(r.rpg,1)}</td><td>${fmt(r.rapg,1)}</td><td>${r.homeW}-${r.homeD}-${r.homeL}</td><td>${r.awayW}-${r.awayD}-${r.awayL}</td></tr>`).join('')}</tbody></table></div><div class="eo-record-note">정규시즌 완료 경기 결과를 기준으로 실시간 재계산합니다.</div>`;
  }

  function officialTeamTable(type){
    const rows=type==='hitting'?(cache?.teamHitting||[]):(cache?.teamPitching||[]);
    if(!rows.length)return '<div class="eo-record-empty">KBO 공식 팀 세부기록을 불러오는 중입니다.</div>';
    if(type==='hitting')return `<div class="eo-record-table-wrap"><table class="eo-record-table"><thead><tr><th>순위</th><th>팀</th><th>AVG</th><th>G</th><th>R</th><th>H</th><th>HR</th><th>RBI</th><th>SB</th><th>BB</th><th>SO</th><th>E</th></tr></thead><tbody>${rows.map(r=>`<tr class="${norm(r.team)==='삼성'?'samsung-row':''}"><td>${r.rank??'-'}</td><td class="name-cell"><span class="eo-team-name">${logo(norm(r.team))}${esc(norm(r.team))}</span></td><td><b>${fmt(r.AVG,3)}</b></td><td>${r.G??'-'}</td><td>${r.R??'-'}</td><td>${r.H??'-'}</td><td>${r.HR??'-'}</td><td>${r.RBI??'-'}</td><td>${r.SB??'-'}</td><td>${r.BB??'-'}</td><td>${r.SO??'-'}</td><td>${r.E??'-'}</td></tr>`).join('')}</tbody></table></div>`;
    return `<div class="eo-record-table-wrap"><table class="eo-record-table"><thead><tr><th>순위</th><th>팀</th><th>ERA</th><th>G</th><th>승</th><th>패</th><th>SV</th><th>HLD</th><th>이닝</th><th>피안타</th><th>피홈런</th><th>볼넷</th><th>탈삼진</th><th>실점</th></tr></thead><tbody>${rows.map(r=>`<tr class="${norm(r.team)==='삼성'?'samsung-row':''}"><td>${r.rank??'-'}</td><td class="name-cell"><span class="eo-team-name">${logo(norm(r.team))}${esc(norm(r.team))}</span></td><td><b>${fmt(r.ERA,2)}</b></td><td>${r.G??'-'}</td><td>${r.W??'-'}</td><td>${r.L??'-'}</td><td>${r.SV??'-'}</td><td>${r.HLD??'-'}</td><td>${esc(r.IP??'-')}</td><td>${r.H??'-'}</td><td>${r.HR??'-'}</td><td>${r.BB??'-'}</td><td>${r.SO??'-'}</td><td>${r.R??'-'}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function teamView(){
    const body=$('#eoKboRecordBody');if(!body)return;
    body.innerHTML=`<div class="eo-record-mini-tabs"><button type="button" data-team-tab="overall" class="${ui.team==='overall'?'active':''}">종합</button><button type="button" data-team-tab="hitting" class="${ui.team==='hitting'?'active':''}">타격</button><button type="button" data-team-tab="pitching" class="${ui.team==='pitching'?'active':''}">투수</button></div><div id="eoTeamRecordContent">${ui.team==='overall'?overallTeamTable():officialTeamTable(ui.team)}</div>${ui.team==='overall'?'':'<div class="eo-record-note">타격·투수 세부기록은 KBO 공식 기록실 수집값입니다.</div>'}`;
  }

  function metricOptions(){
    if(ui.player==='hitter')return [['AVG','타율'],['OPS','OPS'],['HR','홈런'],['RBI','타점'],['H','안타'],['R','득점']];
    return [['ERA','ERA'],['W','승'],['SO','탈삼진'],['SV','세이브'],['HLD','홀드'],['WHIP','WHIP']];
  }
  function sortedPlayers(){
    const rows=[...(ui.player==='hitter'?(cache?.hitters||[]):(cache?.pitchers||[]))];
    const q=ui.search.trim().toLowerCase();
    let filtered=rows.filter(r=>(ui.teamFilter==='ALL'||norm(r.team)===ui.teamFilter)&&(!q||String(r.name||'').toLowerCase().includes(q)));
    const key=ui.sort,asc=['ERA','WHIP'].includes(key);
    filtered.sort((a,b)=>{const av=num(a[key]),bv=num(b[key]);if(av==null&&bv==null)return 0;if(av==null)return 1;if(bv==null)return-1;return asc?av-bv:bv-av});
    return filtered;
  }
  function leaderStrip(rows){
    return `<div class="eo-leader-strip">${rows.slice(0,3).map((r,i)=>`<div class="eo-leader ${norm(r.team)==='삼성'?'samsung':''}"><div class="rank">${i+1}위 · ${esc(norm(r.team))}</div><b>${esc(r.name)}</b><strong>${['AVG','OPS'].includes(ui.sort)?fmt(r[ui.sort],3):['ERA','WHIP'].includes(ui.sort)?fmt(r[ui.sort],2):r[ui.sort]??'-'}</strong></div>`).join('')}</div>`;
  }
  function playerTable(rows){
    if(!rows.length)return '<div class="eo-record-empty">조건에 맞는 선수 기록이 없습니다.</div>';
    if(ui.player==='hitter')return `<div class="eo-record-table-wrap"><table class="eo-record-table"><thead><tr><th>선수</th><th>팀</th><th>AVG</th><th>G</th><th>PA</th><th>H</th><th>HR</th><th>RBI</th><th>R</th><th>OBP</th><th>SLG</th><th>OPS</th></tr></thead><tbody>${rows.map(r=>`<tr class="${norm(r.team)==='삼성'?'samsung-row':''}"><td class="name-cell">${esc(r.name)}</td><td>${esc(norm(r.team))}</td><td><b>${fmt(r.AVG,3)}</b></td><td>${r.G??'-'}</td><td>${r.PA??'-'}</td><td>${r.H??'-'}</td><td>${r.HR??'-'}</td><td>${r.RBI??'-'}</td><td>${r.R??'-'}</td><td>${fmt(r.OBP,3)}</td><td>${fmt(r.SLG,3)}</td><td><b>${fmt(r.OPS,3)}</b></td></tr>`).join('')}</tbody></table></div>`;
    return `<div class="eo-record-table-wrap"><table class="eo-record-table"><thead><tr><th>선수</th><th>팀</th><th>ERA</th><th>G</th><th>승</th><th>패</th><th>SV</th><th>HLD</th><th>IP</th><th>SO</th><th>WHIP</th></tr></thead><tbody>${rows.map(r=>`<tr class="${norm(r.team)==='삼성'?'samsung-row':''}"><td class="name-cell">${esc(r.name)}</td><td>${esc(norm(r.team))}</td><td><b>${fmt(r.ERA,2)}</b></td><td>${r.G??'-'}</td><td>${r.W??'-'}</td><td>${r.L??'-'}</td><td>${r.SV??'-'}</td><td>${r.HLD??'-'}</td><td>${esc(r.IP??'-')}</td><td>${r.SO??'-'}</td><td><b>${fmt(r.WHIP,2)}</b></td></tr>`).join('')}</tbody></table></div>`;
  }
  function playerView(){
    const body=$('#eoKboRecordBody');if(!body)return;
    const metric=metricOptions();if(!metric.some(([k])=>k===ui.sort))ui.sort=metric[0][0];
    const rows=sortedPlayers();
    body.innerHTML=`<div class="eo-record-mini-tabs"><button type="button" data-player-type="hitter" class="${ui.player==='hitter'?'active':''}">타자</button><button type="button" data-player-type="pitcher" class="${ui.player==='pitcher'?'active':''}">투수</button></div><div class="eo-record-toolbar"><select id="eoPlayerTeam"><option value="ALL">전체 팀</option>${TEAMS.map(t=>`<option value="${t}" ${ui.teamFilter===t?'selected':''}>${t}</option>`).join('')}</select><select id="eoPlayerSort">${metric.map(([k,l])=>`<option value="${k}" ${ui.sort===k?'selected':''}>${l} 순</option>`).join('')}</select><input id="eoPlayerSearch" type="search" placeholder="선수 이름 검색" value="${esc(ui.search)}"><span class="eo-kbo-source">${cache?.scopeNote?esc(cache.scopeNote):'KBO 기록 데이터 준비 중'}</span></div>${leaderStrip(rows)}${playerTable(rows)}<div class="eo-record-note">선수 기록은 KBO 공식 기록실의 현재 기본기록 표에 노출되는 선수 범위입니다. 표 안에서는 선택한 항목으로 다시 정렬할 수 있습니다.</div>`;
  }

  function updateSource(){
    const el=$('#eoKboUpdated');if(!el)return;
    if(cache?.updatedAt){const d=new Date(cache.updatedAt);el.textContent=`KBO 공식 기록 · ${d.toLocaleString('ko-KR')} 갱신`}else el.textContent=cacheLoading?'KBO 기록 갱신 중':'KBO 기록 대기 중';
  }
  function renderKbo(){
    ensureStructure();updateSource();
    document.querySelectorAll('#kboRecordsPane [data-kbo-main]').forEach(b=>b.classList.toggle('active',b.dataset.kboMain===ui.kbo));
    if(ui.kbo==='team')teamView();else playerView();
  }

  async function loadCache(force=false){
    if(cacheLoading)return;if(cache&&!force){updateSource();return}cacheLoading=true;updateSource();
    try{const r=await fetch(`data/kbo-records.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));cache=await r.json()}catch(e){console.warn('KBO records cache load failed',e)}finally{cacheLoading=false;renderKbo()}
  }

  function bind(){
    if(document.body.dataset.eoKboRecordsBound==='1')return;document.body.dataset.eoKboRecordsBound='1';
    document.body.addEventListener('click',e=>{
      const main=e.target.closest('[data-record-main]');if(main){setMain(main.dataset.recordMain);return}
      const km=e.target.closest('[data-kbo-main]');if(km){ui.kbo=km.dataset.kboMain;renderKbo();return}
      const tt=e.target.closest('[data-team-tab]');if(tt){ui.team=tt.dataset.teamTab;renderKbo();return}
      const pt=e.target.closest('[data-player-type]');if(pt){ui.player=pt.dataset.playerType;ui.sort=ui.player==='hitter'?'AVG':'ERA';renderKbo();return}
    });
    document.body.addEventListener('change',e=>{
      if(e.target.id==='eoPlayerTeam'){ui.teamFilter=e.target.value;renderKbo()}
      if(e.target.id==='eoPlayerSort'){ui.sort=e.target.value;renderKbo()}
    });
    document.body.addEventListener('input',e=>{
      if(e.target.id!=='eoPlayerSearch')return;
      ui.search=e.target.value;
      const pos=e.target.selectionStart;
      if(searchTimer)clearTimeout(searchTimer);
      searchTimer=setTimeout(()=>{
        playerView();
        const n=$('#eoPlayerSearch');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}
      },140);
    });
  }

  function gameFingerprint(){const rows=gameRows(),last=rows[rows.length-1];return `${rows.length}|${last?.game_date||''}|${last?.away_score||''}|${last?.home_score||''}`}
  function normalize(){const x=ensureStructure();if(!x)return;[...x.rec.children].forEach(child=>{if(child!==x.tabs&&child!==x.eo&&child!==x.kbo)x.eo.appendChild(child)});const fp=gameFingerprint();if(fp!==lastGameFingerprint){lastGameFingerprint=fp;if(ui.main==='kbo'&&ui.kbo==='team'&&ui.team==='overall')renderKbo()}}
  function install(){installStyle();ensureStructure();bind();normalize();setInterval(()=>{if(ui.main==='kbo'&&ui.kbo==='team'&&ui.team==='overall'&&$('#records')?.classList.contains('active'))normalize()},30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
