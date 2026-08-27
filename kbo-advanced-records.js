(()=>{
  'use strict';

  const state={cache:null,loading:false,observer:null,scheduled:false};
  const $=(s,r=document)=>r.querySelector(s);
  const norm=name=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','기아':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const fmt=(v,d)=>v==null||!Number.isFinite(Number(v))?'-':Number(v).toFixed(d);

  const HITTER_COLS=[
    {key:'WAR',label:'WAR',title:'승리기여도 (WAR)',digits:2},
    {key:'wRC+',label:'wRC+',title:'조정득점생산력 (wRC+)',digits:1},
    {key:'BABIP',label:'BABIP',title:'인플레이 타율 (BABIP)',digits:3},
    {key:'wOBA',label:'wOBA',title:'가중출루율 (wOBA)',digits:3},
    {key:'ISO',label:'ISO',title:'순수장타율 (ISO)',digits:3},
    {key:'BB%',label:'BB%',title:'볼넷률 (BB%)',digits:1},
    {key:'K%',label:'K%',title:'삼진률 (K%)',digits:1,lower:true},
    {key:'RC',label:'RC',title:'득점생산 (RC)',digits:1},
    {key:'SecA',label:'SecA',title:'2차 타율 (SecA)',digits:3}
  ];

  const PITCHER_COLS=[
    {key:'WAR',label:'WAR',title:'승리기여도 (WAR)',digits:2},
    {key:'FIP',label:'FIP',title:'수비무관 평균자책 (FIP)',digits:2,lower:true},
    {key:'ERA-',label:'ERA-',title:'조정 평균자책 (ERA-)',digits:1,lower:true},
    {key:'FIP-',label:'FIP-',title:'조정 FIP (FIP-)',digits:1,lower:true},
    {key:'BABIP',label:'BABIP',title:'인플레이 피안타율 (BABIP)',digits:3,lower:true},
    {key:'K/9',label:'K/9',title:'9이닝당 탈삼진 (K/9)',digits:2},
    {key:'BB/9',label:'BB/9',title:'9이닝당 볼넷 (BB/9)',digits:2,lower:true},
    {key:'K/BB',label:'K/BB',title:'삼진/볼넷 (K/BB)',digits:2},
    {key:'K%',label:'K%',title:'삼진률 (K%)',digits:1},
    {key:'BB%',label:'BB%',title:'볼넷률 (BB%)',digits:1,lower:true},
    {key:'HR/9',label:'HR/9',title:'9이닝당 피홈런 (HR/9)',digits:2,lower:true},
    {key:'H/9',label:'H/9',title:'9이닝당 피안타 (H/9)',digits:2,lower:true},
    {key:'LOB%',label:'LOB%',title:'잔루율 (LOB%)',digits:1}
  ];

  function installStyle(){
    if($('#eoAdvancedRecordsStyle'))return;
    const s=document.createElement('style');s.id='eoAdvancedRecordsStyle';s.textContent=`
#records .eo-merged-player-wrap{position:relative}
#records .eo-merged-player-table{width:max-content!important;min-width:100%!important}
#records .eo-merged-player-table th,#records .eo-merged-player-table td{min-width:62px}
#records .eo-merged-player-table th:first-child,#records .eo-merged-player-table td:first-child{position:sticky;left:0;min-width:112px;max-width:150px;z-index:3;box-shadow:5px 0 8px -8px rgba(20,39,68,.65)}
#records .eo-merged-player-table th:first-child{z-index:7;background:#f1f6fd}
#records .eo-merged-player-table td:first-child{background:#fff}
#records .eo-merged-player-table tr.samsung-row td:first-child{background:#f4f9ff}
#records .eo-merged-player-table tr:hover td:first-child{background:#f8fbff}
#records .eo-merged-player-table .eo-advanced-first{border-left:2px solid #bfd3ea!important;padding-left:12px!important}
#records .eo-merged-player-table th[data-advanced-key]{background:#e9f2fd;color:#244d7d}
#records .eo-merged-player-table td[data-advanced-key]{font-variant-numeric:tabular-nums}
#records .eo-advanced-inline-note{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:8px 2px 0;font-size:11px;color:var(--muted);line-height:1.5}
#records .eo-advanced-inline-badge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:#eef5ff;border:1px solid #cbdff6;color:#315b8a;font-weight:800}
body.theme-excel #records .eo-advanced-inline-badge{border-radius:0!important}
body.theme-groupware #records .eo-advanced-inline-badge{border-radius:2px!important}
@media(max-width:900px){#records .eo-merged-player-table th:first-child,#records .eo-merged-player-table td:first-child{min-width:96px;max-width:120px}}
`;
    document.head.appendChild(s);
  }

  function cleanupLegacy(){
    $('#eoAdvancedViewTabs')?.remove();
    $('#eoAdvancedRecordsPane')?.remove();
    const body=$('#eoKboRecordBody');
    if(body){
      [...body.children].forEach(el=>{
        if(el.dataset?.eoAdvancedHidden==='1'){
          el.style.display=el.dataset.eoAdvancedDisplay||'';
          delete el.dataset.eoAdvancedHidden;
          delete el.dataset.eoAdvancedDisplay;
        }
      });
    }
  }

  function currentType(body){
    return body.querySelector('[data-player-type].active')?.dataset.playerType||null;
  }

  function buildMap(type){
    const rows=type==='hitter'?(state.cache?.hitters||[]):(state.cache?.pitchers||[]);
    const map=new Map();
    rows.forEach(r=>{
      const team=norm(r?.team),name=String(r?.name||'').trim();
      if(team&&name)map.set(`${team}|${name}`,r);
    });
    return map;
  }

  function valueHtml(row,col){
    const v=row?.[col.key];
    return `<span title="${esc(col.title)}">${fmt(v,col.digits)}</span>`;
  }

  function advancedHeader(col,index){
    return `<th data-advanced-key="${esc(col.key)}" data-lower-is-better="${col.lower?'1':'0'}" class="${index===0?'eo-advanced-first':''}" title="${esc(col.title)}">${esc(col.label)}</th>`;
  }

  function markSource(body){
    const source=body.querySelector('.eo-record-toolbar .eo-kbo-source');
    if(source&&state.cache){
      source.textContent='기본: KBO 공식 · 고급: 네이버 KBO/공식기록 계산';
      source.title=state.cache.sourceNote||'';
    }
    const existing=$('#eoAdvancedInlineNote',body);
    if(existing)return;
    const wrap=body.querySelector('.eo-record-table-wrap');
    if(!wrap)return;
    const note=document.createElement('div');
    note.id='eoAdvancedInlineNote';note.className='eo-advanced-inline-note';
    note.innerHTML=`<span class="eo-advanced-inline-badge">기본 + 고급지표 통합</span><span>선수명 열은 고정되며, 표를 좌우로 스크롤해 고급지표를 확인할 수 있습니다.</span>`;
    wrap.insertAdjacentElement('afterend',note);
  }

  function mergeIntoPlayerTable(){
    cleanupLegacy();
    const body=$('#eoKboRecordBody');if(!body||!state.cache)return;
    const type=currentType(body);if(!type)return;
    const table=body.querySelector('.eo-record-table');if(!table||!table.tHead||!table.tBodies[0])return;
    const cols=type==='hitter'?HITTER_COLS:PITCHER_COLS;
    const headRow=table.tHead.rows[0];if(!headRow)return;
    const rowCount=table.tBodies[0].rows.length;
    const mergeKey=`${type}|${state.cache.updatedAt||''}|${rowCount}`;

    table.classList.add('eo-merged-player-table');
    table.closest('.eo-record-table-wrap')?.classList.add('eo-merged-player-wrap');
    if(table.dataset.eoAdvancedMergeKey===mergeKey){markSource(body);return}

    headRow.querySelectorAll('th[data-advanced-key]').forEach(th=>th.remove());
    [...table.tBodies[0].rows].forEach(tr=>tr.querySelectorAll('td[data-advanced-key]').forEach(td=>td.remove()));
    headRow.insertAdjacentHTML('beforeend',cols.map(advancedHeader).join(''));

    const map=buildMap(type);
    [...table.tBodies[0].rows].forEach(tr=>{
      const name=String(tr.cells[0]?.textContent||'').trim();
      const team=norm(String(tr.cells[1]?.textContent||'').trim());
      const data=map.get(`${team}|${name}`)||null;
      tr.insertAdjacentHTML('beforeend',cols.map((col,index)=>`<td data-advanced-key="${esc(col.key)}" class="${index===0?'eo-advanced-first':''}">${valueHtml(data,col)}</td>`).join(''));
    });

    table.dataset.eoAdvancedMergeKey=mergeKey;
    markSource(body);
  }

  function scheduleMerge(){
    if(state.scheduled)return;state.scheduled=true;
    requestAnimationFrame(()=>{state.scheduled=false;mergeIntoPlayerTable()});
  }

  function isMeaningfulMutation(mutations){
    return mutations.some(m=>{
      if(m.type!=='childList'||!m.addedNodes.length)return false;
      if(m.target?.id==='eoKboRecordBody')return true;
      return [...m.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.eo-record-table')||node.querySelector?.('.eo-record-table')));
    });
  }

  async function load(){
    if(state.loading||state.cache)return;
    state.loading=true;
    try{
      const r=await fetch(`data/kbo-advanced-records.json?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw new Error(`advanced ${r.status}`);
      state.cache=await r.json();
    }catch(e){console.warn('KBO advanced records load failed',e)}finally{state.loading=false;scheduleMerge()}
  }

  function install(){
    installStyle();cleanupLegacy();load();
    const records=$('#records');
    if(records&&typeof MutationObserver!=='undefined'){
      state.observer=new MutationObserver(mutations=>{if(isMeaningfulMutation(mutations))scheduleMerge()});
      state.observer.observe(records,{childList:true,subtree:true});
    }
    document.body.addEventListener('click',e=>{
      if(e.target.closest('[data-player-type],[data-kbo-main],[data-record-main]'))setTimeout(scheduleMerge,0);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
