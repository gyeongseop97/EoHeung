(()=>{
  'use strict';
  const MIN_RANK_GAMES=3;
  const SEATS=['블루존','3루 내야 지정석','1루 내야 지정석','중앙 테이블석','익사이팅존','SKY 지정석','외야 지정석','잔디석'];
  const $=(s,r=document)=>r.querySelector(s);
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finished=g=>g&&g.status==='FINISHED'&&['W','L','D'].includes(g.result);
  const appState=()=>typeof state!=='undefined'?state:null;
  const attendance=()=>appState()?.gameMembers||[];
  const members=()=>appState()?.members||[];
  const games=()=>appState()?.games||[];
  function records(){
    return members().map(member=>{
      const entries=attendance().filter(e=>e.member_id===member.id&&e.attended);
      const watched=entries.map(e=>games().find(g=>g.id===e.game_id)).filter(finished);
      const wins=watched.filter(g=>g.result==='W').length,losses=watched.filter(g=>g.result==='L').length,draws=watched.filter(g=>g.result==='D').length;
      const home=watched.filter(g=>g.home_away==='HOME'),away=watched.filter(g=>g.home_away==='AWAY');
      const opponents={};watched.forEach(g=>opponents[g.opponent]=(opponents[g.opponent]||0)+1);
      const topOpponent=Object.entries(opponents).sort((a,b)=>b[1]-a[1])[0];
      const runs=watched.reduce((n,g)=>n+(Number(g.samsung_score)||0),0);
      return{member,watched,wins,losses,draws,rate:wins+losses?wins/(wins+losses):0,homeWins:home.filter(g=>g.result==='W').length,homeLosses:home.filter(g=>g.result==='L').length,awayWins:away.filter(g=>g.result==='W').length,awayLosses:away.filter(g=>g.result==='L').length,topOpponent,avgRuns:watched.length?(runs/watched.length).toFixed(1):'-'};
    });
  }
  function pair(a,b){
    const aIds=new Set(attendance().filter(e=>e.member_id===a&&e.attended).map(e=>e.game_id));
    const shared=attendance().filter(e=>e.member_id===b&&e.attended&&aIds.has(e.game_id)).map(e=>games().find(g=>g.id===e.game_id)).filter(finished);
    const wins=shared.filter(g=>g.result==='W').length,losses=shared.filter(g=>g.result==='L').length,draws=shared.filter(g=>g.result==='D').length;
    const score=shared.length?Math.round((wins+.5*draws)/shared.length*100):0;
    return{shared,wins,losses,draws,score};
  }
  function badges(r){return[
    ['첫 직관','🎟️',r.watched.length>=1],['시즌 5경기','🖐️',r.watched.length>=5],['라팍 지박령','🏟️',r.watched.filter(g=>g.home_away==='HOME').length>=10],['전국구','🗺️',new Set(r.watched.map(g=>g.stadium).filter(Boolean)).size>=3],['승리의 파랑새','🐦',r.wins>=5],['원정대','🚌',r.watched.some(g=>g.home_away==='AWAY')]
  ]}
  function ensureUI(){
    const dashboard=$('#dashboard'),record=$('#records');if(!dashboard||!record)return;
    if(!$('#fanGameDay'))dashboard.insertAdjacentHTML('afterbegin','<div id="fanGameDay" class="card fan-game-day"></div>');
    if(!$('#fanExperience'))record.insertAdjacentHTML('afterbegin','<div id="fanExperience"></div>');
    if(!$('#fanModal'))document.body.insertAdjacentHTML('beforeend','<div id="fanModal" class="fan-modal" role="dialog" aria-modal="true"><div class="fan-modal-panel"><div class="fan-modal-head"><h3 id="fanModalTitle"></h3><button type="button" data-fan-close>닫기</button></div><div id="fanModalBody"></div></div></div>');
  }
  function renderGameDay(){
    const root=$('#fanGameDay');if(!root)return;const today=new Date().toISOString().slice(0,10),game=games().find(g=>g.game_date===today);
    if(!game){root.innerHTML='<div class="fan-kicker">TODAY’S EOHEUNG</div><h3>오늘은 경기가 없습니다</h3><p>기록실에서 직관 전적과 궁합을 확인해 보세요.</p><div class="fan-actions"><button data-fan-page="records">기록실 보기</button></div>';return}
    const people=attendance().filter(e=>e.game_id===game.id&&(e.planned||e.attended)).map(e=>members().find(m=>m.id===e.member_id)?.name).filter(Boolean);
    root.innerHTML=`<div class="fan-kicker">GAME DAY</div><h3>삼성 ${game.home_away==='HOME'?'vs':'@'} ${safe(game.opponent)}</h3><p>${safe((game.game_time||'').slice(0,5))} · ${safe(game.stadium||'구장 미정')}</p><p><b>오늘 직관 ${people.length}명</b> ${people.length?'· '+safe(people.join(' · ')):''}</p><div class="fan-actions"><button data-fan-page="schedule">경기 일정 열기</button>${game.ticket_url?`<button data-fan-link="${safe(game.ticket_url)}">티켓 링크</button>`:''}</div>`;
  }
  function renderExperience(){
    const root=$('#fanExperience');if(!root)return;const rs=records(),eligible=rs.filter(r=>r.watched.length>=MIN_RANK_GAMES),best=[...eligible].sort((a,b)=>b.rate-a.rate||b.wins-a.wins)[0],worst=[...eligible].sort((a,b)=>a.rate-b.rate||b.losses-a.losses)[0];
    const totalIds=new Set(attendance().filter(e=>e.attended).map(e=>e.game_id));const watchedGames=games().filter(g=>totalIds.has(g.id)&&finished(g)),wins=watchedGames.filter(g=>g.result==='W').length;
    root.innerHTML=`<div class="fan-section"><div class="fan-section-head"><div><h3>어흥 팬 기록</h3><p class="fan-muted">최소 ${MIN_RANK_GAMES}경기부터 승률 랭킹에 반영됩니다.</p></div></div><div class="fan-grid">
      <div class="fan-card"><h4>🧚 승리요정</h4>${best?`<button class="fan-member-button" data-fan-member="${best.member.id}">${safe(best.member.name)}</button><div class="fan-stat">${Math.round(best.rate*100)}%</div><div class="fan-muted">${best.wins}승 ${best.losses}패 · ${best.watched.length}경기</div>`:'<div class="fan-empty">아직 기준 경기 수가 부족해요.</div>'}</div>
      <div class="fan-card"><h4>☠️ 패배요정</h4>${worst?`<button class="fan-member-button" data-fan-member="${worst.member.id}">${safe(worst.member.name)}</button><div class="fan-stat">${Math.round(worst.rate*100)}%</div><div class="fan-muted">${worst.wins}승 ${worst.losses}패 · ${worst.watched.length}경기</div>`:'<div class="fan-empty">아직 기준 경기 수가 부족해요.</div>'}</div>
      <div class="fan-card"><h4>💙 직관 궁합</h4><div class="fan-compat-selects"><select id="fanPairA">${memberOptions()}</select><select id="fanPairB">${memberOptions(1)}</select><button class="btn" data-fan-compat>확인</button></div><div id="fanCompatResult" class="fan-muted" style="margin-top:10px">두 회원의 직관 궁합을 확인해 보세요.</div></div>
      <div class="fan-card"><h4>🏟️ 좌석 도감</h4><div class="fan-stat">${seatData().length}/${SEATS.length}</div><div class="fan-muted">가본 라팍 좌석을 모아보세요.</div><button class="btn secondary" data-fan-seats style="margin-top:10px">도감 열기</button></div>
      <div class="fan-card fan-wrapped"><h4>✨ 어흥 ${new Date().getFullYear()} Wrapped</h4><div class="fan-stat">${watchedGames.length}경기</div><div>${wins}승 · 직관 승률 ${watchedGames.length?Math.round(wins/Math.max(1,watchedGames.filter(g=>g.result!=='D').length)*100):0}%</div><button class="btn secondary" data-fan-wrapped style="margin-top:10px">시즌 결산 보기</button></div>
      <div class="fan-card"><h4>🏅 업적</h4><div>${rs.flatMap(badges).filter(x=>x[2]).length}개 달성</div><div class="fan-muted">회원 이름을 누르면 개인 전적과 업적을 볼 수 있어요.</div></div>
    </div></div>`;
  }
  function memberOptions(skip=0){return members().map((m,i)=>`<option value="${m.id}" ${i===skip?'selected':''}>${safe(m.name)}</option>`).join('')}
  function seatData(){try{return JSON.parse(localStorage.getItem('eoheung_seat_catalog')||'[]')}catch{return[]}}
  function openModal(title,html){$('#fanModalTitle').textContent=title;$('#fanModalBody').innerHTML=html;$('#fanModal').classList.add('show')}
  function profile(id){const r=records().find(x=>x.member.id===id);if(!r)return;openModal(`${r.member.name}님의 직관 기록`,`<div class="fan-grid"><div class="fan-card"><h4>통산</h4><div class="fan-stat">${r.wins}승 ${r.losses}패</div><div>${r.draws}무 · 승률 ${Math.round(r.rate*100)}%</div></div><div class="fan-card"><h4>홈 / 원정</h4><b>라팍 ${r.homeWins}승 ${r.homeLosses}패</b><br><b>원정 ${r.awayWins}승 ${r.awayLosses}패</b></div><div class="fan-card"><h4>직관 성향</h4><div>최다 상대 ${r.topOpponent?safe(r.topOpponent[0])+' '+r.topOpponent[1]+'경기':'-'}</div><div>평균 삼성 득점 ${r.avgRuns}</div></div></div><div class="fan-section"><h4>업적</h4>${badges(r).map(b=>`<span class="fan-badge ${b[2]?'':'locked'}">${b[1]} ${b[0]}</span>`).join('')}</div>`)}
  function compatibility(){const a=$('#fanPairA')?.value,b=$('#fanPairB')?.value,out=$('#fanCompatResult');if(!a||!b||!out)return;if(a===b){out.textContent='서로 다른 회원을 선택해 주세요.';return}const p=pair(a,b);out.innerHTML=p.shared.length?`같이 본 <b>${p.shared.length}경기</b> · ${p.wins}승 ${p.losses}패 ${p.draws}무 · 궁합 <b>${p.score}점</b><br>${p.score>=70?'다음 경기도 같이 가세요! 💙':p.score<35?'⚠️ 구단을 위해 따로 관람하는 것을 권장합니다.':'무난한 직관 조합이에요.'}`:'함께 완료한 직관 기록이 없습니다.'}
  function seats(){const selected=new Set(seatData());openModal('라팍 좌석 도감',`<p class="fan-muted">가본 구역을 체크하면 이 기기에 저장됩니다.</p><div class="fan-seat-grid">${SEATS.map(s=>`<label class="fan-seat"><input type="checkbox" data-fan-seat value="${safe(s)}" ${selected.has(s)?'checked':''}> ${safe(s)}</label>`).join('')}</div>`)}
  function wrapped(){const rs=records().sort((a,b)=>b.watched.length-a.watched.length),ids=new Set(attendance().filter(e=>e.attended).map(e=>e.game_id)),wg=games().filter(g=>ids.has(g.id)&&finished(g)),op={};wg.forEach(g=>op[g.opponent]=(op[g.opponent]||0)+1);const top=Object.entries(op).sort((a,b)=>b[1]-a[1])[0];openModal(`어흥 ${new Date().getFullYear()} 시즌 결산`,`<div class="fan-card fan-wrapped"><div class="fan-kicker">EOHEUNG WRAPPED</div><h3>우리는 올해 ${wg.length}경기를 직관했습니다.</h3><div class="fan-grid"><div><b>가장 많이 본 상대</b><div class="fan-stat">${top?safe(top[0]):'-'}</div><small>${top?top[1]+'경기':''}</small></div><div><b>최다 직관</b><div class="fan-stat">${rs[0]?safe(rs[0].member.name):'-'}</div><small>${rs[0]?rs[0].watched.length+'경기':''}</small></div><div><b>모임 승률</b><div class="fan-stat">${wg.length?Math.round(wg.filter(g=>g.result==='W').length/Math.max(1,wg.filter(g=>g.result!=='D').length)*100):0}%</div></div></div></div>`)}
  function bind(){document.addEventListener('click',e=>{const t=e.target.closest('[data-fan-member],[data-fan-close],[data-fan-compat],[data-fan-seats],[data-fan-wrapped],[data-fan-page],[data-fan-link]');if(!t)return;if(t.dataset.fanMember)profile(t.dataset.fanMember);if(t.hasAttribute('data-fan-close'))$('#fanModal').classList.remove('show');if(t.hasAttribute('data-fan-compat'))compatibility();if(t.hasAttribute('data-fan-seats'))seats();if(t.hasAttribute('data-fan-wrapped'))wrapped();if(t.dataset.fanPage&&window.navigateToPage)window.navigateToPage(t.dataset.fanPage);if(t.dataset.fanLink)window.open(t.dataset.fanLink,'_blank','noopener')});document.addEventListener('change',e=>{if(!e.target.matches('[data-fan-seat]'))return;const values=[...document.querySelectorAll('[data-fan-seat]:checked')].map(x=>x.value);localStorage.setItem('eoheung_seat_catalog',JSON.stringify(values));renderExperience()})}
  function render(){ensureUI();renderGameDay();renderExperience()}
  function start(){ensureUI();bind();const original=window.renderAll;if(typeof original==='function')window.renderAll=function(){const result=original.apply(this,arguments);render();return result};render()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
