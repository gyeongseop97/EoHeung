(()=>{
  'use strict';

  const HEADER_LABELS={
    AVG:'타율', G:'경기', PA:'타석', AB:'타수', R:'득점', H:'안타', '2B':'2루타', '3B':'3루타', HR:'홈런', TB:'루타', RBI:'타점',
    SAC:'희생번트', SF:'희생플라이', BB:'볼넷', HBP:'몸에 맞는 공', SO:'탈삼진', GDP:'병살타', SB:'도루', CS:'도루실패', E:'실책',
    IBB:'고의4구', MH:'멀티히트', 'PH-BA':'대타 타율',
    OBP:'출루율', SLG:'장타율', OPS:'OPS (출루율+장타율)', RISP:'득점권 타율',
    ERA:'평균자책점', W:'승', L:'패', SV:'세이브', HLD:'홀드', IP:'이닝', WHIP:'이닝당 출루허용률 (WHIP)',
    ER:'자책점', RA:'실점', BF:'상대한 타자', QS:'퀄리티스타트'
  };

  const LOWER_IS_BETTER=new Set([
    '순위','평균자책점','이닝당 출루허용률 (WHIP)','실점','경기당 실점','패','실책','도루실패','병살타',
    '수비무관 평균자책 (FIP)','조정 평균자책 (ERA-)','조정 FIP (FIP-)','인플레이 피안타율 (BABIP)',
    '9이닝당 볼넷 (BB/9)','볼넷률 (BB%)','9이닝당 피홈런 (HR/9)','9이닝당 피안타 (H/9)'
  ]);

  const HITTER_QUALIFIED_KEYS=new Set(['AVG','OBP','SLG','OPS','RISP','wRC+','BABIP','wOBA','ISO','BB%','K%','SecA']);
  const PITCHER_QUALIFIED_KEYS=new Set(['ERA','WHIP','FIP','ERA-','FIP-','BABIP','K/9','BB/9','K/BB','K%','BB%','HR/9','H/9','LOB%']);
  const TEAM_NAMES=new Set(['삼성','LG','KT','SSG','KIA','두산','한화','롯데','키움','NC']);
  let observer=null,scheduled=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const normTeam=name=>{const raw=String(name||'').trim();const map={'SAMSUNG':'삼성','LIONS':'삼성','삼성':'삼성','LG':'LG','엘지':'LG','KT':'KT','SSG':'SSG','KIA':'KIA','기아':'KIA','두산':'두산','DOOSAN':'두산','한화':'한화','HANWHA':'한화','롯데':'롯데','LOTTE':'롯데','키움':'키움','KIWOOM':'키움','HEROES':'키움','NC':'NC'};return map[raw]||map[raw.toUpperCase()]||raw};

  function translateHeader(raw){
    const text=String(raw||'').trim();
    return HEADER_LABELS[text]||text;
  }

  function translateMetricOptions(root){
    root.querySelectorAll('#eoPlayerSort option').forEach(option=>{
      const key=String(option.value||'').trim();
      const label=HEADER_LABELS[key]||({AVG:'타율',HR:'홈런',RBI:'타점',H:'안타',R:'득점',W:'승',SV:'세이브',HLD:'홀드'}[key]);
      if(label)option.textContent=`${label} 순`;
    });
  }

  function parseRecord(text){
    const m=String(text||'').trim().match(/^(-?\d+)\s*-\s*(-?\d+)\s*-\s*(-?\d+)$/);
    if(!m)return null;
    const w=Number(m[1]),d=Number(m[2]),l=Number(m[3]);
    const pct=(w+l)?w/(w+l):0;
    return pct*1000000+w*1000-d-l/1000;
  }

  function parseInnings(text){
    const s=String(text||'').trim();
    let m=s.match(/^(\d+)\s+(1|2)\/3$/);
    if(m)return Number(m[1])+Number(m[2])/3;
    m=s.match(/^(\d+)\.(1|2)$/);
    if(m)return Number(m[1])+Number(m[2])/3;
    m=s.match(/^(\d+)\s*([⅓⅔])$/);
    if(m)return Number(m[1])+(m[2]==='⅓'?1/3:2/3);
    if(/^\d+(?:\.\d+)?$/.test(s))return Number(s);
    return null;
  }

  function sortableValue(text,header){
    const s=String(text||'').replace(/[▲▼]/g,'').trim();
    if(header==='홈'||header==='원정'){
      const record=parseRecord(s);if(record!=null)return {type:'number',value:record};
    }
    if(header==='이닝'){
      const innings=parseInnings(s);if(innings!=null)return {type:'number',value:innings};
    }
    const cleaned=s.replace(/,/g,'').replace(/위$/,'').replace(/^\+/,'').replace(/%$/,'');
    if(cleaned!==''&&/^[-+]?\d+(?:\.\d+)?$/.test(cleaned))return {type:'number',value:Number(cleaned)};
    return {type:'text',value:s.toLocaleLowerCase('ko-KR')};
  }

  function playerTypeForTable(table){
    const body=table.closest('#eoKboRecordBody');
    return body?.querySelector('[data-player-type].active')?.dataset.playerType||null;
  }

  function metricKey(th){
    return String(th?.dataset?.advancedKey||th?.dataset?.metricKey||'').trim();
  }

  function requiresQualification(table,th){
    const type=playerTypeForTable(table),key=metricKey(th);
    if(type==='hitter')return HITTER_QUALIFIED_KEYS.has(key);
    if(type==='pitcher')return PITCHER_QUALIFIED_KEYS.has(key);
    return false;
  }

  function teamGameCounts(){
    const counts=Object.fromEntries([...TEAM_NAMES].map(t=>[t,0]));
    if(typeof state==='undefined'||!Array.isArray(state.allGames))return counts;
    const year=String(new Date().getFullYear());
    state.allGames.forEach(g=>{
      if(!String(g?.game_date||'').startsWith(`${year}-`))return;
      if(String(g?.status||'').toUpperCase()!=='FINISHED')return;
      const away=normTeam(g?.away_team),home=normTeam(g?.home_team);
      if(TEAM_NAMES.has(away))counts[away]++;
      if(TEAM_NAMES.has(home))counts[home]++;
    });
    return counts;
  }

  function headerIndex(table,key){
    const headers=[...(table.tHead?.querySelectorAll('th')||[])];
    return headers.findIndex(th=>metricKey(th)===key||String(th.dataset.sortLabel||'').trim()===key||String(th.textContent||'').replace(/[▲▼]/g,'').trim()===key);
  }

  function markQualifications(table){
    const type=playerTypeForTable(table);if(!type||!table.tBodies[0])return;
    const counts=teamGameCounts();
    const teamIdx=headerIndex(table,'팀');
    let valueIdx=-1;
    if(type==='hitter')valueIdx=headerIndex(table,'PA')>=0?headerIndex(table,'PA'):headerIndex(table,'타석');
    else valueIdx=headerIndex(table,'IP')>=0?headerIndex(table,'IP'):headerIndex(table,'이닝');
    [...table.tBodies[0].rows].forEach(row=>{
      const team=normTeam(row.cells[teamIdx>=0?teamIdx:1]?.textContent||'');
      const games=Number(counts[team]||0);
      if(!games||valueIdx<0){delete row.dataset.eoQualified;return}
      if(type==='hitter'){
        const pa=Number(String(row.cells[valueIdx]?.textContent||'').replace(/,/g,''));
        if(!Number.isFinite(pa)){delete row.dataset.eoQualified;return}
        row.dataset.eoQualified=pa>=games*3.1?'1':'0';
      }else{
        const ip=parseInnings(row.cells[valueIdx]?.textContent||'');
        if(ip==null){delete row.dataset.eoQualified;return}
        row.dataset.eoQualified=ip+1e-9>=games?'1':'0';
      }
    });
  }

  function updateArrows(table,col,dir){
    table.querySelectorAll('thead th').forEach((th,i)=>{
      let marker=th.querySelector('.eo-sort-arrow');
      if(!marker){marker=document.createElement('span');marker.className='eo-sort-arrow';th.appendChild(marker)}
      marker.textContent=i===col?(dir==='asc'?' ▲':' ▼'):'';
      th.classList.toggle('eo-sort-active',i===col);
      th.setAttribute('aria-sort',i===col?(dir==='asc'?'ascending':'descending'):'none');
    });
  }

  function sortRows(table,col,header,dir){
    const tbody=table.tBodies[0];if(!tbody)return;
    const th=table.tHead?.querySelectorAll('th')?.[col];
    markQualifications(table);
    const qualificationFirst=requiresQualification(table,th);
    const rows=[...tbody.rows].map(row=>({
      row,
      sort:sortableValue(row.cells[col]?.textContent,header),
      qualified:row.dataset.eoQualified,
      name:row.querySelector('.name-cell')?.textContent||row.cells[0]?.textContent||''
    }));
    rows.sort((a,b)=>{
      if(qualificationFirst&&a.qualified!==b.qualified){
        if(a.qualified==='1')return -1;
        if(b.qualified==='1')return 1;
        if(a.qualified==='0')return -1;
        if(b.qualified==='0')return 1;
      }
      let result=0;
      if(a.sort.type==='number'&&b.sort.type==='number')result=a.sort.value-b.sort.value;
      else result=String(a.sort.value).localeCompare(String(b.sort.value),'ko-KR',{numeric:true,sensitivity:'base'});
      if(result===0)result=String(a.name).localeCompare(String(b.name),'ko-KR');
      return dir==='asc'?result:-result;
    });
    const frag=document.createDocumentFragment();
    rows.forEach(item=>frag.appendChild(item.row));
    tbody.appendChild(frag);
    table.dataset.sortCol=String(col);table.dataset.sortDir=dir;
    updateArrows(table,col,dir);
  }

  function sortTable(table,col,header){
    const prevCol=Number(table.dataset.sortCol),prevDir=table.dataset.sortDir;
    const th=table.tHead?.querySelectorAll('th')?.[col];
    const lowerByColumn=th?.dataset?.lowerIsBetter==='1';
    let dir;
    if(prevCol===col)dir=prevDir==='asc'?'desc':'asc';
    else dir=lowerByColumn||LOWER_IS_BETTER.has(header)||header==='팀'||header==='선수'?'asc':'desc';
    sortRows(table,col,header,dir);
  }

  function refreshLeaderStrip(table,col){
    const body=table.closest('#eoKboRecordBody'),strip=body?.querySelector('.eo-leader-strip');
    if(!strip||!table.tBodies[0])return;
    const rows=[...table.tBodies[0].rows].slice(0,3);
    strip.innerHTML=rows.map((row,i)=>{
      const name=String(row.cells[0]?.textContent||'').trim();
      const team=normTeam(row.cells[1]?.textContent||'');
      const value=String(row.cells[col]?.textContent||'-').trim();
      return `<div class="eo-leader ${team==='삼성'?'samsung':''}"><div class="rank">${i+1}위 · ${esc(team)}</div><b>${esc(name)}</b><strong>${esc(value)}</strong></div>`;
    }).join('');
  }

  function applySelectedQualificationSort(table){
    const body=table.closest('#eoKboRecordBody'),select=body?.querySelector('#eoPlayerSort');
    if(!select||!playerTypeForTable(table))return;
    const selectedKey=String(select.value||'').trim();
    if(table.dataset.eoQualificationDefaultApplied===selectedKey)return;
    const headers=[...(table.tHead?.querySelectorAll('th')||[])];
    const col=headers.findIndex(th=>metricKey(th)===selectedKey);
    if(col<0){table.dataset.eoQualificationDefaultApplied=selectedKey;return}
    const th=headers[col];
    if(!requiresQualification(table,th)){table.dataset.eoQualificationDefaultApplied=selectedKey;return}
    const header=th.dataset.sortLabel||String(th.textContent||'').replace(/[▲▼]/g,'').trim();
    const dir=(th.dataset.lowerIsBetter==='1'||LOWER_IS_BETTER.has(header))?'asc':'desc';
    sortRows(table,col,header,dir);
    refreshLeaderStrip(table,col);
    table.dataset.eoQualificationDefaultApplied=selectedKey;
  }

  function enhanceTable(table){
    if(!table||!table.tHead)return;
    const headers=[...table.tHead.querySelectorAll('th')];
    headers.forEach((th,index)=>{
      let label=th.dataset.sortLabel;
      if(!label){
        const original=String(th.textContent||'').replace(/[▲▼]/g,'').trim();
        if(!th.dataset.metricKey)th.dataset.metricKey=th.dataset.advancedKey||original;
        label=translateHeader(original);
        th.dataset.sortLabel=label;
        th.textContent=label;
      }else if(!th.dataset.metricKey){
        th.dataset.metricKey=th.dataset.advancedKey||String(label||'').trim();
      }
      th.classList.add('eo-sortable-head');
      const metricTitle=th.dataset.metricTitle||th.getAttribute('title')||'';
      if(metricTitle&&!th.dataset.metricTitle)th.dataset.metricTitle=metricTitle;
      const qual=requiresQualification(table,th);
      th.title=metricTitle?`${metricTitle}${qual?' · 규정 충족 선수 우선':''} · 클릭하여 정렬`:`${label} 기준 정렬${qual?' · 규정 충족 선수 우선':''}`;
      if(th.dataset.sortBound!=='1'){
        th.dataset.sortBound='1';
        th.tabIndex=0;
        const action=()=>sortTable(table,index,th.dataset.sortLabel||label);
        th.addEventListener('click',action);
        th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}});
      }
      if(!th.querySelector('.eo-sort-arrow')){const marker=document.createElement('span');marker.className='eo-sort-arrow';th.appendChild(marker)}
    });
    markQualifications(table);
    applySelectedQualificationSort(table);
  }

  function updateQualificationNote(root){
    const body=root.querySelector('#eoKboRecordBody');
    if(!body?.querySelector('[data-player-type].active'))return;
    const notes=[...body.querySelectorAll('.eo-record-note')];
    const note=notes.find(n=>String(n.textContent||'').includes('선수 기록'))||notes[0];
    if(note&&!String(note.textContent||'').includes('규정타석')){
      note.textContent=`${String(note.textContent||'').trim()} 비율지표 정렬은 규정타석(팀 경기×3.1)·규정이닝(팀 경기×1) 충족 선수를 우선 표시합니다.`;
    }
  }

  function translateVisibleLabels(root){
    translateMetricOptions(root);
    root.querySelectorAll('.eo-record-table').forEach(enhanceTable);
    updateQualificationNote(root);
  }

  function installStyle(){
    if(document.getElementById('eoKboSortableStyle'))return;
    const s=document.createElement('style');s.id='eoKboSortableStyle';s.textContent=`
#records .eo-record-table th.eo-sortable-head{cursor:pointer;user-select:none;transition:background .14s,color .14s;outline:none}
#records .eo-record-table th.eo-sortable-head:hover,#records .eo-record-table th.eo-sortable-head:focus-visible{background:#e4effc;color:var(--blue)}
#records .eo-record-table th.eo-sort-active{background:#e7f1ff;color:var(--blue);font-weight:950}
#records .eo-sort-arrow{display:inline-block;min-width:11px;margin-left:2px;font-size:9px;color:var(--blue);vertical-align:1px}
#records .eo-record-table th{line-height:1.25;white-space:normal!important;min-width:54px}
#records .eo-record-table th:nth-child(1),#records .eo-record-table th:nth-child(2){white-space:nowrap!important}
@media(max-width:900px){#records .eo-record-table th{font-size:10px!important;min-width:50px;padding:8px 6px!important}}
`;
    document.head.appendChild(s);
  }

  function apply(){
    const root=document.getElementById('kboRecordsPane');if(!root)return;
    installStyle();translateVisibleLabels(root);
  }

  function scheduleApply(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;apply()});
  }

  function isMeaningfulMutation(mutations){
    return mutations.some(m=>{
      if(m.type!=='childList'||!m.addedNodes.length)return false;
      if(m.target?.id==='eoKboRecordBody')return true;
      return [...m.addedNodes].some(node=>{
        if(node.nodeType!==1)return false;
        return node.matches?.('th[data-advanced-key],th[data-situational-key],.eo-record-table')||node.querySelector?.('th[data-advanced-key],th[data-situational-key],.eo-record-table');
      });
    });
  }

  function install(){
    installStyle();apply();
    const records=document.getElementById('records');
    if(records&&typeof MutationObserver!=='undefined'){
      observer=new MutationObserver(mutations=>{if(isMeaningfulMutation(mutations))scheduleApply()});
      observer.observe(records,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
