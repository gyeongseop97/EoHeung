from pathlib import Path

p = Path('eoheung-member-logo-patch.js')
text = p.read_text(encoding='utf-8')

# Fix: the interval repeatedly called ensureAboutPage(), which rebuilt the about editor
# every 1.8 seconds and made editing impossible. Render once, and only force-render after save/reset.
old_ensure = "async function ensureAboutPage(){const main=$('.main'),nav=$('.nav');if(!main||!nav)return;let sec=$('#about');if(!sec){sec=document.createElement('section');sec.id='about';sec.className='section';main.appendChild(sec)}sec.innerHTML=aboutMarkup();let btn=nav.querySelector('[data-page=\"about\"]');if(!btn){btn=document.createElement('button');btn.dataset.page='about';nav.appendChild(btn)}btn.textContent='🦁 모임 소개';btn.onclick=()=>showPage('about');$$('.nav button').forEach(b=>{if(b.textContent.includes('🐯'))b.textContent=b.textContent.replace('🐯','🦁')})}"
new_ensure = "async function ensureAboutPage(force=false){const main=$('.main'),nav=$('.nav');if(!main||!nav)return;let sec=$('#about');if(!sec){sec=document.createElement('section');sec.id='about';sec.className='section';main.appendChild(sec)}const editing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.eo-about-edit');if(force||sec.dataset.eoAboutRendered!=='1'){if(!editing||force){sec.innerHTML=aboutMarkup();sec.dataset.eoAboutRendered='1'}}let btn=nav.querySelector('[data-page=\"about\"]');if(!btn){btn=document.createElement('button');btn.dataset.page='about';nav.appendChild(btn)}btn.textContent='🦁 모임 소개';btn.onclick=()=>showPage('about');$$('.nav button').forEach(b=>{if(b.textContent.includes('🐯'))b.textContent=b.textContent.replace('🐯','🦁')})}"
if old_ensure in text:
    text = text.replace(old_ensure, new_ensure)
else:
    print('ensureAboutPage exact target not found; skipping')

text = text.replace("await ensureAboutPage();toast?.('모임 소개와 운영 규칙을 저장했습니다.')", "await ensureAboutPage(true);toast?.('모임 소개와 운영 규칙을 저장했습니다.')")
text = text.replace("localStorage.removeItem(LS_ABOUT);await ensureAboutPage()", "localStorage.removeItem(LS_ABOUT);await ensureAboutPage(true)")

old_record = "async function recordChange(action,detail,target_type='',target_id=''){\n    const actor=(typeof state!=='undefined'&&state.user?.email)||window.currentUserEmail||'';\n    const row={id:Date.now()+'-'+Math.random().toString(16).slice(2),created_at:new Date().toISOString(),actor,action,detail,target_type,target_id:String(target_id||'')};\n    setHist([row,...getHist()]); renderHistoryPanel();\n    try{if(typeof state!=='undefined'&&state.client)await state.client.from('change_logs').insert(row)}catch(e){}\n  }"
new_record = "async function recordChange(action,detail,target_type='',target_id=''){\n    const actor=(typeof state!=='undefined'&&state.user?.email)||window.currentUserEmail||'';\n    const row={actor,action,detail,target_type,target_id:String(target_id||'')};\n    if(typeof state==='undefined'||!state.client){\n      toast?.('서버 연결 후 변경이력이 기록됩니다.');\n      return;\n    }\n    const {error}=await state.client.from('change_logs').insert(row);\n    if(error){\n      console.warn('change_logs insert failed',error);\n      toast?.('변경이력 서버 기록 실패: '+error.message);\n      return;\n    }\n    await renderHistoryPanel();\n  }"
if old_record in text:
    text = text.replace(old_record, new_record)
else:
    print('recordChange exact target not found; skipping')

old_history = "function renderHistoryPanel(){ensureHistoryPanel();const list=$('#eoHistoryList');if(!list)return;const rows=getHist().slice(0,80);list.innerHTML=rows.length?rows.map(r=>`<div class=\"eo-history-item\"><time>${new Date(r.created_at).toLocaleString('ko-KR')}</time><div><b>${esc(r.action)}</b><p>${esc(r.detail||'')}<br>${esc(r.actor||'unknown')}</p></div></div>`).join(''):'<div class=\"empty\">변경 이력이 없습니다.</div>'}"
new_history = "async function renderHistoryPanel(){\n    ensureHistoryPanel();\n    const list=$('#eoHistoryList');\n    if(!list)return;\n    if(typeof state==='undefined'||!state.client){list.innerHTML='<div class=\"empty\">서버 연결 후 변경이력을 불러옵니다.</div>';return}\n    list.innerHTML='<div class=\"empty\">서버 변경이력을 불러오는 중입니다...</div>';\n    const {data,error}=await state.client.from('change_logs').select('*').order('created_at',{ascending:false}).limit(80);\n    if(error){list.innerHTML=`<div class=\"empty\">서버 변경이력 조회 실패<br>${esc(error.message)}</div>`;return}\n    const rows=data||[];\n    list.innerHTML=rows.length?rows.map(r=>`<div class=\"eo-history-item\"><time>${new Date(r.created_at).toLocaleString('ko-KR')}</time><div><b>${esc(r.action)}</b><p>${esc(r.detail||'')}<br>${esc(r.actor||'unknown')}</p></div></div>`).join(''):'<div class=\"empty\">서버에 기록된 변경 이력이 없습니다.</div>';\n  }"
if old_history in text:
    text = text.replace(old_history, new_history)
else:
    print('renderHistoryPanel exact target not found; skipping')

# Disable local-only delete/export buttons in settings history header and rewrite description.
text = text.replace("<button class=\"btn secondary\" data-export-history>내보내기</button><button class=\"btn danger\" data-clear-history>로컬 이력 삭제</button>", "<button class=\"btn secondary\" data-refresh-history>새로고침</button>")
text = text.replace("회원 수정, 직관 체크, 좌석/메모 저장 등 주요 변경 내역을 기록합니다.", "회원 수정, 직관 체크, 좌석/메모 저장 등 주요 변경 내역을 Supabase 서버에 기록합니다.")

# Replace button handler behavior for history refresh and remove local-only actions if present.
text = text.replace("if(e.target.closest('[data-clear-history]')){e.preventDefault();if(confirm('현재 브라우저에 저장된 로컬 변경 이력을 삭제할까요?')){setHist([]);renderHistoryPanel()}return}if(e.target.closest('[data-export-history]')){e.preventDefault();const blob=new Blob([JSON.stringify(getHist(),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='eoheung_change_history.json';a.click();URL.revokeObjectURL(a.href);return}", "if(e.target.closest('[data-refresh-history]')){e.preventDefault();await renderHistoryPanel();toast?.('서버 변경이력을 새로고침했습니다.');return}")

# Make periodic render call async-safe; original code can call async render without await but okay.

marker_start = '/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_START */'
marker_end = '/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_END */'

css = r'''
/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_START */
(function(){
  const styleId = 'eoheungForceFourDashboardCardsStyle';
  const css = `
@media (min-width: 901px){
  #dashboard .rank-grid{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:10px!important;
    align-items:stretch!important;
  }
  #dashboard .rank-grid > .card,
  #dashboard .rank-grid > #eoNextWatch{
    min-width:0!important;
    width:auto!important;
    height:100%!important;
    min-height:192px!important;
  }
  #dashboard .rank-grid > .card{
    display:flex!important;
    flex-direction:column!important;
  }
  #dashboard .rank-grid .card.pad{
    padding:13px!important;
  }
  #dashboard .rank-grid h3{
    font-size:15px!important;
    line-height:1.25!important;
    margin:0 0 8px!important;
    letter-spacing:-.03em!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #dashboard .rank-grid .rank-list{
    margin-top:6px!important;
    flex:1 1 auto!important;
  }
  #dashboard .rank-grid .rank-list li{
    font-size:12px!important;
    line-height:1.25!important;
    padding:6px 0!important;
    gap:6px!important;
  }
  #dashboard .rank-grid .rank-list li b{
    min-width:0!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  #dashboard #eoNextWatch{
    display:block!important;
    margin:0!important;
  }
  #dashboard #eoNextWatch .eo-next-hero{
    height:100%!important;
    min-height:192px!important;
    padding:13px!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:flex-start!important;
  }
  #dashboard #eoNextWatch .eo-next-hero h3{
    font-size:15px!important;
    margin:0 0 8px!important;
    flex:0 0 auto!important;
  }
  #dashboard #eoNextWatch .eo-next-hero p{
    font-size:12px!important;
    line-height:1.35!important;
    margin:4px 0!important;
  }
  #dashboard #eoNextWatch .eo-next-hero p[style]{
    font-size:13px!important;
    line-height:1.32!important;
  }
  #dashboard #eoNextWatch .eo-next-meta{
    display:flex!important;
    flex-wrap:wrap!important;
    gap:5px!important;
    margin:8px 0!important;
    align-items:flex-start!important;
  }
  #dashboard #eoNextWatch .eo-pill{
    font-size:10.5px!important;
    padding:3px 6px!important;
    max-width:100%!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  #dashboard #eoNextWatch .eo-seat{
    flex-basis:100%!important;
    width:fit-content!important;
    max-width:100%!important;
    white-space:normal!important;
    line-height:1.25!important;
    overflow:visible!important;
    text-overflow:clip!important;
    margin-top:2px!important;
  }
  #dashboard #eoNextWatch .eo-next-hero::after{
    font-size:42px!important;
    right:-7px!important;
    bottom:-10px!important;
  }
}
@media (min-width:901px) and (max-width:1280px){
  #dashboard .rank-grid{gap:8px!important;}
  #dashboard .rank-grid .card.pad{padding:11px!important;}
  #dashboard .rank-grid h3{font-size:13.5px!important;}
  #dashboard .rank-grid .rank-list li{font-size:11px!important;}
  #dashboard #eoNextWatch .eo-next-hero p[style]{font-size:12px!important;}
}
@media (max-width:900px){
  #dashboard .rank-grid{grid-template-columns:1fr!important;}
  #dashboard #eoNextWatch .eo-seat{
    flex-basis:100%!important;
    white-space:normal!important;
    line-height:1.25!important;
  }
}`;
  let style = document.getElementById(styleId);
  if(!style){
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css;
})();
/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_END */
'''

if marker_start in text and marker_end in text:
    before = text.split(marker_start)[0]
    after = text.split(marker_end, 1)[1]
    text = before + css + after
else:
    text = text.rstrip() + '\n\n' + css + '\n'

p.write_text(text, encoding='utf-8')
print('patched dashboard cards, about editor, and server-based change history')
