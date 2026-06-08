(function(){
  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const norm=(name)=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const esc2=(s)=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const logo=(team)=>typeof teamLogo==='function'?teamLogo(team,'team-logo') : '';
  let naverCache=null;
  let naverCacheAt=0;
  const NAVER_TTL=5*60*1000;

  function seasonStart(){const y=(typeof state!=='undefined'&&state.year)||new Date().getFullYear();return `${y}-04-01`;}
  function finishedGames(){
    if(typeof state==='undefined')return [];
    const src=(state.allGames&&state.allGames.length)?state.allGames:[];
    return src.filter(g=>g&&g.status==='FINISHED'&&g.away_score!=null&&g.home_score!=null&&String(g.game_date||'')>=seasonStart()).sort((a,b)=>(String(a.game_date||'')+String(a.game_time||'')).localeCompare(String(b.game_date||'')+String(b.game_time||'')));
  }
  function gameResultFor(g,team){
    const away=norm(g.away_team),home=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);
    if(away!==team&&home!==team)return null;
    if(as===hs)return 'D';
    const win=as>hs?away:home;
    return win===team?'W':'L';
  }
  function buildRows(){
    const rows=Object.fromEntries(TEAMS.map(t=>[t,{team:t,g:0,w:0,d:0,l:0,pct:0,gb:0,streak:'-',recent:'-'}]));
    const games=finishedGames();
    for(const g of games){
      const away=norm(g.away_team),home=norm(g.home_team),as=Number(g.away_score),hs=Number(g.home_score);
      if(!rows[away]||!rows[home])continue;
      rows[away].g++;rows[home].g++;
      if(as>hs){rows[away].w++;rows[home].l++}else if(as<hs){rows[home].w++;rows[away].l++}else{rows[away].d++;rows[home].d++}
    }
    let arr=Object.values(rows);
    arr.forEach(r=>{const denom=r.w+r.l;r.pct=denom?r.w/denom:0;});
    arr.sort((a,b)=>b.pct-a.pct||b.w-a.w||a.l-b.l||a.team.localeCompare(b.team));
    const leader=arr[0]||{w:0,l:0};
    arr.forEach((r,i)=>{r.gb=i===0?0:((leader.w-r.w)+(r.l-leader.l))/2;});
    arr.forEach(r=>{
      const results=[];
      for(let i=games.length-1;i>=0;i--){const res=gameResultFor(games[i],r.team);if(res)results.push(res);}
      let type=results[0]||'',cnt=0;for(const res of results){if(res===type)cnt++;else break;}
      r.streak=cnt?`${cnt}${type==='W'?'승':type==='L'?'패':'무'}`:'-';
      const last=results.slice(0,10);const w=last.filter(x=>x==='W').length,l=last.filter(x=>x==='L').length,d=last.filter(x=>x==='D').length;
      r.recent=last.length?`${w}승-${l}패-${d}무`:'-';
    });
    let rank=0,prev='';
    arr.forEach((r,i)=>{const key=`${r.pct.toFixed(3)}|${r.w}|${r.l}`;if(key!==prev)rank=i+1;r.rank=rank;prev=key;});
    return arr;
  }
  async function loadNaverStandings(force=false){
    if(!force&&naverCache&&Date.now()-naverCacheAt<NAVER_TTL)return naverCache;
    try{
      const res=await fetch('data/kbo-standings.json?v='+(force?Date.now():'1'),{cache:force?'no-store':'default'});
      if(!res.ok)throw new Error('HTTP '+res.status);
      const json=await res.json();
      if(Array.isArray(json.rows)&&json.rows.length>=10){
        naverCache=json;
        naverCacheAt=Date.now();
        return json;
      }
    }catch(e){console.warn('Naver standings data unavailable; falling back to local calculation',e);}
    return null;
  }
  function renderNaver(json){
    const rows=json.rows||[];
    return `<table class="kbo-standings-table eo-standings-full eo-naver-standings"><thead><tr><th>순위</th><th>팀명</th><th>승률</th><th>게임차</th><th>승</th><th>무</th><th>패</th><th>경기</th><th>연속</th><th>타율</th><th>평균자책</th><th>최근5경기</th><th>다음경기</th></tr></thead><tbody>${rows.map(r=>`<tr class="${norm(r.team)==='삼성'?'samsung-row':''}"><td class="rank-num">${esc2(r.rank)}</td><td class="team-cell"><div class="team-cell-inner">${logo(r.team)}<span>${esc2(r.team)}</span></div></td><td class="pct">${esc2(r.pct)}</td><td>${esc2(r.gb)}</td><td>${esc2(r.w)}</td><td>${esc2(r.d)}</td><td>${esc2(r.l)}</td><td>${esc2(r.g)}</td><td>${esc2(r.streak||'-')}</td><td>${esc2(r.batting||'-')}</td><td>${esc2(r.era||'-')}</td><td>${esc2(r.recent5||'-')}</td><td class="next-cell">${r.nextOpponent?`${logo(r.nextOpponent)}<span>${esc2(r.nextOpponent)}</span>`:'-'}</td></tr>`).join('')}</tbody></table><div class="eo-standings-foot"><span>네이버 스포츠 순위 기준 · ${esc2(json.updated_at||'')}</span><a href="https://sports.news.naver.com/kbaseball/record/index" target="_blank" rel="noopener">전체보기</a></div>`;
  }
  function renderLocal(){
    const rows=buildRows();
    if(!rows.some(r=>r.g>0))return '<div class="empty">순위 데이터를 불러오지 못했습니다. KBO 순위 동기화 워크플로우를 실행해 주세요.</div>';
    return `<table class="kbo-standings-table eo-standings-full"><thead><tr><th>순위</th><th>팀명</th><th>경기</th><th>승</th><th>무</th><th>패</th><th>승률</th><th>게임차</th><th>연속</th><th>최근10경기</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}"><td class="rank-num">${r.rank}</td><td class="team-cell"><div class="team-cell-inner">${logo(r.team)}<span>${esc2(r.team)}</span></div></td><td>${r.g}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td class="pct">${r.pct.toFixed(3)}</td><td>${r.gb===0?'0.0':r.gb.toFixed(1)}</td><td>${esc2(r.streak)}</td><td>${esc2(r.recent)}</td></tr>`).join('')}</tbody></table><div class="eo-standings-foot"><span>임시 계산값입니다. 네이버 순위 동기화가 필요합니다.</span><a href="https://sports.news.naver.com/kbaseball/record/index" target="_blank" rel="noopener">전체보기</a></div>`;
  }
  async function render(force=false){
    const root=document.getElementById('kboStandings');if(!root)return;
    root.innerHTML='<div class="empty">네이버 스포츠 순위 데이터를 불러오는 중입니다...</div>';
    const naver=await loadNaverStandings(force);
    root.innerHTML=naver?renderNaver(naver):renderLocal();
    const note=document.querySelector('.kbo-standings-head .note');
    if(note)note.textContent=naver?'네이버 스포츠 순위 기준':'임시 계산값 기준';
  }
  function install(){
    window.buildKboStandings=buildRows;
    window.renderKboStandings=()=>render(true);
    render(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setInterval(()=>render(false),5*60*1000);
})();
