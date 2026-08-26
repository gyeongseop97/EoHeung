(()=>{
  'use strict';

  const TEAMS=['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'];
  const state={mode:'basic',team:'ALL',search:'',cache:null,base:null,loading:false,observer:null};
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=name=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','기아':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null};
  const fmt=(v,d=1)=>v==null||!Number.isFinite(Number(v))?'-':Number(v).toFixed(d);

  const HITTER_COLS=[
    ['name','선수','text',null],['team','팀','text',null],['G','경기','num',0],['PA','타석','num',0],
    ['WAR','승리기여도 (WAR)','num',2],['wRC+','조정득점생산력 (wRC+)','num',1],['BABIP','인플레이 타율 (BABIP)','num',3],
    ['wOBA','가중출루율 (wOBA)','num',3],['ISO','순수장타율 (ISO)','num',3],['BB%','볼넷률 (BB%)','num',1],
    ['K%','삼진률 (K%)','num',1],['RC','득점생산 (RC)','num',1],['SecA','2차 타율 (SecA)','num',3]
  ];
  const PITCHER_COLS=[
    ['name','선수','text',null],['team','팀','text',null],['G','경기','num',0],['IP','이닝','text',null],
    ['WAR','승리기여도 (WAR)','num',2],['FIP','수비무관 평균자책 (FIP)','num',2],['ERA-','조정 평균자책 (ERA-)','num',1],
    ['FIP-','조정 FIP (FIP-)','num',1],['BABIP','인플레이 피안타율 (BABIP)','num',3],['K/9','9이닝당 탈삼진 (K/9)','num',2],
    ['BB/9','9이닝당 볼넷 (BB/9)','num',2],['K/BB','삼진/볼넷 (K/BB)','num',2],['K%','삼진률 (K%)','num',1],
    ['BB%','볼넷률 (BB%)','num',1],['HR/9','9이닝당 피홈런 (HR/9)','num',2],['H/9','9이닝당 피안타 (H/9)','num',2],['LOB%','잔루율 (LOB%)','num',1]
  ];

  function installStyle(){
    if($('#eoAdvancedRecordsStyle'))return;
    const s=document.createElement('style');s.id='eoAdvancedRecordsStyle';s.textContent=`
#records .eo-advanced-view-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 12px}
#records .eo-advanced-view-tabs button{padding:8px 12px;border-radius:9px;background:#f6f8fb;border:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:900;cursor:pointer}
#records .eo-advanced-view-tabs button.active{color:var(--blue);background:#eef5ff;border-color:#bcd6fa}
#records .eo-advanced-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
#records .eo-advanced-toolbar select,#records .eo-advanced-toolbar input{height:38px;border:1px solid var(--line);background:#fff;border-radius:9px;padding:0 10px;color:var(--text)}
#records .eo-advanced-toolbar input{min-width:190px}
#records .eo-advanced-source{font-size:11px;color:var(--muted);margin-left:auto}
#records .eo-advanced-summary{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px}
#records .eo-advanced-chip{font-size:11px;font-weight:800;color:#43546c;background:#f5f8fc;border:1px solid var(--line);padding:6px 9px;border-radius:999px}
body.theme-excel #records .eo-advanced-view-tabs button,body.theme-excel #records .eo-advanced-toolbar select,body.theme-excel #records .eo-advanced-toolbar input{border-radius:0!important}
body.theme-groupware #records .eo-advanced-view-tabs button,body.theme-groupware #records .eo-advanced-toolbar select,body.theme-groupware #records .eo-advanced-toolbar input{border-radius:2px!important}
@media(max-width:900px){#records .eo-advanced-toolbar input{width:100%;min-width:0}.eo-advanced-source{width:100%;margin-left:0!important}}
`;
    document.head.appendChild(s);
  }

  function currentType(body){
    return body.querySelector('[data-player-type].active')?.dataset.playerType || 'hitter';
  }

  function restoreBasic(body){
    [...body.children].forEach(el=>{
      if(el.id==='eoAdvancedViewTabs'||el.id==='eoAdvancedRecordsPane')return;
      if(el.dataset.eoAdvancedHidden==='1'){
        el.style.display=el.dataset.eoAdvancedDisplay||'';
        delete el.dataset.eoAdvancedHidden;delete el.dataset.eoAdvancedDisplay;
      }
    });
    $('#eoAdvancedRecordsPane',body)?.remove();
  }

  function hideBasic(body){
    [...body.children].forEach(el=>{
      if(el.id==='eoAdvancedViewTabs'||el.id==='eoAdvancedRecordsPane')return;
      if(el.querySelector?.('[data-player-type]'))return;
      if(el.dataset.eoAdvancedHidden!=='1'){
        el.dataset.eoAdvancedDisplay=el.style.display||'';
        el.dataset.eoAdvancedHidden='1';
        el.style.display='none';
      }
    });
  }

  function teamFallbackMap(type){
    const rows=type==='hitter'?(state.base?.hitters||[]):(state.base?.pitchers||[]);
    const map=new Map();
    rows.forEach(r=>{if(r?.name&&r?.team&&!map.has(r.name))map.set(r.name,norm(r.team))});
    return map;
  }

  function rowsFor(type){
    const source=type==='hitter'?(state.cache?.hitters||[]):(state.cache?.pitchers||[]);
    const fallback=teamFallbackMap(type);
    const q=state.search.trim().toLowerCase();
    return source.map(r=>({...r,team:norm(r.team)||fallback.get(r.name)||''}))
      .filter(r=>(state.team==='ALL'||r.team===state.team)&&(!q||String(r.name||'').toLowerCase().includes(q)))
      .sort((a,b)=>(num(b.WAR)??-999)-(num(a.WAR)??-999)||String(a.name).localeCompare(String(b.name),'ko-KR'));
  }

  function formatValue(row,key,type,digits){
    if(key==='name'||key==='team'||key==='IP')return esc(row[key]??'-');
    const v=row[key];
    if(type==='num')return fmt(v,digits??1);
    return esc(v??'-');
  }

  function tableHtml(type,rows){
    const cols=type==='hitter'?HITTER_COLS:PITCHER_COLS;
    if(!rows.length)return '<div class="eo-record-empty">조건에 맞는 고급 기록이 없습니다.</div>';
    return `<div class="eo-record-table-wrap"><table class="eo-record-table eo-advanced-table"><thead><tr>${cols.map(c=>`<th>${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.team==='삼성'?'samsung-row':''}">${cols.map(([key,,kind,digits],i)=>`<td class="${i===0?'name-cell':''}">${formatValue(r,key,kind,digits)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderAdvanced(body){
    hideBasic(body);
    let pane=$('#eoAdvancedRecordsPane',body);
    if(!pane){pane=document.createElement('div');pane.id='eoAdvancedRecordsPane';body.appendChild(pane)}
    if(state.loading&&!state.cache){pane.innerHTML='<div class="eo-record-empty">고급지표 데이터를 불러오는 중입니다.</div>';return}
    if(!state.cache){pane.innerHTML='<div class="eo-record-empty">고급지표 데이터를 불러오지 못했습니다.</div>';return}
    const type=currentType(body),rows=rowsFor(type),coverage=type==='hitter'?state.cache?.coverage?.hitters:state.cache?.coverage?.pitchers;
    const updated=state.cache?.updatedAt?new Date(state.cache.updatedAt).toLocaleString('ko-KR'):'';
    pane.innerHTML=`<div class="eo-advanced-toolbar"><select id="eoAdvancedTeam"><option value="ALL">전체 팀</option>${TEAMS.map(t=>`<option value="${t}" ${state.team===t?'selected':''}>${t}</option>`).join('')}</select><input id="eoAdvancedSearch" type="search" placeholder="선수 이름 검색" value="${esc(state.search)}"><span class="eo-advanced-source">${esc(state.cache.source||'세이버메트릭스')} · ${esc(updated)}</span></div><div class="eo-advanced-summary"><span class="eo-advanced-chip">전체 수집 ${coverage??'-'}명</span><span class="eo-advanced-chip">현재 표시 ${rows.length}명</span><span class="eo-advanced-chip">컬럼명 클릭 정렬</span></div>${tableHtml(type,rows)}<div class="eo-record-note">${esc(state.cache.sourceNote||'WAR·wRC+·FIP 등은 분석 사이트의 산식 기준이며 KBO 공식 기본기록과 출처가 다를 수 있습니다.')}</div>`;
  }

  function ensureTabs(){
    const body=$('#eoKboRecordBody');if(!body)return;
    const playerTabs=body.querySelector('.eo-record-mini-tabs [data-player-type]')?.closest('.eo-record-mini-tabs');
    if(!playerTabs){state.mode='basic';return}
    let tabs=$('#eoAdvancedViewTabs',body);
    if(!tabs){
      tabs=document.createElement('div');tabs.id='eoAdvancedViewTabs';tabs.className='eo-advanced-view-tabs';
      tabs.innerHTML='<button type="button" data-advanced-mode="basic">기본 기록</button><button type="button" data-advanced-mode="advanced">고급 지표</button>';
      playerTabs.insertAdjacentElement('afterend',tabs);
    }
    tabs.querySelectorAll('[data-advanced-mode]').forEach(b=>b.classList.toggle('active',b.dataset.advancedMode===state.mode));
    if(state.mode==='advanced')renderAdvanced(body);else restoreBasic(body);
  }

  async function load(){
    if(state.loading||state.cache)return;
    state.loading=true;
    try{
      const stamp=Date.now();
      const [a,b]=await Promise.all([
        fetch(`data/kbo-advanced-records.json?t=${stamp}`,{cache:'no-store'}),
        fetch(`data/kbo-records.json?t=${stamp}`,{cache:'no-store'})
      ]);
      if(!a.ok)throw new Error(`advanced ${a.status}`);
      state.cache=await a.json();
      if(b.ok)state.base=await b.json();
    }catch(e){console.warn('KBO advanced records load failed',e)}finally{state.loading=false;ensureTabs()}
  }

  function bind(){
    if(document.body.dataset.eoAdvancedRecordsBound==='1')return;
    document.body.dataset.eoAdvancedRecordsBound='1';
    document.body.addEventListener('click',e=>{
      const m=e.target.closest('[data-advanced-mode]');
      if(m){state.mode=m.dataset.advancedMode;if(state.mode==='advanced')load();ensureTabs();return}
      if(e.target.closest('[data-player-type]'))setTimeout(ensureTabs,0);
    });
    document.body.addEventListener('change',e=>{
      if(e.target.id==='eoAdvancedTeam'){state.team=e.target.value;ensureTabs()}
    });
    document.body.addEventListener('input',e=>{
      if(e.target.id==='eoAdvancedSearch'){
        state.search=e.target.value;const pos=e.target.selectionStart;ensureTabs();
        const n=$('#eoAdvancedSearch');if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(_){}}
      }
    });
  }

  function install(){
    installStyle();bind();ensureTabs();
    const records=$('#records');
    if(records&&typeof MutationObserver!=='undefined'){
      state.observer=new MutationObserver(()=>requestAnimationFrame(ensureTabs));
      state.observer.observe(records,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
