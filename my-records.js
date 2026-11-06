(function(){
  'use strict';
  const $=s=>document.querySelector(s),M=EoMyRecords;
  const ui={year:'ALL',month:'ALL',season:'ALL',limit:20};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const decimal=n=>n==null?'—':n.toFixed(1),rate=n=>n==null?'—':(n*100).toFixed(1)+'%';
  const signed=n=>n==null?'—':(n>0?'+':'')+n;
  const resultText=g=>g.finished?({W:'승',L:'패',D:'무'}[g.result]||'결과 확인 중'):/POSTPONED|CANCEL/i.test(g.status)?'연기/취소':'예정';
  const kind=g=>EoSeason.kind(EoSeason.fromSamsung(g));
  const phase=g=>({REGULAR:'정규',POSTSEASON:EoSeason.round(g)||'PS',PRESEASON:'시범'}[kind(g)]||'미분류');
  function metric(label,value,sub,cls=''){return `<div class="my-metric ${cls}"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;}
  function highlight(label,record,points=true){
    const games=record?.games||[];
    return `<div class="my-highlight"><span>${label}</span><strong>${record?esc(points?record.value:signed(record.value))+(points?'점':'점 차'):'—'}</strong><small>${games.slice(0,2).map(g=>`${esc(g.game_date)} · ${esc(g.opponent)} ${g.rs}:${g.ra}`).join('<br>')||'직관 기록이 쌓이면 표시됩니다.'}${games.length>2?`<br>외 ${games.length-2}경기`:''}</small></div>`;
  }
  function groupTable(title,rows){
    return `<section class="card pad my-breakdown"><h3>${title}</h3>${rows.length?`<div class="table-wrap"><table><thead><tr><th>구분</th><th>직관</th><th>승·무·패</th><th>승률</th><th>평균 득점</th><th>평균 실점</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.label)}</th><td>${r.games}</td><td>${r.wins}·${r.draws}·${r.losses}</td><td>${rate(r.rate)}</td><td>${decimal(r.avgRs)}</td><td>${decimal(r.avgRa)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">완료한 직관 기록이 없습니다.</div>'}</section>`;
  }
  function render(){
    const root=$('#myRecords');if(!root||typeof state==='undefined')return;
    const member=M.self(state.members,state.user);
    if(!member){root.innerHTML='<div class="card pad my-empty"><span class="my-kicker">MY BASEBALL DIARY</span><h3>내 직관 기록을 연결해 주세요</h3><p>로그인 계정과 연결된 회원 정보를 찾지 못했습니다. 내 설정에서 가입 정보를 확인하거나 관리자에게 회원 연결을 요청해 주세요.</p><button type="button" class="btn secondary" data-my-settings>내 설정 보기</button></div>';return;}
    const all=M.personalGames(state.games,state.gameMembers,member.id);
    const years=Array.from(new Set(all.map(g=>String(g.game_date).slice(0,4)))).sort().reverse();
    if(ui.year!=='ALL'&&!years.includes(ui.year))ui.year='ALL';
    const rows=M.filter(all,ui,kind),s=M.summary(rows);
    const history=[...rows].reverse(),months=M.group(rows,g=>g.game_date.slice(0,7)).sort((a,b)=>a.label.localeCompare(b.label));
    root.innerHTML=`<div class="my-record-head"><div><span class="my-kicker">MY BASEBALL DIARY</span><h3>${esc(member.name)}님의 야구장 일지</h3><p>함께한 경기, 그날의 점수, 나만의 승리 기록.</p></div><div class="my-filter"><label>시즌<select id="myRecordYear"><option value="ALL">전체 시즌</option>${years.map(y=>`<option value="${y}" ${ui.year===y?'selected':''}>${y}년</option>`).join('')}</select></label><label>월<select id="myRecordMonth"><option value="ALL">전체 월</option>${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${Number(ui.month)===i+1?'selected':''}>${i+1}월</option>`).join('')}</select></label><label>경기 구분<select id="myRecordSeason">${[['ALL','전체 경기'],['REGULAR','정규시즌'],['POSTSEASON','포스트시즌'],['PRESEASON','시범경기']].map(([key,label])=>`<option value="${key}" ${ui.season===key?'selected':''}>${label}</option>`).join('')}</select></label></div></div>
    <div class="my-metric-grid">${metric('완료한 직관',`${s.games}<em>경기</em>`,`직관 예정 ${s.pending}경기`)}${metric('내 직관 승률',rate(s.rate),`${s.wins}승 · ${s.draws}무 · ${s.losses}패`,'my-primary')}${metric('경기당 평균 득점',decimal(s.avgRs),'삼성 득점 기준')}${metric('경기당 평균 실점',decimal(s.avgRa),'상대 팀 득점 기준')}</div>
    <div class="my-record-note">참석 체크한 종료 경기 기준 · 승률은 무승부 제외 · 득실점은 점수가 확인된 ${s.scored}경기 기준${s.unknown?' · 결과 미확인 '+s.unknown+'경기':''}. 필터를 바꾸면 아래 통계와 일지가 함께 바뀝니다.</div>
    <div class="my-story-grid"><section class="card pad my-season-story"><div class="my-card-head"><h3>나의 관전 기록</h3><span>삼성 기준</span></div><div class="my-score-totals"><div><span>누적 득점</span><strong>${s.scored?s.rs:'—'}</strong></div><div><span>누적 실점</span><strong>${s.scored?s.ra:'—'}</strong></div><div><span>누적 득실차</span><strong>${s.scored?signed(s.diff):'—'}</strong></div></div><div class="my-fun-stats"><span>최장 연승 <b>${s.winStreak}경기</b></span><span>최장 연패 <b>${s.lossStreak}경기</b></span><span>완봉승 직관 <b>${s.shutoutWins}회</b></span><span>영봉패 직관 <b>${s.shutoutLosses}회</b></span><span>1점 차 승부 <b>${s.close}회</b></span><span>방문 구장 <b>${new Set(rows.filter(g=>g.finished).map(g=>g.stadium).filter(Boolean)).size}곳</b></span></div></section>
    <section class="card pad my-month-card"><div class="my-card-head"><h3>월별 직관 흐름</h3><span><i class="my-dot win"></i> 승 <i class="my-dot draw"></i> 무 <i class="my-dot loss"></i> 패</span></div>${months.length?`<div class="my-month-list">${months.map(m=>`<div class="my-month"><span>${esc(m.label)}</span><div class="my-month-bar" role="img" aria-label="${m.label}: ${m.wins}승 ${m.draws}무 ${m.losses}패, 승률 ${rate(m.rate)}">${[['win',m.wins],['draw',m.draws+m.unknown],['loss',m.losses]].map(([c,n])=>`<i class="${c}" style="width:${n/Math.max(...months.map(x=>x.games))*100}%"></i>`).join('')}</div><b>${m.games}경기</b><small>${rate(m.rate)}</small></div>`).join('')}</div>`:'<div class="empty">첫 직관을 기록하면 월별 흐름이 나타납니다.</div>'}</section></div>
    <section class="card pad"><div class="my-card-head"><h3>기억에 남는 스코어</h3><span>해당 경기를 함께 표시합니다</span></div><div class="my-highlight-grid">${highlight('최다 득점',s.highRs)}${highlight('최소 득점',s.lowRs)}${highlight('최다 실점',s.highRa)}${highlight('최소 실점',s.lowRa)}${highlight('최대 득실차',s.bestMargin,false)}${highlight('최소 득실차',s.worstMargin,false)}</div></section>
    <div class="my-breakdown-grid">${groupTable('홈 · 원정',M.group(rows,g=>g.home_away==='HOME'?'홈':'원정'))}${groupTable('상대 팀별 승부',M.group(rows,g=>g.opponent||'미상').sort((a,b)=>b.games-a.games))}</div>
    <section class="card pad my-diary"><div class="my-card-head"><div><h3>날짜별 직관 일지</h3><p>스코어는 삼성 : 상대 순서입니다.</p></div><span>${rows.length}경기</span></div>${history.length?`<ol class="my-diary-list">${history.slice(0,ui.limit).map(g=>`<li class="my-diary-row"><time datetime="${esc(g.game_date)}">${esc(g.game_date)}<small>${esc((g.game_time||'').slice(0,5))}</small></time><div class="my-diary-match"><b>${typeof teamLogo==='function'?teamLogo(g.opponent,'team-logo sm'):''}${g.home_away==='HOME'?'vs':'@'} ${esc(g.opponent)}</b><small><span class="my-phase">${esc(phase(g))}</span>${esc(g.stadium||'구장 미등록')}</small></div><div class="my-diary-result"><strong>${g.scored?g.rs+' : '+g.ra:'—'}</strong><span class="my-result ${g.finished?g.result||'unknown':'pending'}">${resultText(g)}</span></div><button type="button" class="my-date-link" data-my-date="${esc(g.game_date)}" aria-label="${esc(g.game_date)} 경기 캘린더 보기">캘린더 ↗</button></li>`).join('')}</ol>${history.length>ui.limit?`<button type="button" class="btn secondary my-more" data-my-more>직관 ${Math.min(20,history.length-ui.limit)}경기 더 보기</button>`:''}`:'<div class="empty">선택한 조건의 직관 기록이 없습니다.<br>캘린더에서 내 참석을 체크하면 이곳에 자동으로 모입니다.</div>'}</section>`;
  }
  function install(){
    window.renderMyRecords=render;
    document.addEventListener('change',event=>{
      const key={myRecordYear:'year',myRecordMonth:'month',myRecordSeason:'season'}[event.target.id];
      if(key){ui[key]=event.target.value;ui.limit=20;render();$('#'+event.target.id)?.focus();}
    });
    document.addEventListener('click',event=>{
      const date=event.target.closest('[data-my-date]');
      if(date){state.selectedDate=date.dataset.myDate;state.year=Number(state.selectedDate.slice(0,4));state.month=Number(state.selectedDate.slice(5,7));syncSelects();renderCalendar();renderWatchList();renderDateDetail();navigateToPage('schedule');window.scrollTo({top:0,behavior:'smooth'});}
      if(event.target.closest('[data-my-more]')){ui.limit+=20;render();}
      if(event.target.closest('[data-my-settings]'))navigateToPage('settings');
    });
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
