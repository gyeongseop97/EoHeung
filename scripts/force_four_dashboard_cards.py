from pathlib import Path
import re

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

# Next-watch carousel: show arrows only when there are previous/next planned watch games.
carousel_block = r'''
function plannedWatchGames(){
    if(typeof state==='undefined')return [];
    const today=ymd(new Date());
    const ids=new Set((state.gameMembers||[]).filter(x=>x.attended).map(x=>x.game_id));
    return (state.games||[])
      .filter(g=>g.game_date>=today&&g.status==='SCHEDULED'&&ids.has(g.id))
      .sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')));
  }
  function nextWatchGame(){
    const games=plannedWatchGames();
    if(!games.length)return null;
    window.__eoNextWatchIndex=Math.max(0,Math.min(games.length-1,Number(window.__eoNextWatchIndex||0)));
    return games[window.__eoNextWatchIndex];
  }
  function renderNextWatchPanel(){
    const dash=$('#dashboard');if(!dash||typeof state==='undefined')return;
    let wrap=$('#eoNextWatch');const grid=$('#dashboard .rank-grid');
    if(grid)grid.classList.add('eo-rank-grid-enhanced');
    if(!wrap){wrap=document.createElement('div');wrap.id='eoNextWatch';wrap.className='eo-next-watch';if(grid)grid.insertBefore(wrap,grid.firstChild);else $('#dashboard .grid4')?.after(wrap)}
    else if(grid&&wrap.parentElement!==grid)grid.insertBefore(wrap,grid.firstChild);
    const games=plannedWatchGames();
    if(!games.length){
      window.__eoNextWatchIndex=0;
      wrap.innerHTML='<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p>아직 체크된 직관 예정 경기가 없습니다. 캘린더에서 경기일을 선택하고 참석 회원을 체크해 주세요.</p></div>';
      return;
    }
    window.__eoNextWatchIndex=Math.max(0,Math.min(games.length-1,Number(window.__eoNextWatchIndex||0)));
    const idx=window.__eoNextWatchIndex;
    const g=games[idx];
    const members=(state.gameMembers||[]).filter(x=>x.game_id===g.id&&x.attended).map(x=>typeof memberName==='function'?memberName(x.member_id):'회원');
    const gm=splitGameMemo(g.memo);
    const prev=idx>0?'<button class="eo-next-arrow eo-next-prev" data-eo-next-nav="-1" aria-label="이전 직관 일정">‹</button>':'';
    const next=idx<games.length-1?'<button class="eo-next-arrow eo-next-next" data-eo-next-nav="1" aria-label="다음 직관 일정">›</button>':'';
    wrap.innerHTML=`<div class="card pad eo-next-hero">${prev}${next}<h3>다음 직관 일정</h3><p style="font-size:18px;font-weight:900">${esc(g.game_date)} ${(g.game_time||'').slice(0,5)} · 삼성 ${g.home_away==='AWAY'?'@':'vs'} ${esc(g.opponent)}</p><div class="eo-next-meta"><span class="eo-pill">📍 ${esc(g.stadium||'-')}</span><span class="eo-pill">👥 ${members.length}명</span>${gm.seat?`<span class="eo-pill eo-seat">🪑 ${esc(gm.seat)}</span>`:''}</div><p>${members.length?esc(members.join(', ')):'참석 회원 미등록'}</p>${gm.memo?`<p style="margin-top:8px;color:#dbeafe">${esc(gm.memo)}</p>`:''}</div>`;
  }
'''
text, n = re.subn(r"function nextWatchGame\(\)\{.*?\n\n  async function saveGameSeat", carousel_block + "\n  async function saveGameSeat", text, flags=re.S)
if n == 0:
    print('nextWatchGame/renderNextWatchPanel regex target not found; skipping')

# Bind arrow buttons inside the existing delegated click handler.
old_click = "document.body.addEventListener('click',async e=>{const seat=e.target.closest('[data-save-seat]');"
new_click = "document.body.addEventListener('click',async e=>{const nav=e.target.closest('[data-eo-next-nav]');if(nav){e.preventDefault();const games=plannedWatchGames();const dir=Number(nav.dataset.eoNextNav||0);window.__eoNextWatchIndex=Math.max(0,Math.min(games.length-1,Number(window.__eoNextWatchIndex||0)+dir));renderNextWatchPanel();return}const seat=e.target.closest('[data-save-seat]');"
if old_click in text:
    text = text.replace(old_click, new_click)
else:
    print('click handler target not found; skipping')

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
    padding:13px 22px!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:flex-start!important;
    position:relative!important;
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
#dashboard #eoNextWatch .eo-next-arrow{
  position:absolute!important;
  top:50%!important;
  transform:translateY(-50%)!important;
  width:34px!important;
  height:34px!important;
  border-radius:999px!important;
  border:1px solid rgba(255,255,255,.45)!important;
  background:#5aa0dc!important;
  color:#fff!important;
  display:grid!important;
  place-items:center!important;
  font-size:28px!important;
  line-height:1!important;
  font-weight:400!important;
  z-index:5!important;
  box-shadow:0 6px 14px rgba(0,0,0,.16)!important;
}
#dashboard #eoNextWatch .eo-next-prev{left:-12px!important;}
#dashboard #eoNextWatch .eo-next-next{right:-12px!important;}
#dashboard #eoNextWatch .eo-next-arrow:hover{filter:brightness(.95)!important;}
body.theme-excel #dashboard #eoNextWatch .eo-next-arrow{background:#217346!important;border-color:#70ad47!important;}
body.theme-groupware #dashboard #eoNextWatch .eo-next-arrow{background:#5b9bd5!important;border-color:#c7d8ea!important;}
@media (min-width:901px) and (max-width:1280px){
  #dashboard .rank-grid{gap:8px!important;}
  #dashboard .rank-grid .card.pad{padding:11px!important;}
  #dashboard .rank-grid h3{font-size:13.5px!important;}
  #dashboard .rank-grid .rank-list li{font-size:11px!important;}
  #dashboard #eoNextWatch .eo-next-hero p[style]{font-size:12px!important;}
  #dashboard #eoNextWatch .eo-next-hero{padding-left:20px!important;padding-right:20px!important;}
}
@media (max-width:900px){
  #dashboard .rank-grid{grid-template-columns:1fr!important;}
  #dashboard #eoNextWatch .eo-seat{
    flex-basis:100%!important;
    white-space:normal!important;
    line-height:1.25!important;
  }
  #dashboard #eoNextWatch .eo-next-arrow{width:36px!important;height:36px!important;font-size:30px!important;}
  #dashboard #eoNextWatch .eo-next-prev{left:-10px!important;}
  #dashboard #eoNextWatch .eo-next-next{right:-10px!important;}
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
print('patched dashboard cards, about editor, server history, and next-watch carousel')
