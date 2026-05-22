(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let logoDataUrl='';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

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

  function injectStyle(){
    if($('#eoheungMemberLogoPatchStyle'))return;
    const style=document.createElement('style');
    style.id='eoheungMemberLogoPatchStyle';
    style.textContent=`
      .logo.eoheung-logo-box{padding:0!important;overflow:hidden!important;background:#fff!important;display:grid!important;place-items:center!important}
      .eoheung-main-logo{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;border-radius:inherit!important}
      .member-position-badge{display:inline-flex;align-items:center;justify-content:center;min-width:44px;padding:4px 8px;border-radius:999px;background:#eef4ff;color:#074ca1;font-size:12px;font-weight:900;white-space:nowrap}
      .member-memo-cell{max-width:520px;white-space:pre-wrap;line-height:1.45;color:#334155}
      body.theme-excel .member-position-badge{border-radius:0;background:#e2f0d9;color:#185c37;border:1px solid #70ad47}
      body.theme-groupware .member-position-badge{border-radius:2px;background:#eaf3ff;color:#174ea6;border:1px solid #c7d8ea}
    `;
    document.head.appendChild(style);
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
    const payload={
      name:$('#memberName').value.trim(),
      department:$('#memberDepartment').value.trim(),
      phone:$('#memberPhone').value.trim(),
      favorite_player:'',
      status:original?.status||'active',
      memo:mergeMemberMemo($('#memberPosition').value,$('#memberMemo').value)
    };
    if(!payload.name){if(typeof toast==='function')toast('이름을 입력해 주세요.');return;}
    const res=id?await state.client.from('members').update(payload).eq('id',id):await state.client.from('members').insert(payload);
    if(res.error){if(typeof toast==='function')toast('회원 저장 오류: '+res.error.message);return;}
    if(typeof closeModal==='function')closeModal('memberModal');
    if(typeof loadAll==='function')await loadAll();
  }

  function installMemberOverrides(){
    ensureForm();
    patchHeader();
    try{window.renderMembers=patchedRenderMembers;renderMembers=patchedRenderMembers}catch(e){window.renderMembers=patchedRenderMembers}
    try{window.clearMemberForm=patchedClearMemberForm;clearMemberForm=patchedClearMemberForm}catch(e){window.clearMemberForm=patchedClearMemberForm}
    try{window.editMember=patchedEditMember;editMember=patchedEditMember}catch(e){window.editMember=patchedEditMember}
    try{window.saveMember=patchedSaveMember;saveMember=patchedSaveMember}catch(e){window.saveMember=patchedSaveMember}
    const save=$('#saveMemberBtn');if(save)save.onclick=patchedSaveMember;
    const add=$('#openMemberModalBtn');if(add)add.onclick=()=>{patchedClearMemberForm();if(typeof openModal==='function')openModal('memberModal')};
    patchedRenderMembers();
  }
  function run(){
    injectStyle();
    applyLogo();
    installMemberOverrides();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  setInterval(run,1200);
})();