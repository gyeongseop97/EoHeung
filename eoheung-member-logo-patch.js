(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const LS_HISTORY='eoheung_change_history_v1';
  const LS_ABOUT='eoheung_about_config_v1';
  let logoDataUrl='';

  const DEFAULT_ABOUT={
    intro:'삼성 라이온즈를 응원하는 직관 모임입니다. 함께 경기장을 찾고, 직관 기록과 승리의 순간을 모아갑니다.',
    rules:[
      {title:'🦁 모임 정체성',body:'삼성 블루와 사자 응원 문화를 바탕으로 한 직관 중심 모임입니다.'},
      {title:'📅 운영 방식',body:'캘린더에서 직관 예정일과 참석 회원, 좌석 정보를 함께 관리합니다.'},
      {title:'🏆 기록 문화',body:'직관 횟수, 승리요정, 승률을 기록해 시즌별 추억을 남깁니다.'}
    ]
  };

  async function loadLogo(){
    if(logoDataUrl)return logoDataUrl;
    try{const r=await fetch('logo/eoheung.b64.txt',{cache:'force-cache'});if(r.ok)logoDataUrl='data:image/webp;base64,'+(await r.text()).trim()}catch(e){}
    return logoDataUrl;
  }
  function readAbout(){try{return {...DEFAULT_ABOUT,...JSON.parse(localStorage.getItem(LS_ABOUT)||'{}')}}catch(e){return DEFAULT_ABOUT}}
  function saveAboutConfig(cfg){localStorage.setItem(LS_ABOUT,JSON.stringify(cfg))}
  function getHist(){try{return JSON.parse(localStorage.getItem(LS_HISTORY)||'[]')}catch(e){return[]}}
  function setHist(rows){try{localStorage.setItem(LS_HISTORY,JSON.stringify(rows.slice(0,200)))}catch(e){}}
  async function recordChange(action,detail,target_type='',target_id=''){
    const actor=(typeof state!=='undefined'&&state.user?.email)||window.currentUserEmail||'';
    const row={actor,action,detail,target_type,target_id:String(target_id||'')};
    if(typeof state==='undefined'||!state.client){
      toast?.('서버 연결 후 변경이력이 기록됩니다.');
      return;
    }
    const {error}=await state.client.from('change_logs').insert(row);
    if(error){
      console.warn('change_logs insert failed',error);
      toast?.('변경이력 서버 기록 실패: '+error.message);
      return;
    }
    await renderHistoryPanel();
  }
  function splitMemberMemo(m){const raw=String(m?.memo||'');const mt=raw.match(/^\[\[POSITION:(.*?)\]\]\n?/);return{position:String(m?.position||(mt?mt[1]:'')||'').trim(),memo:(mt?raw.slice(mt[0].length):raw).trim()}}
  function mergeMemberMemo(pos,memo){pos=String(pos||'').trim();memo=String(memo||'').trim();return pos?`[[POSITION:${pos}]]\n${memo}`:memo}
  function splitGameMemo(memo){const raw=String(memo||'');const mt=raw.match(/^\[\[SEAT:(.*?)\]\]\n?/);return{seat:(mt?mt[1]:'').trim(),memo:(mt?raw.slice(mt[0].length):raw).trim()}}
  function mergeGameMemo(seat,memo){seat=String(seat||'').trim();memo=String(memo||'').trim();return seat?`[[SEAT:${seat}]]\n${memo}`:memo}

  function injectStyle(){
    let style=$('#eoheungMemberLogoPatchStyle');
    const css=`
      :root{--eo-blue:#074ca1;--eo-blue-dark:#041e42;--eo-gold:#f6c343;--eo-ink:#0f172a;--eo-soft:#eef4ff}
      body:not(.theme-excel):not(.theme-groupware){background:radial-gradient(circle at 10% 0%,rgba(246,195,67,.16),transparent 25%),radial-gradient(circle at top left,rgba(7,76,161,.16),transparent 36%),linear-gradient(180deg,#f8fbff 0%,#f4f7fc 100%)!important}
      body:not(.theme-excel):not(.theme-groupware) .sidebar{background:linear-gradient(180deg,var(--eo-blue) 0%,#063a7d 55%,var(--eo-blue-dark) 100%)!important}
      .btn{color:#fff!important}.btn.secondary{background:#eef4ff!important;color:#074ca1!important;border:1px solid #b9d7ff!important;box-shadow:none!important}.btn.danger{background:#fff1f2!important;color:#be123c!important;border:1px solid #fecdd3!important;box-shadow:none!important}.btn.green{background:#e8fff6!important;color:#047857!important;border:1px solid #bdf7df!important;box-shadow:none!important}.btn:disabled{opacity:.55!important;color:#64748b!important}.nav button.active,.nav button:hover{background:#fff!important;color:#074ca1!important}.modal .btn,.toolbar .btn{font-weight:900!important}
      body.theme-excel .btn{background:#217346!important;color:#fff!important;border:1px solid #185c37!important;box-shadow:none!important;border-radius:2px!important}body.theme-excel .btn.secondary{background:#fff!important;color:#185c37!important;border-color:#70ad47!important}body.theme-excel .btn.danger{background:#fff!important;color:#b91c1c!important;border-color:#f2b8b5!important}body.theme-excel .btn.green{background:#e2f0d9!important;color:#185c37!important;border-color:#70ad47!important}
      body.theme-groupware .btn{background:#174ea6!important;color:#fff!important;border:1px solid #174ea6!important;box-shadow:none!important;border-radius:2px!important}body.theme-groupware .btn.secondary{background:#fff!important;color:#174ea6!important;border-color:#c7d8ea!important}body.theme-groupware .btn.danger{background:#fff!important;color:#b91c1c!important;border-color:#f2b8b5!important}body.theme-groupware .btn.green{background:#eaf3ff!important;color:#174ea6!important;border-color:#c7d8ea!important}
      .logo.eoheung-logo-box{padding:0!important;overflow:hidden!important;background:#fff!important;display:grid!important;place-items:center!important;border-radius:50%!important}.eoheung-main-logo{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important}
      .member-position-badge{display:inline-flex;align-items:center;justify-content:center;min-width:44px;padding:4px 8px;border-radius:999px;background:#eef4ff;color:#074ca1;font-size:12px;font-weight:900;white-space:nowrap}.member-memo-cell{max-width:520px;white-space:pre-wrap;line-height:1.45;color:#334155}
      .eo-next-watch{margin:0;display:block}.eo-next-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#074ca1,#041e42)!important;color:#fff!important;border:0!important}.eo-next-hero::after{content:'어흥';position:absolute;right:-14px;bottom:-18px;font-size:70px;font-weight:950;opacity:.08;letter-spacing:-.08em}.eo-next-hero h3,.eo-next-hero p{position:relative;z-index:1}.eo-next-hero h3{margin:0 0 12px;font-size:22px}.eo-next-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.eo-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900;background:rgba(255,255,255,.14);color:#fff}.eo-seat{background:#fff7ed!important;color:#c2410c!important;border:1px solid #fed7aa!important}
      @media(min-width:901px){#dashboard .rank-grid.eo-rank-grid-enhanced{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}#dashboard .rank-grid.eo-rank-grid-enhanced>.card,#dashboard .rank-grid.eo-rank-grid-enhanced>#eoNextWatch{min-width:0!important;width:auto!important}#dashboard .rank-grid.eo-rank-grid-enhanced .card.pad{padding:14px!important}#dashboard .rank-grid.eo-rank-grid-enhanced h3{font-size:15px!important;line-height:1.25!important;margin-bottom:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .rank-list li{font-size:12px!important;padding:6px 0!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero h3{font-size:16px!important;margin-bottom:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p{font-size:12px!important;line-height:1.35!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p[style]{font-size:14px!important;line-height:1.35!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-meta{gap:5px!important;margin:8px 0!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-pill{font-size:11px!important;padding:4px 7px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero::after{font-size:46px!important;right:-8px!important;bottom:-12px!important}}
@media(min-width:901px) and (max-width:1280px){#dashboard .rank-grid.eo-rank-grid-enhanced{gap:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .card.pad{padding:12px!important}#dashboard .rank-grid.eo-rank-grid-enhanced h3{font-size:14px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .rank-list li{font-size:11.5px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p[style]{font-size:13px!important}}
      .eo-dashboard-card-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}.eo-dashboard-card-title h3{margin:0}.eo-mini-list{display:grid;gap:8px}.eo-mini-row{display:grid;gap:5px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:12px}.eo-weather-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.eo-weather-item{border:1px solid #dce5f2;border-radius:12px;padding:8px;background:#fbfdff}.eo-weather-item b{display:block;font-size:13px}.eo-weather-item span{font-size:12px;color:#64748b}.eo-weather-badge{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:900;background:#eef4ff;color:#074ca1}
      .eo-seat-editor{display:grid;gap:8px;margin-top:12px;padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0}.eo-seat-editor label{font-size:12px;font-weight:900;color:#475569}.eo-seat-editor .row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}.eo-seat-editor input,.eo-seat-editor textarea{width:100%}
      .eo-history-list{display:grid;gap:8px;max-height:360px;overflow:auto}.eo-history-item{display:grid;grid-template-columns:120px 1fr;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.eo-history-item time{font-size:12px;color:#64748b}.eo-history-item b{font-size:13px}.eo-history-item p{margin:3px 0 0;font-size:12px;color:#475569;line-height:1.45}
      .eo-about-hero{display:grid;grid-template-columns:120px 1fr;gap:22px;align-items:center;background:linear-gradient(135deg,#074ca1,#041e42)!important;color:#fff!important;border:0!important;overflow:hidden}.eo-about-logo{width:110px;height:110px;border-radius:50%;background:#fff;overflow:hidden;box-shadow:0 14px 28px rgba(0,0,0,.20)}.eo-about-logo img{width:100%;height:100%;object-fit:cover}.eo-about-hero h3{font-size:30px;margin:0 0 6px}.eo-about-hero p{margin:0;color:#dbeafe;line-height:1.6}.eo-about-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}.eo-about-rule{padding:16px}.eo-about-rule h4{margin:0 0 8px;color:#074ca1}.eo-about-edit{margin-top:14px}.eo-about-edit-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}.eo-about-edit textarea{min-height:96px}.eo-about-edit .full{grid-column:1/-1}
      body.theme-excel .eo-next-hero{background:#217346!important;border:1px solid #185c37!important;border-radius:0!important}.theme-excel .eo-pill{border-radius:0;background:#e2f0d9;color:#185c37}.theme-excel .eo-mini-row,.theme-excel .eo-weather-item,.theme-excel .eo-history-item{border-radius:0;border-color:#b7c9b7}.theme-excel .eo-about-hero{background:#217346!important;border-radius:0!important}.theme-excel .eo-about-rule h4{color:#185c37}
      body.theme-groupware .eo-next-hero{background:#fff!important;color:#111827!important;border:1px solid #c7d8ea!important;border-radius:0!important;box-shadow:0 1px 4px rgba(0,0,0,.12)!important}.theme-groupware .eo-next-hero h3{color:#174ea6}.theme-groupware .eo-pill{background:#eaf3ff;color:#174ea6;border-radius:2px}.theme-groupware .eo-mini-row,.theme-groupware .eo-weather-item,.theme-groupware .eo-history-item{border-radius:2px}.theme-groupware .eo-about-hero{background:#fff!important;color:#111827!important;border:1px solid #c7d8ea!important;border-radius:0!important}.theme-groupware .eo-about-hero h3{color:#174ea6}.theme-groupware .eo-about-hero p{color:#64748b}.theme-groupware .eo-about-rule h4{color:#174ea6}
      @media(max-width:900px){.eo-next-watch{display:block;margin:0 0 12px}.eo-next-hero{border-radius:22px!important}.eo-about-hero{grid-template-columns:1fr;text-align:center}.eo-about-logo{margin:0 auto}.eo-about-grid,.eo-about-edit-grid{grid-template-columns:1fr}.eo-seat-editor .row{grid-template-columns:1fr}.eo-history-item{grid-template-columns:1fr}.dashboard-grid{grid-template-columns:1fr!important}.grid4{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.metric{padding:14px!important}.metric .value{font-size:22px!important}.main{padding:14px!important}.topbar h2{font-size:24px!important}.eo-weather-grid{grid-template-columns:1fr}.rank-grid{grid-template-columns:1fr!important}}
      @media(max-width:520px){.grid4{grid-template-columns:1fr!important}.eo-next-hero h3{font-size:20px}.eo-about-hero h3{font-size:26px}}
    `;
    if(!style){style=document.createElement('style');style.id='eoheungMemberLogoPatchStyle';document.head.appendChild(style)}
    if(style.textContent!==css)style.textContent=css;
  }

  async function applyLogo(){const logo=await loadLogo();$$('.brand').forEach(brand=>{const box=brand.querySelector('.logo'),h1=brand.querySelector('h1'),p=brand.querySelector('p');if(box&&logo){box.classList.add('eoheung-logo-box');box.innerHTML=`<img class="eoheung-main-logo" src="${logo}" alt="어흥 로고">`}if(h1)h1.textContent='어흥';if(p)p.textContent='삼성 라이온즈 직관 모임'});document.title='어흥 - 삼성 라이온즈 직관 모임'}

  function ensureMemberForm(){const name=$('#memberName');if(!name)return;if(!$('#memberPosition')){const input=document.createElement('input');input.id='memberPosition';input.className='input';input.placeholder='직책';name.parentNode.insertBefore(input,name)}$('#memberFavorite')?.remove();$('#memberStatus')?.remove()}
  function renderMembersPatched(){const root=$('#memberRows');if(!root||typeof state==='undefined')return;const head=$('#members thead tr');if(head)head.innerHTML='<th>직책</th><th>이름</th><th>부서</th><th>연락처</th><th>메모</th><th></th>';root.innerHTML=state.members.length?state.members.map(m=>{const ex=splitMemberMemo(m);return `<tr><td><span class="member-position-badge">${esc(ex.position||'-')}</span></td><td><b>${esc(m.name)}</b></td><td>${esc(m.department||'')}</td><td>${esc(m.phone||'')}</td><td class="member-memo-cell">${esc(ex.memo||'')}</td><td><button class="btn secondary" data-edit-member="${m.id}">수정</button></td></tr>`}).join(''):'<tr><td colspan="6" class="empty">등록된 회원이 없습니다.</td></tr>'}
  function clearMemberFormPatched(){ensureMemberForm();['memberId','memberPosition','memberName','memberDepartment','memberPhone','memberMemo'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});const t=$('#memberModalTitle');if(t)t.textContent='회원 추가'}
  function editMemberPatched(id){ensureMemberForm();const m=state.members.find(x=>String(x.id)===String(id));if(!m)return;const ex=splitMemberMemo(m);$('#memberModalTitle').textContent='회원 수정';$('#memberId').value=m.id;$('#memberPosition').value=ex.position||'';$('#memberName').value=m.name||'';$('#memberDepartment').value=m.department||'';$('#memberPhone').value=m.phone||'';$('#memberMemo').value=ex.memo||'';if(typeof openModal==='function')openModal('memberModal')}
  async function saveMemberPatched(){ensureMemberForm();const id=$('#memberId').value;const old=state.members.find(x=>String(x.id)===String(id));const payload={name:$('#memberName').value.trim(),department:$('#memberDepartment').value.trim(),phone:$('#memberPhone').value.trim(),favorite_player:'',status:old?.status||'active',memo:mergeMemberMemo($('#memberPosition').value,$('#memberMemo').value)};if(!payload.name){toast?.('이름을 입력해 주세요.');return}const res=id?await state.client.from('members').update(payload).eq('id',id):await state.client.from('members').insert(payload);if(res.error){toast?.('회원 저장 오류: '+res.error.message);return}await recordChange(id?'회원 수정':'회원 추가',`${payload.name} / ${$('#memberPosition').value||'-'}`,'member',id||payload.name);closeModal?.('memberModal');await loadAll?.()}

  
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

  async function saveGameSeat(gameId){const g=state.games.find(x=>String(x.id)===String(gameId));if(!g)return;const seat=$(`#seat-${gameId}`)?.value||'',memo=$(`#seatmemo-${gameId}`)?.value||'';const payload={memo:mergeGameMemo(seat,memo)};const {error}=await state.client.from('games').update(payload).eq('id',gameId);if(error){toast?.('좌석 저장 오류: '+error.message);return}g.memo=payload.memo;await recordChange('좌석/메모 저장',`${g.game_date} ${g.opponent} / 좌석: ${seat||'-'}`,'game',gameId);toast?.('좌석/메모를 저장했습니다.');renderNextWatchPanel();renderCalendar?.()}
  function renderDateDetailPatched(){if(typeof state==='undefined'||typeof gamesOnDate!=='function')return;const root=$('#dateDetail');if(!root)return;const games=gamesOnDate(state.selectedDate);if(!games.length){root.innerHTML=`<div class="empty"><b>${state.selectedDate}</b><br>등록된 경기가 없습니다.</div>`;return}if(!state.members.length){root.innerHTML=`<div class="empty"><b>${state.selectedDate}</b><br>회원 관리에서 회원을 먼저 등록해 주세요.</div>`;return}const active=state.members.filter(m=>m.status!=='dormant');root.innerHTML=games.map(g=>{const entries=typeof gameEntries==='function'?gameEntries(g.id):[];const rows=active.map(m=>{const e=entries.find(x=>x.member_id===m.id);return`<div class="check-row"><label>${esc(m.name)}</label><input type="checkbox" data-game="${g.id}" data-member="${m.id}" ${e?.attended?'checked':''}></div>`}).join('');const gm=splitGameMemo(g.memo);return `<div class="card pad" style="margin-bottom:12px"><div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">${typeof gameLabelHtml==='function'?gameLabelHtml(g,'team-logo'):esc(g.opponent)} ${typeof resultBadge==='function'?resultBadge(g):''}</h3><p class="note" style="margin:6px 0 0">${esc(state.selectedDate)} · ${typeof homeAwayText==='function'?homeAwayText(g.home_away):esc(g.home_away)} · ${esc(g.stadium||'-')}</p></div><button class="btn secondary" data-edit-game="${g.id}">경기 수정</button></div><div class="eo-seat-editor"><label>좌석 / 직관 메모</label><div class="row"><input id="seat-${g.id}" class="input" placeholder="예: 1루 블루존 204구역 7열" value="${esc(gm.seat)}"><textarea id="seatmemo-${g.id}" class="input" placeholder="예: 티켓 4매, 치킨 예약, 집결 장소 등">${esc(gm.memo)}</textarea><button class="btn green" data-save-seat="${g.id}">저장</button></div></div><h4>직관 회원</h4><div class="member-checks">${rows}</div></div>`}).join('')}

  const W={0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',45:'안개',48:'안개',51:'이슬비',53:'이슬비',55:'이슬비',61:'비',63:'비',65:'강한 비',71:'눈',73:'눈',75:'강한 눈',80:'소나기',81:'소나기',82:'강한 소나기',95:'뇌우'};
  async function weatherHtml(g){try{const c=typeof STADIUM_COORDS!=='undefined'?STADIUM_COORDS[g.stadium]:null;if(!c)return'<span class="eo-weather-badge">날씨 정보 없음</span>';const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c[0]}&longitude=${c[1]}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FSeoul&start_date=${g.game_date}&end_date=${g.game_date}`);const d=await r.json();const code=d.daily?.weather_code?.[0],max=d.daily?.temperature_2m_max?.[0],min=d.daily?.temperature_2m_min?.[0],pop=d.daily?.precipitation_probability_max?.[0],wind=d.daily?.wind_speed_10m_max?.[0];return`<div class="eo-weather-grid"><div class="eo-weather-item"><b>${W[code]||'예보'}</b><span>하늘 상태</span></div><div class="eo-weather-item"><b>${Math.round(min)}~${Math.round(max)}℃</b><span>최저/최고</span></div><div class="eo-weather-item"><b>${pop??'-'}%</b><span>강수 확률</span></div><div class="eo-weather-item"><b>${Math.round(wind??0)}km/h</b><span>최대 풍속</span></div></div>`}catch(e){return'<span class="eo-weather-badge">날씨 불러오기 실패</span>'}}
  async function renderWeatherCards(){const box=$('#dashSamsungWeek');if(!box||typeof state==='undefined')return;const today=ymd(new Date()),end=typeof addDays==='function'?addDays(today,6):today;const games=(state.games||[]).filter(g=>g.game_date>=today&&g.game_date<=end).sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')));if(!games.length){box.innerHTML='<div class="empty">향후 7일 내 등록된 삼성 경기가 없습니다.</div>';return}box.innerHTML=games.map(g=>`<div class="eo-mini-row" data-eo-weather="${g.id}"><b>${esc(g.game_date)} ${(g.game_time||'').slice(0,5)} · ${g.home_away==='AWAY'?'@':'vs'} ${esc(g.opponent)}</b><span class="note">${esc(g.stadium||'-')} · ${typeof statusText==='function'?statusText(g.status):g.status}</span><span class="eo-weather-badge">날씨 불러오는 중...</span></div>`).join('');for(const g of games){const node=$(`[data-eo-weather="${g.id}"] .eo-weather-badge`);if(node)node.outerHTML=await weatherHtml(g)}}

  function ensureHistoryPanel(){const settings=$('#settings');if(!settings||$('#eoHistoryPanel'))return;const card=document.createElement('div');card.id='eoHistoryPanel';card.className='card pad';card.style.marginTop='14px';card.innerHTML='<div class="eo-dashboard-card-title"><h3>변경 이력</h3><div class="toolbar" style="margin:0"><button class="btn secondary" data-refresh-history>새로고침</button></div></div><p class="note">회원 수정, 직관 체크, 좌석/메모 저장 등 주요 변경 내역을 Supabase 서버에 기록합니다.</p><div id="eoHistoryList" class="eo-history-list"></div>';settings.appendChild(card)}
  async function renderHistoryPanel(){
    ensureHistoryPanel();
    const list=$('#eoHistoryList');
    if(!list)return;
    if(typeof state==='undefined'||!state.client){list.innerHTML='<div class="empty">서버 연결 후 변경이력을 불러옵니다.</div>';return}
    list.innerHTML='<div class="empty">서버 변경이력을 불러오는 중입니다...</div>';
    const {data,error}=await state.client.from('change_logs').select('*').order('created_at',{ascending:false}).limit(80);
    if(error){list.innerHTML=`<div class="empty">서버 변경이력 조회 실패<br>${esc(error.message)}</div>`;return}
    const rows=data||[];
    list.innerHTML=rows.length?rows.map(r=>`<div class="eo-history-item"><time>${new Date(r.created_at).toLocaleString('ko-KR')}</time><div><b>${esc(r.action)}</b><p>${esc(r.detail||'')}<br>${esc(r.actor||'unknown')}</p></div></div>`).join(''):'<div class="empty">서버에 기록된 변경 이력이 없습니다.</div>';
  }

  function aboutMarkup(){const cfg=readAbout();return `<div class="card pad eo-about-hero"><div class="eo-about-logo">${logoDataUrl?`<img src="${logoDataUrl}" alt="어흥 로고">`:''}</div><div><h3>어흥</h3><p id="eoAboutIntroText">${esc(cfg.intro)}</p></div></div><div class="eo-about-grid">${cfg.rules.map(r=>`<div class="card pad eo-about-rule"><h4>${esc(r.title).replace('🐯','🦁')}</h4><p class="note">${esc(r.body)}</p></div>`).join('')}</div><div class="card pad eo-about-edit"><div class="eo-dashboard-card-title"><h3>모임 소개 / 운영 규칙 수정</h3><button class="btn secondary" data-reset-about>기본값 복원</button></div><div class="form-grid"><textarea id="eoAboutIntro" class="full" placeholder="모임 소개말">${esc(cfg.intro)}</textarea></div><div class="eo-about-edit-grid" style="margin-top:10px">${cfg.rules.map((r,i)=>`<div><input class="input" id="eoRuleTitle${i}" value="${esc(r.title).replace('🐯','🦁')}" placeholder="규칙 제목"><textarea id="eoRuleBody${i}" placeholder="규칙 내용">${esc(r.body)}</textarea></div>`).join('')}</div><div class="toolbar" style="margin-top:12px"><button class="btn green" data-save-about>소개/규칙 저장</button></div></div>`}
  async function ensureAboutPage(force=false){const main=$('.main'),nav=$('.nav');if(!main||!nav)return;let sec=$('#about');if(!sec){sec=document.createElement('section');sec.id='about';sec.className='section';main.appendChild(sec)}const editing=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.eo-about-edit');if(force||sec.dataset.eoAboutRendered!=='1'){if(!editing||force){sec.innerHTML=aboutMarkup();sec.dataset.eoAboutRendered='1'}}let btn=nav.querySelector('[data-page="about"]');if(!btn){btn=document.createElement('button');btn.dataset.page='about';nav.appendChild(btn)}btn.textContent='🦁 모임 소개';btn.onclick=()=>showPage('about');$$('.nav button').forEach(b=>{if(b.textContent.includes('🐯'))b.textContent=b.textContent.replace('🐯','🦁')})}
  function showPage(page){if(typeof state!=='undefined')state.page=page;document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===page));const titles={about:['모임 소개','어흥의 모임 소개와 운영 기준입니다.'],settings:['설정','운영 정보를 확인합니다.']};if(titles[page]){const t=$('#pageTitle'),p=$('#pageSub');if(t)t.textContent=titles[page][0];if(p)p.textContent=titles[page][1]}}
  async function saveAbout(){const cfg={intro:$('#eoAboutIntro')?.value.trim()||DEFAULT_ABOUT.intro,rules:[0,1,2].map(i=>({title:($('#eoRuleTitle'+i)?.value||DEFAULT_ABOUT.rules[i].title).replace('🐯','🦁'),body:$('#eoRuleBody'+i)?.value||DEFAULT_ABOUT.rules[i].body}))};saveAboutConfig(cfg);await recordChange('모임 소개 수정','모임 소개말 및 운영 규칙 수정','about','about');await ensureAboutPage(true);toast?.('모임 소개와 운영 규칙을 저장했습니다.')}

  function installOverrides(){ensureMemberForm();try{window.renderMembers=renderMembers=renderMembersPatched}catch(e){window.renderMembers=renderMembersPatched}try{window.clearMemberForm=clearMemberForm=clearMemberFormPatched}catch(e){window.clearMemberForm=clearMemberFormPatched}try{window.editMember=editMember=editMemberPatched}catch(e){window.editMember=editMemberPatched}try{window.saveMember=saveMember=saveMemberPatched}catch(e){window.saveMember=saveMemberPatched}try{window.renderDateDetail=renderDateDetail=renderDateDetailPatched}catch(e){window.renderDateDetail=renderDateDetailPatched}const save=$('#saveMemberBtn');if(save)save.onclick=saveMemberPatched;const add=$('#openMemberModalBtn');if(add)add.onclick=()=>{clearMemberFormPatched();openModal?.('memberModal')};renderMembersPatched()}
  function bindOnce(){if(window.__eoheungFinalFixBound)return;window.__eoheungFinalFixBound=true;document.body.addEventListener('click',async e=>{const nav=e.target.closest('[data-eo-next-nav]');if(nav){e.preventDefault();const games=plannedWatchGames();const dir=Number(nav.dataset.eoNextNav||0);window.__eoNextWatchIndex=Math.max(0,Math.min(games.length-1,Number(window.__eoNextWatchIndex||0)+dir));renderNextWatchPanel();return}const seat=e.target.closest('[data-save-seat]');if(seat){e.preventDefault();await saveGameSeat(seat.dataset.saveSeat);return}if(e.target.closest('[data-save-about]')){e.preventDefault();await saveAbout();return}if(e.target.closest('[data-reset-about]')){e.preventDefault();if(confirm('모임 소개와 운영 규칙을 기본값으로 되돌릴까요?')){localStorage.removeItem(LS_ABOUT);await ensureAboutPage(true)}return}if(e.target.closest('[data-refresh-history]')){e.preventDefault();await renderHistoryPanel();toast?.('서버 변경이력을 새로고침했습니다.');return}},true);document.body.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"][data-game]'))setTimeout(()=>recordChange('직관 체크 변경',`경기 ID ${e.target.dataset.game} / 회원 ID ${e.target.dataset.member} / ${e.target.checked?'체크':'해제'}`,'attendance',e.target.dataset.game),120)})}
  async function run(){injectStyle();await applyLogo();installOverrides();await ensureAboutPage();ensureHistoryPanel();renderHistoryPanel();renderNextWatchPanel();renderWeatherCards();bindOnce();$$('*').forEach(el=>{if(el.childNodes.length===1&&el.textContent.includes('🐯'))el.textContent=el.textContent.replaceAll('🐯','🦁')})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setInterval(()=>{try{injectStyle();applyLogo();installOverrides();ensureAboutPage();ensureHistoryPanel();renderHistoryPanel();renderNextWatchPanel()}catch(e){}},1800);
})();










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






/* EOHEUNG_NEXT_WATCH_POLISH_START */
(function(){
  const styleId='eoheungNextWatchPolishStyle';
  const css=`
/* 다음 직관 카드: 기존 카드/태그 색상은 유지하고 화살표만 정리 */
#dashboard #eoNextWatch .eo-next-hero{
  overflow:hidden!important;
  isolation:auto!important;
  background:linear-gradient(135deg,#074ca1,#041e42)!important;
  box-shadow:0 14px 34px rgba(4,30,66,.18)!important;
}
#dashboard #eoNextWatch .eo-next-hero::before{
  content:none!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero::after{
  content:''!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero h3::before{
  content:none!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero h3,
#dashboard #eoNextWatch .eo-next-hero p,
#dashboard #eoNextWatch .eo-next-hero p[style]{
  text-shadow:none!important;
}
#dashboard #eoNextWatch .eo-next-meta{
  padding-right:0!important;
}
#dashboard #eoNextWatch .eo-pill{
  border:0!important;
  background:rgba(255,255,255,.14)!important;
  color:#fff!important;
  backdrop-filter:none!important;
  box-shadow:none!important;
}
#dashboard #eoNextWatch .eo-seat{
  background:#fff7ed!important;
  color:#c2410c!important;
  border:1px solid #fed7aa!important;
  box-shadow:none!important;
}
#dashboard #eoNextWatch .eo-next-arrow{
  position:absolute!important;
  top:10px!important;
  transform:none!important;
  width:24px!important;
  height:24px!important;
  min-width:24px!important;
  min-height:24px!important;
  border-radius:999px!important;
  border:1px solid rgba(255,255,255,.38)!important;
  background:rgba(255,255,255,.18)!important;
  color:#ffffff!important;
  display:grid!important;
  place-items:center!important;
  padding:0!important;
  font-size:18px!important;
  line-height:20px!important;
  font-weight:800!important;
  z-index:8!important;
  backdrop-filter:blur(8px)!important;
  box-shadow:0 4px 12px rgba(4,30,66,.16), inset 0 1px 0 rgba(255,255,255,.18)!important;
  transition:background .15s ease, transform .15s ease, box-shadow .15s ease!important;
}
#dashboard #eoNextWatch .eo-next-prev{right:38px!important;left:auto!important;}
#dashboard #eoNextWatch .eo-next-next{right:10px!important;left:auto!important;}
#dashboard #eoNextWatch .eo-next-arrow:hover{
  background:rgba(255,255,255,.30)!important;
  transform:translateY(-1px)!important;
  box-shadow:0 6px 14px rgba(4,30,66,.22), inset 0 1px 0 rgba(255,255,255,.24)!important;
}
body.theme-excel #dashboard #eoNextWatch .eo-next-hero{
  background:#217346!important;
  border-color:#185c37!important;
  box-shadow:none!important;
}
body.theme-excel #dashboard #eoNextWatch .eo-next-arrow{
  background:rgba(255,255,255,.20)!important;
  border-color:rgba(255,255,255,.42)!important;
  color:#fff!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero{
  background:#fff!important;
  color:#111827!important;
  border-color:#c7d8ea!important;
  box-shadow:0 1px 4px rgba(0,0,0,.12)!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero h3,
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p[style],
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p:last-child{
  color:#174ea6!important;
  text-shadow:none!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-pill{
  background:#eaf3ff!important;
  color:#174ea6!important;
  border-radius:2px!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-seat{
  background:#fff7ed!important;
  color:#c2410c!important;
  border:1px solid #fed7aa!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-arrow{
  background:#eaf3ff!important;
  border-color:#c7d8ea!important;
  color:#174ea6!important;
  box-shadow:none!important;
}
@media(max-width:900px){
  #dashboard #eoNextWatch .eo-next-hero{
    padding-left:13px!important;
    padding-right:48px!important;
  }
  #dashboard #eoNextWatch .eo-next-arrow{
    top:12px!important;
    width:26px!important;
    height:26px!important;
    min-width:26px!important;
    min-height:26px!important;
    font-size:19px!important;
  }
  #dashboard #eoNextWatch .eo-next-prev{right:42px!important;left:auto!important;}
  #dashboard #eoNextWatch .eo-next-next{right:12px!important;left:auto!important;}
}`;
  function apply(){
    let style=document.getElementById(styleId);
    if(!style){style=document.createElement('style');style.id=styleId;document.head.appendChild(style)}
    style.textContent=css;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setInterval(apply,2200);
})();
/* EOHEUNG_NEXT_WATCH_POLISH_END */


/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_START */
(function(){
  const TARGET_RTT = 100;
  const SAMPLE_COUNT = 10;
  const SAMPLE_GAP_MS = 90;
  const EDGE_URL = 'https://chaddxsntnokjjcrwiyb.supabase.co/functions/v1/ticketlink-time';
  const FALLBACK_URLS = [EDGE_URL, 'https://www.ticketlink.co.kr/'];
  let bestSample = null;
  let syncing = false;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const nowMs = () => Date.now();

  function findTicketlinkStatusNodes(){
    const nodes = Array.from(document.querySelectorAll('span,p,small,div'));
    return nodes.filter(el => {
      const txt = (el.textContent || '').trim();
      if(!txt) return false;
      return /Ticketlink|티켓링크|RTT\s*\d+ms|서버 기준/.test(txt) && txt.length < 160;
    });
  }

  function setStatus(text, mode='info'){
    const nodes = findTicketlinkStatusNodes();
    const target = nodes.find(el => /RTT|서버 기준/.test(el.textContent || '')) || nodes[nodes.length - 1];
    if(target){
      target.textContent = text;
      target.dataset.rttMode = mode;
      target.style.fontWeight = '700';
      target.style.color = mode === 'good' ? '#047857' : mode === 'warn' ? '#c2410c' : mode === 'error' ? '#be123c' : '#64748b';
    }
  }

  function showBest(){
    if(!bestSample) return;
    const mode = bestSample.rtt <= TARGET_RTT ? 'good' : 'warn';
    const suffix = bestSample.rtt <= TARGET_RTT ? '' : ' · 지연 높음';
    setStatus(`Ticketlink 서버 기준 · 최저 RTT ${bestSample.rtt}ms${suffix}`, mode);
  }

  async function requestSample(url){
    const start = performance.now();
    try{
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
        method: url === EDGE_URL ? 'GET' : 'HEAD',
        cache: 'no-store',
        mode: 'cors'
      });
      const end = performance.now();
      const rtt = Math.round(end - start);
      let serverDate = null;
      let serverTs = null;
      try{
        const ct = res.headers.get('content-type') || '';
        if(ct.includes('application/json')){
          const json = await res.clone().json();
          serverTs = Number(json.serverTime || json.server_time || json.timestamp || json.now || 0) || null;
          serverDate = json.date || json.serverDate || json.server_date || null;
        }
      }catch(e){}
      serverDate = serverDate || res.headers.get('date');
      const parsed = serverTs || (serverDate ? new Date(serverDate).getTime() : 0);
      return {rtt, url, serverTime: parsed ? parsed + rtt / 2 : null, sampledAt: nowMs()};
    }catch(e){
      return null;
    }
  }

  async function syncTicketlinkRttOptimized(force=false){
    if(syncing && !force) return bestSample;
    syncing = true;
    setStatus('Ticketlink 서버 기준 · 지연 측정 중...', 'info');
    let localBest = null;
    for(let i=0;i<SAMPLE_COUNT;i++){
      for(const url of FALLBACK_URLS){
        const sample = await requestSample(url);
        if(sample && (!localBest || sample.rtt < localBest.rtt)){
          localBest = sample;
          bestSample = sample;
          showBest();
        }
        if(localBest && localBest.rtt <= TARGET_RTT) break;
      }
      if(localBest && localBest.rtt <= TARGET_RTT) break;
      await sleep(SAMPLE_GAP_MS);
    }
    if(bestSample && bestSample.serverTime){
      window.ticketlinkTimeOffset = bestSample.serverTime - nowMs();
      window.ticketlinkBestRtt = bestSample.rtt;
    }
    if(!bestSample) setStatus('Ticketlink 서버 기준 · 지연 측정 실패', 'error');
    else showBest();
    syncing = false;
    return bestSample;
  }

  function enhanceSyncButtons(){
    Array.from(document.querySelectorAll('button')).forEach(btn => {
      const txt = (btn.textContent || '').trim();
      if((txt === '동기화' || txt.includes('서버 동기화')) && !btn.dataset.ticketlinkOptimized){
        btn.dataset.ticketlinkOptimized = '1';
        btn.addEventListener('click', () => setTimeout(() => syncTicketlinkRttOptimized(true), 80), true);
      }
    });
  }

  function boot(){
    enhanceSyncButtons();
    setTimeout(() => syncTicketlinkRttOptimized(false), 600);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setInterval(enhanceSyncButtons, 2000);
  setInterval(() => syncTicketlinkRttOptimized(false), 30000);
  window.syncTicketlinkRttOptimized = syncTicketlinkRttOptimized;
})();
/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_END */

