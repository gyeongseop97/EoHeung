(()=>{
  'use strict';

  const HEADER_LABELS={
    AVG:'타율', G:'경기', PA:'타석', AB:'타수', R:'득점', H:'안타', '2B':'2루타', '3B':'3루타', HR:'홈런', TB:'루타', RBI:'타점',
    SAC:'희생번트', SF:'희생플라이', BB:'볼넷', HBP:'몸에 맞는 공', SO:'탈삼진', GDP:'병살타', SB:'도루', CS:'도루실패', E:'실책',
    OBP:'출루율', SLG:'장타율', OPS:'OPS (출루율+장타율)', RISP:'득점권 타율',
    ERA:'평균자책점', W:'승', L:'패', SV:'세이브', HLD:'홀드', IP:'이닝', WHIP:'이닝당 출루허용률 (WHIP)',
    ER:'자책점', RA:'실점', BF:'상대한 타자', QS:'퀄리티스타트'
  };

  const LOWER_IS_BETTER=new Set([
    '순위','평균자책점','이닝당 출루허용률 (WHIP)','실점','경기당 실점','패','실책','도루실패','병살타',
    '수비무관 평균자책 (FIP)','조정 평균자책 (ERA-)','조정 FIP (FIP-)','인플레이 피안타율 (BABIP)',
    '9이닝당 볼넷 (BB/9)','볼넷률 (BB%)','9이닝당 피홈런 (HR/9)','9이닝당 피안타 (H/9)'
  ]);
  let observer=null;

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
    const cleaned=s.replace(/,/g,'').replace(/위$/,'').replace(/^\+/,'');
    if(cleaned!==''&&/^[-+]?\d+(?:\.\d+)?$/.test(cleaned))return {type:'number',value:Number(cleaned)};
    return {type:'text',value:s.toLocaleLowerCase('ko-KR')};
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

  function sortTable(table,col,header){
    const tbody=table.tBodies[0];if(!tbody)return;
    const prevCol=Number(table.dataset.sortCol);
    const prevDir=table.dataset.sortDir;
    const th=table.tHead?.querySelectorAll('th')?.[col];
    const lowerByColumn=th?.dataset?.lowerIsBetter==='1';
    let dir;
    if(prevCol===col)dir=prevDir==='asc'?'desc':'asc';
    else dir=lowerByColumn||LOWER_IS_BETTER.has(header)||header==='팀'||header==='선수'?'asc':'desc';

    const rows=[...tbody.rows];
    rows.sort((a,b)=>{
      const av=sortableValue(a.cells[col]?.textContent,header),bv=sortableValue(b.cells[col]?.textContent,header);
      let result=0;
      if(av.type==='number'&&bv.type==='number')result=av.value-bv.value;
      else result=String(av.value).localeCompare(String(bv.value),'ko-KR',{numeric:true,sensitivity:'base'});
      if(result===0){
        const at=a.querySelector('.name-cell')?.textContent||a.cells[1]?.textContent||'';
        const bt=b.querySelector('.name-cell')?.textContent||b.cells[1]?.textContent||'';
        result=at.localeCompare(bt,'ko-KR');
      }
      return dir==='asc'?result:-result;
    });
    rows.forEach(row=>tbody.appendChild(row));
    table.dataset.sortCol=String(col);table.dataset.sortDir=dir;
    updateArrows(table,col,dir);
  }

  function enhanceTable(table){
    if(!table||!table.tHead)return;
    const headers=[...table.tHead.querySelectorAll('th')];
    headers.forEach((th,index)=>{
      let label=th.dataset.sortLabel;
      if(!label){
        const original=String(th.textContent||'').replace(/[▲▼]/g,'').trim();
        label=translateHeader(original);
        th.dataset.sortLabel=label;
        th.textContent=label;
      }
      th.classList.add('eo-sortable-head');
      const metricTitle=th.dataset.metricTitle||th.getAttribute('title')||'';
      if(metricTitle&&!th.dataset.metricTitle)th.dataset.metricTitle=metricTitle;
      th.title=metricTitle?`${metricTitle} · 클릭하여 정렬`:`${label} 기준 정렬`;
      if(th.dataset.sortBound!=='1'){
        th.dataset.sortBound='1';
        th.tabIndex=0;
        const action=()=>sortTable(table,index,th.dataset.sortLabel||label);
        th.addEventListener('click',action);
        th.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action()}});
      }
      if(!th.querySelector('.eo-sort-arrow')){const marker=document.createElement('span');marker.className='eo-sort-arrow';th.appendChild(marker)}
    });
  }

  function translateVisibleLabels(root){
    translateMetricOptions(root);
    root.querySelectorAll('.eo-record-table').forEach(enhanceTable);
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

  function install(){
    installStyle();apply();
    const records=document.getElementById('records');
    if(records&&typeof MutationObserver!=='undefined'){
      observer=new MutationObserver(()=>requestAnimationFrame(apply));
      observer.observe(records,{childList:true,subtree:true});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
