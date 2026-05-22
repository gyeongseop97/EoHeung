(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let logoDataUrl='';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const ymd=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
  const nowIso=()=>new Date().toISOString();
  const LOCAL_HISTORY_KEY='eoheung_change_history_v1';

  async function loadLogo(){
    if(logoDataUrl)return logoDataUrl;
    try{
      const r=await fetch('logo/eoheung.b64.txt',{cache:'force-cache'});
      if(r.ok){
        const b64=(await r.text()).trim();
        logoDataUrl='data:image/webp;base64,'+b64;
      }
    }catch(e){}
    return logoDataUrl;
  }

  function splitMemberMemo(member){
    const raw=String(member?.memo||'');
    const marker=raw.match(/^\[\[POSITION:(.*?)\]\]\n?/);
    const posFromMemo=marker?marker[1]:'';
    const clean=marker?raw.slice(marker[0].length):raw;
    return {position:String(member?.position||posFromMemo||'').trim(),memo:clean.trim()};
  }
  function mergeMemberMemo(position,memo){
    const p=String(position||'').trim();
    const m=String(memo||'').trim();
    return p?`[[POSITION:${p}]]\n${m}`:m;
  }
  function splitGameMemo(memo){
    const raw=String(memo||'');
    const seat=raw.match(/^\[\[SEAT:(.*?)\]\]\n?/);
    const clean=seat?raw.slice(seat[0].length):raw;
    return {seat:seat?seat[1].trim():'',memo:clean.trim()};
  }
  function mergeGameMemo(seat,memo){
    const s=String(seat||'').trim();
    const m=String(memo||'').trim();
    return s?`[[SEAT:${s}]]\n${m}`:m;
  }
  function getCurrentUser(){
    try{return state?.user?.email||window.currentUserEmail||''}catch(e){return window.currentUserEmail||''}
  }

  function getLocalHistory(){
    try{return JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY)||'[]')}catch(e){return[]}
  }
  function setLocalHistory(rows){
    try{localStorage.setItem(LOCAL_HISTORY_KEY,JSON.stringify(rows.slice(0,200)))}catch(e){}
  }
  async function recordChange(action,detail,targetType='',targetId=''){
    const row={id:Date.now()+'-'+Math.random().toString(16).slice(2),created_at:nowIso(),actor:getCurrentUser(),action,detail,target_type:targetType,target_id:String(targetId||'')};
    setLocalHistory([row,...getLocalHistory()]);
    renderHistoryPanel();
    try{
      if(typeof state!=='undefined'&&state.client){
        await state.client.from('change_logs').insert({created_at:row.created_at,actor:row.actor,action:row.action,detail:row.detail,target_type:row.target_type,target_id:row.target_id});
      }
    }catch(e){/* 테이블이 없어도 로컬 이력은 유지 */}
  }

  function injectStyle(){
    let style=$('#eoheungMemberLogoPatchStyle');
    const css=`
      :root{--eo-blue:#074ca1;--eo-blue-dark:#041e42;--eo-gold:#f6c343;--eo-orange:#f97316;--eo-ink:#0f172a;--eo-soft:#eef4ff}
      body:not(.theme-excel):not(.theme-groupware){background:radial-gradient(circle at 10% 0%,rgba(246,195,67,.16),transparent 25%),radial-gradient(circle at top left,rgba(7,76,161,.16),transparent 36%),linear-gradient(180deg,#f8fbff 0%,#f4f7fc 100%)!important}
      body:not(.theme-excel):not(.theme-groupware) .sidebar{background:linear-gradient(180deg,var(--eo-blue) 0%,#063a7d 55%,var(--eo-blue-dark) 100%)!important}
      body:not(.theme-excel):not(.theme-groupware) .btn{background:var(--eo-blue)}
      body:not(.theme-excel):not(.theme-groupware) .btn.green{background:#e8fff6;color:#047857}
      .logo.eoheung-logo-box{padding:0!important;overflow:hidden!important;background:#fff!important;display:grid!important;place-items:center!important;border-radius:50%!important}
      .eoheung-main-logo{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:50%!important}
      .member-position-badge{display:inline-flex;align-items:center;justify-content:center;min-width:44px;padding:4px 8px;border-radius:999px;background:#eef4ff;color:#074ca1;font-size:12px;font-weight:900;white-space:nowrap}
      .member-memo-cell{max-width:520px;white-space:pre-wrap;line-height:1.45;color:#334155}
      body.theme-excel .member-position-badge{border-radius:0;background:#e2f0d9;color:#185c37;border:1px solid #70ad47}
      body.theme-groupware .member-position-badge{border-radius:2px;background:#eaf3ff;color:#174ea6;border:1px solid #c7d8ea}
      .eo-next-watch{margin:16px 0;display:grid;grid-template-columns:1.05fr .95fr;gap:14px}
      .eo-next-hero{position:relative;overflow:hidden;background:linear-gradient(135deg,#074ca1,#041e42)!important;color:#fff!important;border:0!important}
      .eo-next-hero::after{content:'어흥';position:absolute;right:-14px;bottom:-18px;font-size:70px;font-weight:950;opacity:.08;letter-spacing:-.08em}.eo-next-hero h3,.eo-next-hero p{position:relative;z-index:1}.eo-next-hero h3{margin:0 0 12px;font-size:22px}.eo-next-meta{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.eo-pill{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:900;background:rgba(255,255,255,.14);color:#fff}.eo-seat{background:#fff7ed!important;color:#c2410c!important;border:1px solid #fed7aa!important}.eo-dashboard-card-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}.eo-dashboard-card-title h3{margin:0}.eo-mini-list{display:grid;gap:8px}.eo-mini-row{display:grid;gap:5px;border:1px solid var(--line);border-radius:14px;background:#fff;padding:12px}.eo-weather-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:4px 8px;font-size:12px;font-weight:900;background:#eef4ff;color:#074ca1}.eo-weather-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.eo-weather-item{border:1px solid #dce5f2;border-radius:12px;padding:8px;background:#fbfdff}.eo-weather-item b{display:block;font-size:13px}.eo-weather-item span{font-size:12px;color:#64748b}.eo-seat-editor{display:grid;grid-template-columns:1fr;gap:8px;margin-top:12px;padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0}.eo-seat-editor label{font-size:12px;font-weight:900;color:#475569}.eo-seat-editor .row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px}.eo-seat-editor input,.eo-seat-editor textarea{width:100%}.eo-history-list{display:grid;gap:8px;max-height:360px;overflow:auto}.eo-history-item{display:grid;grid-template-columns:120px 1fr;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.eo-history-item time{font-size:12px;color:#64748b}.eo-history-item b{font-size:13px}.eo-history-item p{margin:3px 0 0;font-size:12px;color:#475569;line-height:1.45}.eo-about-hero{display:grid;grid-template-columns:120px 1fr;gap:22px;align-items:center;background:linear-gradient(135deg,#074ca1,#041e42)!important;color:#fff!important;border:0!important;overflow:hidden}.eo-about-logo{width:110px;height:110px;border-radius:50%;background:#fff;overflow:hidden;box-shadow:0 14px 28px rgba(0,0,0,.20)}.eo-about-logo img{width:100%;height:100%;object-fit:cover}.eo-about-hero h3{font-size:30px;margin:0 0 6px}.eo-about-hero p{margin:0;color:#dbeafe;line-height:1.6}.eo-about-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}.eo-about-rule{padding:16px}.eo-about-rule h4{margin:0 0 8px;color:#074ca1}.eo-mobile-next{display:none}
      body.theme-excel .eo-next-hero{background:#217346!important;border:1px solid #185c37!important;border-radius:0!important}.theme-excel .eo-pill{border-radius:0;background:#e2f0d9;color:#185c37}.theme-excel .eo-history-item,.theme-excel .eo-mini-row,.theme-excel .eo-weather-item{border-radius:0;border-color:#b7c9b7}.theme-excel .eo-about-hero{background:#217346!important;border-radius:0!important}.theme-excel .eo-about-rule h4{color:#185c37}
      body.theme-groupware .eo-next-hero{background:#fff!important;color:#111827!important;border:1px solid #c7d8ea!important;border-radius:0!important;box-shadow:0 1px 4px rgba(0,0,0,.12)!important}.theme-groupware .eo-next-hero h3{color:#174ea6}.theme-groupware .eo-pill{background:#eaf3ff;color:#174ea6;border-radius:2px}.theme-groupware .eo-history-item,.theme-groupware .eo-mini-row,.theme-groupware .eo-weather-item{border-radius:2px}.theme-groupware .eo-about-hero{background:#fff!important;color:#111827!important;border:1px solid #c7d8ea!important;border-radius:0!important}.theme-groupware .eo-about-hero h3{color:#174ea6}.theme-groupware .eo-about-hero p{color:#64748b}.theme-groupware .eo-about-rule h4{color:#174ea6}
      @media(max-width:900px){.eo-next-watch{grid-template-columns:1fr;margin:12px 0}.eo-next-hero{border-radius:22px!important}.eo-about-hero{grid-template-columns:1fr;text-align:center}.eo-about-logo{margin:0 auto}.eo-about-grid{grid-template-columns:1fr}.eo-seat-editor .row{grid-template-columns:1fr}.eo-history-item{grid-template-columns:1fr}.dashboard-grid{grid-template-columns:1fr!important}.grid4{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.metric{padding:14px!important}.metric .value{font-size:22px!important}.main{padding:14px!important}.topbar h2{font-size:24px!important}.eo-mobile-next{display:block}.eo-weather-grid{grid-template-columns:1fr}.rank-grid{grid-template-columns:1fr!important}}
      @media(max-width:520px){.grid4{grid-template-columns:1fr!important}.eo-next-hero h3{font-size:20px}.eo-about-hero h3{font-size:26px}}
    `;
    if(!style){style=document.createElement('style');style.id='eoheungMemberLogoPatchStyle';document.head.appendChild(style)}
    if(style.textContent!==css)style.textContent=css;
  }

  async function applyLogo(){
    const logo=await loadLogo();
    $$('.brand').forEach(brand=>{
      const logoBox=brand.querySelector('.logo');
      const h1=brand.querySelector('h1');
      const p=brand.querySelector('p');
      if(logoBox&&logo){
        logoBox.classList.add('eoheung-logo-box');
        logoBox.innerHTML=`<img class="eoheung-main-logo" src="${logo}" alt="어흥 로고">`;
      }
      if(h1)h1.textContent='어흥';
      if(p)p.textContent='삼성 라이온즈 직관 모임';
    });
    document.title='어흥 - 삼성 라이온즈 직관 모임';
  }

  function patchHeader(){
    const row=$('#members thead tr');
    if(row)row.innerHTML='<th>직책</th><th>이름</th><th>부서</th><th>연락처</th><th>메모</th><th></th>';
  }
  function ensureForm(){
    const name=$('#memberName');
    if(!name)return;
    if(!$('#memberPosition')){
      const input=document.createElement('input');
      input.id='memberPosition';
      input.className='input';
      input.placeholder='직책';
      name.parentNode.insertBefore(input,name);
    }
    const fav=$('#memberFavorite');
    if(fav)fav.remove();
    const status=$('#memberStatus');
    if(status)status.remove();
  }

  function patchedRenderMembers(){
    const root=$('#memberRows');
    if(!root||typeof state==='undefined')return;
    patchHeader();
    root.innerHTML=state.members.length?state.members.map(m=>{
      const extra=splitMemberMemo(m);
      const pos=extra.position||'-';
      return `<tr><td><span class="member-position-badge">${esc(pos)}</span></td><td><b>${esc(m.name)}</b></td><td>${esc(m.department||'')}</td><td>${esc(m.phone||'')}</td><td class="member-memo-cell">${esc(extra.memo||'')}</td><td><button class="btn secondary" data-edit-member="${m.id}">수정</button></td></tr>`;
    }).join(''):'<tr><td colspan="6" class="empty">등록된 회원이 없습니다.</td></tr>';
  }
  function patchedClearMemberForm(){
    ensureForm();
    ['memberId','memberPosition','memberName','memberDepartment','memberPhone','memberMemo'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});
    const title=$('#memberModalTitle');
    if(title)title.textContent='회원 추가';
  }
  function patchedEditMember(id){
    if(typeof state==='undefined')return;
    ensureForm();
    const m=state.members.find(x=>String(x.id)===String(id));
    if(!m)return;
    const extra=splitMemberMemo(m);
    $('#memberModalTitle').textContent='회원 수정';
    $('#memberId').value=m.id;
    $('#memberPosition').value=extra.position||'';
    $('#memberName').value=m.name||'';
    $('#memberDepartment').value=m.department||'';
    $('#memberPhone').value=m.phone||'';
    $('#memberMemo').value=extra.memo||'';
    if(typeof openModal==='function')openModal('memberModal');
  }
  async function patchedSaveMember(){
    if(typeof state==='undefined'||!state.client)return;
    ensureForm();
    const id=$('#memberId').value;
    const original=state.members.find(x=>String(x.id)===String(id));
    const payload={name:$('#memberName').value.trim(),department:$('#memberDepartment').value.trim(),phone:$('#memberPhone').value.trim(),favorite_player:'',status:original?.status||'active',memo:mergeMemberMemo($('#memberPosition').value,$('#memberMemo').value)};
    if(!payload.name){if(typeof toast==='function')toast('이름을 입력해 주세요.');return;}
    const res=id?await state.client.from('members').update(payload).eq('id',id):await state.client.from('members').insert(payload);
    if(res.error){if(typeof toast==='function')toast('회원 저장 오류: '+res.error.message);return;}
    await recordChange(id?'회원 수정':'회원 추가',`${payload.name} / ${$('#memberPosition').value||'-'}`,'member',id||payload.name);
    if(typeof closeModal==='function')closeModal('memberModal');
    if(typeof loadAll==='function')await loadAll();
  }

  async function saveGameSeat(gameId){
    const game=state.games.find(g=>String(g.id)===String(gameId));
    if(!game||!state.client)return;
    const seat=$(`#seat-${gameId}`)?.value||'';
    const memo=$(`#seatmemo-${gameId}`)?.value||'';
    const payload={memo:mergeGameMemo(seat,memo)};
    const {error}=await state.client.from('games').update(payload).eq('id',gameId);
    if(error){if(typeof toast==='function')toast('좌석 저장 오류: '+error.message);return;}
    game.memo=payload.memo;
    await recordChange('좌석/메모 저장',`${game.game_date} ${game.opponent} / 좌석: ${seat||'-'}`,'game',gameId);
    if(typeof toast==='function')toast('좌석/메모를 저장했습니다.');
    renderNextWatchPanel();
    if(typeof renderCalendar==='function')renderCalendar();
  }

  function patchedRenderDateDetail(){
    if(typeof state==='undefined'||typeof gamesOnDate!=='function')return;
    const root=$('#dateDetail'); if(!root)return;
    const games=gamesOnDate(state.selectedDate);
    if(!games.length){root.innerHTML=`<div class="empty"><b>${state.selectedDate}</b><br>등록된 경기가 없습니다.</div>`;return}
    if(!state.members.length){root.innerHTML=`<div class="empty"><b>${state.selectedDate}</b><br>회원 관리에서 회원을 먼저 등록해 주세요.</div>`;return}
    const activeMembers=state.members.filter(m=>m.status!=='dormant');
    root.innerHTML=games.map(g=>{
      const entries=typeof gameEntries==='function'?gameEntries(g.id):[];
      const rows=activeMembers.map(m=>{const e=entries.find(x=>x.member_id===m.id);return`<div class="check-row"><label>${esc(m.name)}</label><input type="checkbox" data-game="${g.id}" data-member="${m.id}" ${e?.attended?'checked':''}></div>`}).join('');
      const gm=splitGameMemo(g.memo);
      return `<div class="card pad" style="margin-bottom:12px"><div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">${typeof gameLabelHtml==='function'?gameLabelHtml(g,'team-logo'):esc(g.opponent)} ${typeof resultBadge==='function'?resultBadge(g):''}</h3><p class="note" style="margin:6px 0 0">${esc(state.selectedDate)} · ${typeof homeAwayText==='function'?homeAwayText(g.home_away):esc(g.home_away)} · ${esc(g.stadium||'-')}</p></div><button class="btn secondary" data-edit-game="${g.id}">경기 수정</button></div><div class="eo-seat-editor"><label>좌석 / 직관 메모</label><div class="row"><input id="seat-${g.id}" class="input" placeholder="예: 1루 블루존 204구역 7열" value="${esc(gm.seat)}"><textarea id="seatmemo-${g.id}" class="input" placeholder="예: 티켓 4매, 치킨 예약, 집결 장소 등">${esc(gm.memo)}</textarea><button class="btn green" data-save-seat="${g.id}">저장</button></div></div><h4>직관 회원</h4><div class="member-checks">${rows}</div></div>`;
    }).join('');
  }

  function nextWatchGame(){
    if(typeof state==='undefined')return null;
    const today=ymd(new Date());
    const watchedIds=new Set((state.gameMembers||[]).filter(x=>x.attended).map(x=>x.game_id));
    return (state.games||[]).filter(g=>g.game_date>=today&&g.status==='SCHEDULED'&&watchedIds.has(g.id)).sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')))[0]||null;
  }
  function renderNextWatchPanel(){
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
  function historyRowHtml(r){return `<div class="eo-mini-row"><b>${esc(r.action)}</b><span class="note">${new Date(r.created_at).toLocaleString('ko-KR')} · ${esc(r.actor||'unknown')}</span><span>${esc(r.detail||'')}</span></div>`}

  const WEATHER_CODES={0:'맑음',1:'대체로 맑음',2:'구름 조금',3:'흐림',45:'안개',48:'안개',51:'이슬비',53:'이슬비',55:'이슬비',61:'비',63:'비',65:'강한 비',71:'눈',73:'눈',75:'강한 눈',80:'소나기',81:'소나기',82:'강한 소나기',95:'뇌우'};
  async function enhancedWeatherForGame(g){
    try{
      const coords=(typeof STADIUM_COORDS!=='undefined'?STADIUM_COORDS[g.stadium]:null);
      if(!coords)return {text:'날씨 정보 없음',html:'<span class="eo-weather-badge">날씨 정보 없음</span>'};
      const [lat,lon]=coords;
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FSeoul&start_date=${g.game_date}&end_date=${g.game_date}`;
      const r=await fetch(url); if(!r.ok)throw new Error('weather');
      const d=await r.json();
      const code=d.daily?.weather_code?.[0], max=d.daily?.temperature_2m_max?.[0], min=d.daily?.temperature_2m_min?.[0], pop=d.daily?.precipitation_probability_max?.[0], wind=d.daily?.wind_speed_10m_max?.[0];
      const label=WEATHER_CODES[code]||'예보';
      const text=`${label} · ${Math.round(min)}~${Math.round(max)}℃ · 강수 ${pop??'-'}% · 바람 ${Math.round(wind??0)}km/h`;
      return {text,html:`<div class="eo-weather-grid"><div class="eo-weather-item"><b>${label}</b><span>하늘 상태</span></div><div class="eo-weather-item"><b>${Math.round(min)}~${Math.round(max)}℃</b><span>최저/최고</span></div><div class="eo-weather-item"><b>${pop??'-'}%</b><span>강수 확률</span></div><div class="eo-weather-item"><b>${Math.round(wind??0)}km/h</b><span>최대 풍속</span></div></div>`};
    }catch(e){return {text:'날씨 불러오기 실패',html:'<span class="eo-weather-badge">날씨 불러오기 실패</span>'}}
  }
  async function renderEnhancedWeatherCards(){
    const box=$('#dashSamsungWeek'); if(!box||typeof state==='undefined')return;
    const today=ymd(new Date()); const end=typeof addDays==='function'?addDays(today,6):today;
    const games=(state.games||[]).filter(g=>g.game_date>=today&&g.game_date<=end).sort((a,b)=>(a.game_date+(a.game_time||'')).localeCompare(b.game_date+(b.game_time||'')));
    if(!games.length){box.innerHTML='<div class="empty">향후 7일 내 등록된 삼성 경기가 없습니다.</div>';return}
    box.innerHTML=games.map(g=>`<div class="eo-mini-row" data-eo-weather="${g.id}"><b>${esc(g.game_date)} ${(g.game_time||'').slice(0,5)} · ${g.home_away==='AWAY'?'@':'vs'} ${esc(g.opponent)}</b><span class="note">${esc(g.stadium||'-')} · ${typeof statusText==='function'?statusText(g.status):g.status}</span><div class="eo-weather-badge">날씨 불러오는 중...</div></div>`).join('');
    for(const g of games){const target=$(`[data-eo-weather="${g.id}"] .eo-weather-badge`);const card=$(`[data-eo-weather="${g.id}"]`);const w=await enhancedWeatherForGame(g);if(target)target.outerHTML=w.html; if(card)card.title=w.text;}
  }

  function ensureHistoryPanel(){
    const settings=$('#settings'); if(!settings||$('#eoHistoryPanel'))return;
    const card=document.createElement('div');card.id='eoHistoryPanel';card.className='card pad';card.style.marginTop='14px';
    card.innerHTML=`<div class="eo-dashboard-card-title"><h3>변경 이력</h3><div class="toolbar" style="margin:0"><button class="btn secondary" data-export-history>내보내기</button><button class="btn danger" data-clear-history>로컬 이력 삭제</button></div></div><p class="note">회원 수정, 직관 체크, 좌석/메모 저장 등 주요 변경 내역을 기록합니다. Supabase change_logs 테이블이 없으면 현재 브라우저 로컬 이력으로 보관됩니다.</p><div id="eoHistoryList" class="eo-history-list"></div>`;
    settings.appendChild(card);
  }
  function renderHistoryPanel(){
    ensureHistoryPanel();
    const list=$('#eoHistoryList'); if(!list)return;
    const rows=getLocalHistory().slice(0,80);
    list.innerHTML=rows.length?rows.map(r=>`<div class="eo-history-item"><time>${new Date(r.created_at).toLocaleString('ko-KR')}</time><div><b>${esc(r.action)}</b><p>${esc(r.detail||'')}<br>${esc(r.actor||'unknown')}</p></div></div>`).join(''):'<div class="empty">변경 이력이 없습니다.</div>';
  }

  async function ensureAboutPage(){
    const main=$('.main'); const nav=$('.nav'); if(!main||!nav)return;
    if(!$('#about')){
      const sec=document.createElement('section');sec.id='about';sec.className='section';
      const logo=await loadLogo();
      sec.innerHTML=`<div class="card pad eo-about-hero"><div class="eo-about-logo">${logo?`<img src="${logo}" alt="어흥 로고">`:''}</div><div><h3>어흥</h3><p>삼성 라이온즈를 응원하는 직관 모임입니다. 함께 경기장을 찾고, 직관 기록과 승리의 순간을 모아갑니다.</p></div></div><div class="eo-about-grid"><div class="card pad eo-about-rule"><h4>🐯 모임 정체성</h4><p class="note">삼성 블루와 사자 응원 문화를 바탕으로 한 직관 중심 모임입니다.</p></div><div class="card pad eo-about-rule"><h4>📅 운영 방식</h4><p class="note">캘린더에서 직관 예정일과 참석 회원, 좌석 정보를 함께 관리합니다.</p></div><div class="card pad eo-about-rule"><h4>🏆 기록 문화</h4><p class="note">직관 횟수, 승리요정, 승률을 기록해 시즌별 추억을 남깁니다.</p></div></div>`;
      main.appendChild(sec);
    }
    if(!nav.querySelector('[data-page="about"]')){
      const btn=document.createElement('button');btn.dataset.page='about';btn.textContent='🐯 모임 소개';
      nav.appendChild(btn);
      btn.onclick=()=>showPage('about');
    }
  }
  function showPage(page){
    if(typeof state!=='undefined')state.page=page;
    document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
    document.querySelectorAll('.section').forEach(s=>s.classList.toggle('active',s.id===page));
    const titles={about:['모임 소개','어흥의 모임 소개와 운영 기준입니다.'],settings:['설정','운영 정보를 확인합니다.']};
    if(titles[page]){const t=$('#pageTitle'),p=$('#pageSub');if(t)t.textContent=titles[page][0];if(p)p.textContent=titles[page][1];}
  }

  function installOverrides(){
    ensureForm(); patchHeader();
    try{window.renderMembers=patchedRenderMembers;renderMembers=patchedRenderMembers}catch(e){window.renderMembers=patchedRenderMembers}
    try{window.clearMemberForm=patchedClearMemberForm;clearMemberForm=patchedClearMemberForm}catch(e){window.clearMemberForm=patchedClearMemberForm}
    try{window.editMember=patchedEditMember;editMember=patchedEditMember}catch(e){window.editMember=patchedEditMember}
    try{window.saveMember=patchedSaveMember;saveMember=patchedSaveMember}catch(e){window.saveMember=patchedSaveMember}
    try{window.renderDateDetail=patchedRenderDateDetail;renderDateDetail=patchedRenderDateDetail}catch(e){window.renderDateDetail=patchedRenderDateDetail}
    const save=$('#saveMemberBtn');if(save)save.onclick=patchedSaveMember;
    const add=$('#openMemberModalBtn');if(add)add.onclick=()=>{patchedClearMemberForm();if(typeof openModal==='function')openModal('memberModal')};
    patchedRenderMembers();
  }

  function bindOnce(){
    if(window.__eoheungUpgradesBound)return; window.__eoheungUpgradesBound=true;
    document.body.addEventListener('click',async e=>{
      const seat=e.target.closest('[data-save-seat]'); if(seat){e.preventDefault(); await saveGameSeat(seat.dataset.saveSeat); return;}
      const hist=e.target.closest('[data-open-history]'); if(hist){e.preventDefault(); showPage('settings'); renderHistoryPanel(); return;}
      if(e.target.closest('[data-clear-history]')){e.preventDefault(); if(confirm('현재 브라우저에 저장된 로컬 변경 이력을 삭제할까요?')){setLocalHistory([]);renderHistoryPanel();renderNextWatchPanel();} return;}
      if(e.target.closest('[data-export-history]')){e.preventDefault(); const blob=new Blob([JSON.stringify(getLocalHistory(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='eoheung_change_history.json'; a.click(); URL.revokeObjectURL(a.href); return;}
    },true);
    document.body.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"][data-game]')){setTimeout(()=>recordChange('직관 체크 변경',`경기 ID ${e.target.dataset.game} / 회원 ID ${e.target.dataset.member} / ${e.target.checked?'체크':'해제'}`,'attendance',e.target.dataset.game),120)}});
  }

  async function run(){
    injectStyle();
    await applyLogo();
    installOverrides();
    await ensureAboutPage();
    ensureHistoryPanel();
    renderHistoryPanel();
    renderNextWatchPanel();
    renderEnhancedWeatherCards();
    bindOnce();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setInterval(()=>{try{injectStyle();applyLogo();installOverrides();ensureAboutPage();ensureHistoryPanel();renderHistoryPanel();renderNextWatchPanel()}catch(e){}},1800);
})();