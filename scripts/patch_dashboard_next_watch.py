from pathlib import Path
p=Path('eoheung-member-logo-patch.js')
text=p.read_text(encoding='utf-8')

# 1) Dashboard next-watch wrapper should be a single card, not two-column with history.
text=text.replace(
".eo-next-watch{margin:16px 0;display:grid;grid-template-columns:1.05fr .95fr;gap:14px}",
".eo-next-watch{margin:0;display:block}"
)
text=text.replace(
"@media(max-width:900px){.eo-next-watch{grid-template-columns:1fr;margin:12px 0}",
"@media(max-width:900px){.eo-next-watch{display:block;margin:0 0 12px}"
)

old_block="""  function renderNextWatchPanel(){
    const dash=$('#dashboard'); if(!dash||typeof state==='undefined')return;
    let wrap=$('#eoNextWatch');
    if(!wrap){
      const metrics=$('#dashboard .grid4');
      wrap=document.createElement('div');wrap.id='eoNextWatch';wrap.className='eo-next-watch';
      if(metrics&&metrics.parentNode)metrics.parentNode.insertBefore(wrap,metrics.nextSibling);
    }
    const g=nextWatchGame();
    const history=getLocalHistory().slice(0,4);
    if(!g){
      wrap.innerHTML=`<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p>아직 체크된 직관 예정 경기가 없습니다. 캘린더에서 경기일을 선택하고 참석 회원을 체크해 주세요.</p></div><div class="card pad"><div class="eo-dashboard-card-title"><h3>최근 변경 이력</h3><button class="btn secondary" data-open-history>전체보기</button></div><div class="eo-mini-list">${history.length?history.map(historyRowHtml).join(''):'<div class="empty">변경 이력이 없습니다.</div>'}</div></div>`;return;
    }
    const members=(state.gameMembers||[]).filter(x=>x.game_id===g.id&&x.attended).map(x=>typeof memberName==='function'?memberName(x.member_id):'회원');
    const gm=splitGameMemo(g.memo);
    wrap.innerHTML=`<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p style="font-size:18px;font-weight:900">${esc(g.game_date)} ${(g.game_time||'').slice(0,5)} · 삼성 ${g.home_away==='AWAY'?'@':'vs'} ${esc(g.opponent)}</p><div class="eo-next-meta"><span class="eo-pill">📍 ${esc(g.stadium||'-')}</span><span class="eo-pill">👥 ${members.length}명</span>${gm.seat?`<span class="eo-pill eo-seat">🪑 ${esc(gm.seat)}</span>`:''}</div><p>${members.length?esc(members.join(', ')):'참석 회원 미등록'}</p>${gm.memo?`<p style="margin-top:8px;color:#dbeafe">${esc(gm.memo)}</p>`:''}</div><div class="card pad"><div class="eo-dashboard-card-title"><h3>최근 변경 이력</h3><button class="btn secondary" data-open-history>전체보기</button></div><div class="eo-mini-list">${history.length?history.map(historyRowHtml).join(''):'<div class="empty">변경 이력이 없습니다.</div>'}</div></div>`;
  }
"""
new_block="""  function renderNextWatchPanel(){
    const dash=$('#dashboard'); if(!dash||typeof state==='undefined')return;
    let wrap=$('#eoNextWatch');
    if(!wrap){
      const rankGrid=$('#dashboard .rank-grid');
      wrap=document.createElement('div');
      wrap.id='eoNextWatch';
      wrap.className='eo-next-watch';
      if(rankGrid)rankGrid.insertBefore(wrap,rankGrid.firstChild);
      else{
        const metrics=$('#dashboard .grid4');
        if(metrics&&metrics.parentNode)metrics.parentNode.insertBefore(wrap,metrics.nextSibling);
      }
    }else{
      const rankGrid=$('#dashboard .rank-grid');
      if(rankGrid&&wrap.parentElement!==rankGrid)rankGrid.insertBefore(wrap,rankGrid.firstChild);
    }
    const g=nextWatchGame();
    if(!g){
      wrap.innerHTML=`<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p>아직 체크된 직관 예정 경기가 없습니다. 캘린더에서 경기일을 선택하고 참석 회원을 체크해 주세요.</p></div>`;
      return;
    }
    const members=(state.gameMembers||[]).filter(x=>x.game_id===g.id&&x.attended).map(x=>typeof memberName==='function'?memberName(x.member_id):'회원');
    const gm=splitGameMemo(g.memo);
    wrap.innerHTML=`<div class="card pad eo-next-hero"><h3>다음 직관 일정</h3><p style="font-size:18px;font-weight:900">${esc(g.game_date)} ${(g.game_time||'').slice(0,5)} · 삼성 ${g.home_away==='AWAY'?'@':'vs'} ${esc(g.opponent)}</p><div class="eo-next-meta"><span class="eo-pill">📍 ${esc(g.stadium||'-')}</span><span class="eo-pill">👥 ${members.length}명</span>${gm.seat?`<span class="eo-pill eo-seat">🪑 ${esc(gm.seat)}</span>`:''}</div><p>${members.length?esc(members.join(', ')):'참석 회원 미등록'}</p>${gm.memo?`<p style="margin-top:8px;color:#dbeafe">${esc(gm.memo)}</p>`:''}</div>`;
  }
"""
if old_block not in text:
    raise SystemExit('renderNextWatchPanel block not found')
text=text.replace(old_block,new_block)

# Remove dashboard open-history handler effect from next card no longer used; keep settings history.
p.write_text(text,encoding='utf-8')
print('patched dashboard next watch placement')
