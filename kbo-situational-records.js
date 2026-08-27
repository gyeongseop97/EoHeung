(()=>{
  'use strict';

  const state={cache:null,loading:false,observer:null,scheduled:false};
  const $=(s,r=document)=>r.querySelector(s);
  const norm=name=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','기아':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};
  const fmt=(v,d=null)=>v==null||v===''||!Number.isFinite(Number(v))?'-':d==null?String(v):Number(v).toFixed(d);

  const PLAYER_COLS=[
    {key:'SAC',label:'희생번트',title:'희생번트'},
    {key:'SF',label:'희생플라이',title:'희생플라이'},
    {key:'GDP',label:'병살타',title:'병살타'},
    {key:'IBB',label:'고의4구',title:'고의4구'},
    {key:'MH',label:'멀티히트',title:'멀티히트 경기'},
    {key:'RISP',label:'득점권 타율',title:'득점권 타율',digits:3},
    {key:'PH-BA',label:'대타 타율',title:'대타 타율 (PH-BA)',digits:3}
  ];
  const TEAM_COLS=[
    {key:'SAC',label:'희생번트'},
    {key:'SF',label:'희생플라이'},
    {key:'GDP',label:'병살타'},
    {key:'IBB',label:'고의4구'},
    {key:'MH',label:'멀티히트'},
    {key:'RISP',label:'득점권 타율',digits:3},
    {key:'PH-BA',label:'대타 타율',digits:3}
  ];

  function installStyle(){
    if($('#eoSituationalRecordsStyle'))return;
    const s=document.createElement('style');s.id='eoSituationalRecordsStyle';s.textContent=`
#records .eo-record-table th[data-situational-key]{background:#f6f1e6;color:#66532e}
#records .eo-record-table .eo-situational-first{border-left:2px solid #dfcfa5!important;padding-left:12px!important}
#records .eo-situational-note{font-size:11px;color:var(--muted);margin:6px 2px 0}
`;
    document.head.appendChild(s);
  }

  function currentPlayerType(body){
    return body?.querySelector('[data-player-type].active')?.dataset.playerType||null;
  }

  function playerMap(){
    const map=new Map();
    (state.cache?.hitters||[]).forEach(r=>{
      const team=norm(r?.team),name=String(r?.name||'').trim();
      if(team&&name)map.set(`${team}|${name}`,r);
    });
    return map;
  }

  function teamMap(){
    const map=new Map();
    (state.cache?.teamHitting||[]).forEach(r=>{const team=norm(r?.team);if(team)map.set(team,r)});
    return map;
  }

  function headerHtml(col,index){
    return `<th data-situational-key="${col.key}" data-metric-key="${col.key}" class="${index===0?'eo-situational-first':''}" title="${col.title||col.label}">${col.label}</th>`;
  }
  function cellHtml(row,col,index){
    return `<td data-situational-key="${col.key}" class="${index===0?'eo-situational-first':''}">${fmt(row?.[col.key],col.digits)}</td>`;
  }

  function removeOld(table){
    table.querySelectorAll('th[data-situational-key],td[data-situational-key]').forEach(el=>el.remove());
  }

  function insertHeaders(headRow,cols){
    const anchor=headRow.querySelector('th[data-advanced-key]');
    const html=cols.map(headerHtml).join('');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',html);else headRow.insertAdjacentHTML('beforeend',html);
  }

  function insertCells(row,cols,data){
    const anchor=row.querySelector('td[data-advanced-key]');
    const html=cols.map((c,i)=>cellHtml(data,c,i)).join('');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',html);else row.insertAdjacentHTML('beforeend',html);
  }

  function mergePlayer(body,table){
    if(currentPlayerType(body)!=='hitter')return;
    const map=playerMap();
    const head=table.tHead?.rows?.[0],tbody=table.tBodies?.[0];if(!head||!tbody)return;
    removeOld(table);insertHeaders(head,PLAYER_COLS);
    [...tbody.rows].forEach(row=>{
      const name=String(row.cells[0]?.textContent||'').trim();
      const team=norm(row.cells[1]?.textContent||'');
      insertCells(row,PLAYER_COLS,map.get(`${team}|${name}`)||null);
    });
    table.dataset.eoSituational='player';
    addNote(body,'선수 세부기록: 희생번트·희생플라이·병살타·고의4구·멀티히트·득점권 타율·대타 타율을 KBO 공식 기록에서 표시합니다.');
  }

  function mergeTeam(body,table){
    const active=body.querySelector('[data-team-tab].active')?.dataset.teamTab;
    if(active!=='hitting')return;
    const map=teamMap();
    const head=table.tHead?.rows?.[0],tbody=table.tBodies?.[0];if(!head||!tbody)return;
    removeOld(table);insertHeaders(head,TEAM_COLS);
    [...tbody.rows].forEach(row=>{
      const team=norm(row.cells[1]?.textContent||'');
      insertCells(row,TEAM_COLS,map.get(team)||null);
    });
    table.dataset.eoSituational='team';
    addNote(body,'팀 타격 세부기록에도 희생타·병살타·득점권 타율·대타 타율을 함께 표시합니다.');
  }

  function addNote(body,text){
    let note=$('#eoSituationalNote',body);
    if(!note){note=document.createElement('div');note.id='eoSituationalNote';note.className='eo-situational-note';body.appendChild(note)}
    note.textContent=text;
  }

  function merge(){
    const body=$('#eoKboRecordBody');if(!body||!state.cache)return;
    $('#eoSituationalNote',body)?.remove();
    const table=body.querySelector('.eo-record-table');if(!table)return;
    const type=currentPlayerType(body);
    if(type)mergePlayer(body,table);else mergeTeam(body,table);
  }

  function schedule(){
    if(state.scheduled)return;state.scheduled=true;
    requestAnimationFrame(()=>{state.scheduled=false;merge()});
  }

  async function load(){
    if(state.loading)return;state.loading=true;
    try{
      const r=await fetch(`data/kbo-records.json?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw new Error(`records ${r.status}`);
      state.cache=await r.json();
    }catch(e){console.warn('KBO situational records load failed',e)}finally{state.loading=false;schedule()}
  }

  function install(){
    installStyle();load();
    const records=$('#records');
    if(records&&typeof MutationObserver!=='undefined'){
      state.observer=new MutationObserver(schedule);
      state.observer.observe(records,{childList:true,subtree:true});
    }
    document.body.addEventListener('click',e=>{if(e.target.closest('[data-player-type],[data-team-tab],[data-kbo-main],[data-record-main]'))setTimeout(schedule,0)});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
