(function(){
  const ROLE={ASSOC:'associate',REGULAR:'regular',ADMIN:'admin'};
  const ROLE_LABEL={associate:'준회원',regular:'정회원',admin:'관리자'};
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const lower=s=>String(s||'').trim().toLowerCase();
  let ensuring=false;

  function css(){
    if($('#memberPermStyle'))return;
    const s=document.createElement('style');s.id='memberPermStyle';
    s.textContent=`.perm-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900}.perm-pill.associate{background:#f3f4f6;color:#4b5563}.perm-pill.regular{background:#e8fff6;color:#047857}.perm-pill.admin{background:#eef4ff;color:#074ca1}.perm-note{margin:8px 0 0;color:#64748b;font-size:12px;line-height:1.5}.disabled-by-role{opacity:.45;pointer-events:none}.member-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}.link-card-admin{position:relative}.link-actions{position:absolute;right:12px;bottom:12px;display:flex;gap:6px}.link-card-admin a{display:block;padding-bottom:42px}.auth-extra-note{margin-top:8px}.member-self-row{background:#fbfdff}.permission-banner{border:1px solid #dbeafe;background:#eff6ff;color:#1e3a8a;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800;margin-bottom:12px}.permission-banner.warn{border-color:#fed7aa;background:#fff7ed;color:#9a3412}`;
    document.head.appendChild(s);
  }

  function memberRole(m){return m?.member_role||m?.role||m?.permission_role||(m?.is_admin?'admin':'associate')}
  function currentMember(){
    const u=window.state?.user;if(!u)return null;
    const uid=u.id, email=lower(u.email);
    return (window.state.members||[]).find(m=>m.auth_user_id===uid)||
           (window.state.members||[]).find(m=>lower(m.email)===email)||null;
  }
  function hasRoleSchema(){return (window.state?.members||[]).some(m=>'member_role'in m||'auth_user_id'in m||'email'in m)}
  function hasAnyAdmin(){return (window.state?.members||[]).some(m=>memberRole(m)===ROLE.ADMIN)}
  function isAdmin(){
    const m=currentMember();
    if(m&&memberRole(m)===ROLE.ADMIN)return true;
    if(!hasRoleSchema())return true; // 기존 데이터/마이그레이션 전에는 관리자 잠금 방지
    if(!hasAnyAdmin())return true;   // 최초 세팅 전에는 첫 로그인 사용자가 관리 가능
    return false;
  }
  function isRegular(){const m=currentMember();return isAdmin()||(m&&memberRole(m)===ROLE.REGULAR)}
  function canEditMember(m){return isAdmin()||(currentMember()?.id===m?.id)}
  function canCheckMember(memberId){return isAdmin()||(isRegular()&&currentMember()?.id===memberId)}
  window.eoAuthz={currentMember,isAdmin,isRegular,canEditMember,canCheckMember,memberRole};

  async function ensureMemberProfile(){
    if(ensuring||!window.state?.client||!window.state?.user)return;
    ensuring=true;
    try{
      const u=window.state.user;
      const email=lower(u.email);
      if(!email)return;
      let m=currentMember();
      if(m&&m.email&&m.auth_user_id)return;
      if(m&&m.email&&!m.auth_user_id){
        const {error}=await window.state.client.from('members').update({auth_user_id:u.id}).eq('id',m.id);
        if(!error){m.auth_user_id=u.id;return;}
      }
      if(!m){
        const name=(window.localStorage.getItem('eoheung_signup_name')||email.split('@')[0]||'신규회원').trim();
        let payload={name,email,auth_user_id:u.id,member_role:ROLE.ASSOC,status:'active',memo:'회원가입으로 자동 생성된 준회원'};
        let {data,error}=await window.state.client.from('members').insert(payload).select().single();
        if(error){
          // 권한 컬럼 적용 전 임시 fallback
          payload={name,status:'active',memo:`회원가입 계정: ${email}`};
          const r=await window.state.client.from('members').insert(payload).select().single();
          data=r.data;error=r.error;
        }
        if(!error&&data){window.state.members.push(data);window.toast?.('준회원으로 회원 명단에 추가되었습니다. 관리자 승인 후 직관 체크가 가능합니다.');}
      }
    }catch(e){console.warn('ensureMemberProfile failed',e)}finally{ensuring=false;}
  }

  function enhanceAuth(){
    const pass=$('#loginPassword');if(!pass||$('#signupName'))return;
    const input=document.createElement('input');input.id='signupName';input.className='input';input.placeholder='회원가입 이름';
    pass.insertAdjacentElement('afterend',input);
    const note=document.createElement('p');note.className='note auth-extra-note';note.textContent='회원가입 시 준회원으로 등록되며, 관리자가 정회원으로 변경하면 직관 체크 권한이 부여됩니다.';
    pass.closest('.auth-card')?.appendChild(note);
    const old=$('#signUpBtn')?.onclick;
    $('#signUpBtn').onclick=async()=>{
      window.localStorage.setItem('eoheung_signup_name',$('#signupName')?.value.trim()||'');
      if(old)return old();
    };
  }

  function roleSelectHtml(value){return `<select id="memberRole" class="input"><option value="associate" ${value==='associate'?'selected':''}>준회원</option><option value="regular" ${value==='regular'?'selected':''}>정회원</option><option value="admin" ${value==='admin'?'selected':''}>관리자</option></select>`}
  function enhanceMemberModal(){
    const grid=$('#memberModal .form-grid');if(!grid||$('#memberRoleWrap'))return;
    const wrap=document.createElement('div');wrap.id='memberRoleWrap';wrap.innerHTML='<label class="note">회원 권한</label>'+roleSelectHtml('associate');
    const pos=document.createElement('input');pos.id='memberPosition';pos.className='input';pos.placeholder='직책';
    const email=document.createElement('input');email.id='memberEmail';email.className='input';email.placeholder='계정 이메일';
    const uid=document.createElement('input');uid.id='memberAuthUserId';uid.className='input full';uid.placeholder='Auth User ID(선택, 이메일 자동연동 가능)';
    grid.insertBefore(pos,$('#memberName'));
    grid.appendChild(wrap);grid.appendChild(email);grid.appendChild(uid);
    const bar=$('#memberModal .toolbar');
    if(bar&&!$('#deleteMemberBtn')){const b=document.createElement('button');b.type='button';b.id='deleteMemberBtn';b.className='btn danger';b.textContent='회원삭제';b.onclick=deleteMember;bar.appendChild(b)}
  }

  function applyPermissionChrome(){
    css();enhanceAuth();enhanceMemberModal();
    const admin=isAdmin();
    ['openGameModalBtn','callSyncBtn','openLinkModalBtn','openMemberModalBtn'].forEach(id=>{const el=$('#'+id);if(el)el.style.display=admin?'inline-flex':'none'});
    $$('[data-edit-game]').forEach(b=>b.style.display=admin?'inline-flex':'none');
    $$('[data-cmd-toggle],[data-about-edit],[data-about-save],[data-cmd-save],[data-cmd-reset]').forEach(b=>{b.style.display=admin?'inline-flex':'none'});
    const top=$('.topbar');
    if(top&&!$('#permissionBadge')){
      const box=document.createElement('div');box.id='permissionBadge';box.style.cssText='display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap';top.appendChild(box);
    }
    const cm=currentMember();
    const role=admin?'admin':memberRole(cm);
    if($('#permissionBadge'))$('#permissionBadge').innerHTML=`<span class="perm-pill ${role}">${ROLE_LABEL[role]||role}</span><span class="note">${esc(window.state?.user?.email||'')}</span><button class="btn secondary" id="permSignOutBtn">로그아웃</button>`;
    const out=$('#permSignOutBtn');if(out)out.onclick=async()=>{await window.state.client.auth.signOut();window.state.user=null;window.showAuth?.()};
  }

  window.renderMembers=function(){
    const root=$('#memberRows');if(!root)return;
    applyPermissionChrome();
    const admin=isAdmin(), cm=currentMember();
    const list=admin?window.state.members:(window.state.members||[]);
    root.innerHTML=list.length?list.map(m=>{
      const role=memberRole(m);
      const linked=m.auth_user_id?'Auth 연결':m.email?'이메일 대기':'미연동';
      const self=cm?.id===m.id;
      const action=canEditMember(m)?`<button class="btn secondary" data-edit-member="${m.id}">수정</button>`:'';
      return `<tr class="${self?'member-self-row':''}"><td>${esc(m.position||'')}</td><td><b>${esc(m.name)}</b>${self?' <span class="note">나</span>':''}</td><td>${esc(m.phone||'')}</td><td><span class="perm-pill ${role}">${ROLE_LABEL[role]||role}</span></td><td>${esc(linked)}</td><td>${esc(m.memo||'')}</td><td><div class="member-actions">${action}</div></td></tr>`;
    }).join(''):'<tr><td colspan="7" class="empty">등록된 회원이 없습니다.</td></tr>';
    const table=root.closest('table');const head=table?.querySelector('thead tr');
    if(head&&!head.dataset.permHead){head.dataset.permHead='1';head.innerHTML='<th>직책</th><th>이름</th><th>연락처</th><th>권한</th><th>계정연동</th><th>메모</th><th></th>'}
  };

  window.editMember=function(id){
    enhanceMemberModal();
    const m=(window.state.members||[]).find(x=>x.id===id);if(!m)return;
    if(!canEditMember(m))return window.toast?.('본인 정보만 수정할 수 있습니다.');
    $('#memberModalTitle').textContent=isAdmin()?'회원 수정':'내 정보 수정';
    $('#memberId').value=m.id;$('#memberName').value=m.name||'';$('#memberDepartment').value=m.department||'';$('#memberPhone').value=m.phone||'';$('#memberFavorite').value=m.favorite_player||'';$('#memberStatus').value=m.status||'active';$('#memberMemo').value=m.memo||'';
    if($('#memberPosition'))$('#memberPosition').value=m.position||'';
    if($('#memberEmail'))$('#memberEmail').value=m.email||'';
    if($('#memberAuthUserId'))$('#memberAuthUserId').value=m.auth_user_id||'';
    if($('#memberRole'))$('#memberRole').value=memberRole(m);
    const admin=isAdmin();
    ['memberRoleWrap','memberAuthUserId'].forEach(id=>{const el=$('#'+id);if(el)el.style.display=admin?'block':'none'});
    ['memberEmail','memberStatus'].forEach(id=>{const el=$('#'+id);if(el)el.disabled=!admin});
    const del=$('#deleteMemberBtn');if(del)del.style.display=admin?'inline-flex':'none';
    window.openModal?.('memberModal');
  };

  window.clearMemberForm=function(){
    enhanceMemberModal();['memberId','memberName','memberDepartment','memberPhone','memberFavorite','memberMemo','memberPosition','memberEmail','memberAuthUserId'].forEach(id=>{const el=$('#'+id);if(el)el.value=''});$('#memberStatus').value='active';if($('#memberRole'))$('#memberRole').value=ROLE.ASSOC;$('#memberModalTitle').textContent='회원 추가';['memberRoleWrap','memberAuthUserId'].forEach(id=>{const el=$('#'+id);if(el)el.style.display='block'});const del=$('#deleteMemberBtn');if(del)del.style.display='none';
  };

  window.saveMember=async function(){
    const id=$('#memberId').value;const existing=(window.state.members||[]).find(m=>m.id===id);const admin=isAdmin();
    if(id&&existing&&!canEditMember(existing))return window.toast?.('본인 정보만 수정할 수 있습니다.');
    if(!admin&&!id)return window.toast?.('회원 추가는 관리자만 가능합니다.');
    const payload={name:$('#memberName').value.trim(),department:$('#memberDepartment').value.trim(),phone:$('#memberPhone').value.trim(),favorite_player:$('#memberFavorite').value.trim(),memo:$('#memberMemo').value.trim()};
    if($('#memberPosition'))payload.position=$('#memberPosition').value.trim();
    if(admin){payload.status=$('#memberStatus').value;payload.member_role=$('#memberRole')?.value||ROLE.ASSOC;payload.email=lower($('#memberEmail')?.value);payload.auth_user_id=$('#memberAuthUserId')?.value.trim()||null;}
    if(!payload.name)return window.toast?.('이름을 입력해 주세요.');
    let res=id?await window.state.client.from('members').update(payload).eq('id',id):await window.state.client.from('members').insert(payload);
    if(res.error)return window.toast?.('회원 저장 오류: '+res.error.message+' / 권한 컬럼 SQL 적용 여부를 확인해 주세요.');
    window.closeModal?.('memberModal');await window.loadAll?.();
  };

  async function deleteMember(){
    if(!isAdmin())return window.toast?.('회원삭제는 관리자만 가능합니다.');
    const id=$('#memberId')?.value;if(!id)return;
    if(!confirm('이 회원과 관련 직관 기록을 삭제할까요?'))return;
    await window.state.client.from('game_members').delete().eq('member_id',id);
    const {error}=await window.state.client.from('members').delete().eq('id',id);
    if(error)return window.toast?.('회원삭제 오류: '+error.message);
    window.closeModal?.('memberModal');await window.loadAll?.();
  }

  window.renderDateDetail=function(){
    const root=$('#dateDetail');if(!root)return;applyPermissionChrome();
    const games=window.gamesOnDate?window.gamesOnDate(window.state.selectedDate):[];
    if(!games.length){root.innerHTML=`<div class="empty"><b>${window.state.selectedDate}</b><br>등록된 경기가 없습니다.</div>`;return}
    const admin=isAdmin(), regular=isRegular(), cm=currentMember();
    if(!regular){root.innerHTML=`<div class="permission-banner warn">준회원은 경기 일정 열람만 가능합니다. 관리자가 정회원으로 변경하면 직관 예정 체크가 가능합니다.</div>`+games.map(g=>`<div class="card pad" style="margin-bottom:12px"><h3 style="margin:0">${window.gameLabelHtml?window.gameLabelHtml(g,'team-logo'):esc(g.opponent)} ${window.resultBadge?window.resultBadge(g):''}</h3><p class="note">${esc(window.state.selectedDate)} · ${esc(g.stadium||'-')}</p></div>`).join('');return}
    const members=(window.state.members||[]).filter(m=>memberRole(m)===ROLE.REGULAR||memberRole(m)===ROLE.ADMIN);
    root.innerHTML=games.map(g=>{const entries=window.gameEntries?window.gameEntries(g.id):[];const rows=members.map(m=>{const e=entries.find(x=>x.member_id===m.id);const allowed=admin||cm?.id===m.id;return`<div class="check-row ${allowed?'':'disabled-by-role'}"><label>${esc(m.name)}${cm?.id===m.id?' <span class="note">나</span>':''}</label><input type="checkbox" data-game="${g.id}" data-member="${m.id}" ${e?.attended?'checked':''} ${allowed?'':'disabled'}></div>`}).join('');return`<div class="card pad" style="margin-bottom:12px"><div class="toolbar" style="justify-content:space-between"><div><h3 style="margin:0">${window.gameLabelHtml?window.gameLabelHtml(g,'team-logo'):esc(g.opponent)} ${window.resultBadge?window.resultBadge(g):''}</h3><p class="note" style="margin:6px 0 0">${esc(window.state.selectedDate)} · ${window.homeAwayText?window.homeAwayText(g.home_away):''} · ${esc(g.stadium||'-')}</p></div>${admin?`<button class="btn secondary" data-edit-game="${g.id}">경기 수정</button>`:''}</div><h4>직관 회원</h4><div class="member-checks">${rows}</div></div>`}).join('');
  };

  window.saveAttendance=async function(gameId,memberId,checked){
    if(!canCheckMember(memberId))return window.toast?.('본인 이름만 직관 예정으로 체크할 수 있습니다.');
    const old=(window.state.gameMembers||[]).find(x=>x.game_id===gameId&&x.member_id===memberId);
    if(!checked&&old){const {error}=await window.state.client.from('game_members').delete().eq('id',old.id);if(error)return window.toast?.('삭제 오류: '+error.message);window.state.gameMembers=window.state.gameMembers.filter(x=>x.id!==old.id)}
    else if(checked){const payload={game_id:gameId,member_id:memberId,planned:true,attended:true};const {data,error}=await window.state.client.from('game_members').upsert(payload,{onConflict:'game_id,member_id'}).select().single();if(error)return window.toast?.('저장 오류: '+error.message);if(old)window.state.gameMembers=window.state.gameMembers.map(x=>x.id===old.id?data:x);else window.state.gameMembers.push(data)}
    window.renderDashboard?.();window.renderCalendar?.();window.renderWatchList?.();window.renderDateDetail?.();window.renderRecords?.();window.renderWeatherForUpcoming?.();
  };

  window.renderLinks=function(){
    const links=(window.state.links&&window.state.links.length)?window.state.links:(window.DEFAULT_LINKS||[]);const admin=isAdmin();const root=$('#linkList');if(!root)return;
    root.innerHTML=links.map(l=>`<div class="card pad link-card-admin"><a href="${esc(l.url)}" target="_blank"><h3 style="margin-top:0">${esc(l.title)}</h3><p class="note">${esc(l.description||l.url)}</p></a>${admin&&l.id?`<div class="link-actions"><button class="btn danger" data-delete-link="${l.id}">삭제</button></div>`:''}</div>`).join('');
  };

  async function deleteLink(id){if(!isAdmin())return window.toast?.('바로가기 수정은 관리자만 가능합니다.');if(!confirm('이 링크를 삭제할까요?'))return;const {error}=await window.state.client.from('quick_links').delete().eq('id',id);if(error)return window.toast?.('링크 삭제 오류: '+error.message);await window.loadAll?.()}
  const oldSaveLink=window.saveLink;
  window.saveLink=async function(){if(!isAdmin())return window.toast?.('바로가기 링크 수정은 관리자만 가능합니다.');return oldSaveLink?oldSaveLink():null};

  function bindGuards(){
    if(window.__memberPermBound)return;window.__memberPermBound=true;
    document.body.addEventListener('click',e=>{
      const dl=e.target.closest('[data-delete-link]');if(dl){e.preventDefault();e.stopPropagation();deleteLink(dl.dataset.deleteLink);return}
      if(e.target.closest('[data-edit-game]')&&!isAdmin()){e.preventDefault();e.stopPropagation();window.toast?.('경기 수정은 관리자만 가능합니다.');}
      if(e.target.closest('#openLinkModalBtn,#openGameModalBtn,#callSyncBtn,#openMemberModalBtn')&&!isAdmin()){e.preventDefault();e.stopPropagation();window.toast?.('관리자만 사용할 수 있습니다.');}
      if(e.target.closest('[data-cmd-toggle],[data-cmd-save],[data-cmd-reset]')&&!isAdmin()){e.preventDefault();e.stopPropagation();window.toast?.('모임 소개/규칙 수정은 관리자만 가능합니다.');}
    },true);
    document.body.addEventListener('change',e=>{if(e.target.matches('input[type="checkbox"][data-game]')&&!canCheckMember(e.target.dataset.member)){e.preventDefault();e.stopPropagation();e.target.checked=!e.target.checked;window.toast?.('본인 이름만 직관 예정으로 체크할 수 있습니다.')}},true);
  }

  function refresh(){css();enhanceAuth();enhanceMemberModal();applyPermissionChrome();}
  const oldLoadAll=window.loadAll;
  if(oldLoadAll){window.loadAll=async function(){await oldLoadAll();await ensureMemberProfile();window.renderAll?.();refresh();}}
  function boot(){bindGuards();refresh();ensureMemberProfile().then(()=>{try{window.renderAll?.()}catch(e){}})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setInterval(()=>{if(window.state?.user){ensureMemberProfile();refresh()}},1800);
})();
