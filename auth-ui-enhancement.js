(function(){
  const URL='https://chaddxsntnokjjcrwiyb.supabase.co';
  const KEY='sb_publishable_NiKj0BxbW3VauGK_kkflbg_OqMXPpCT';
  const RESET_FLAG='eoheung_password_reset_pending';
  const $=(s,r=document)=>r.querySelector(s);
  let client=null, guardTimer=null;
  function c(){if(window.state?.client)return window.state.client;if(!client&&window.supabase)client=window.supabase.createClient(URL,KEY);return client}
  function toast(m){const el=$('#toast');if(el){const d=document.createElement('div');d.textContent=m;el.appendChild(d);setTimeout(()=>d.remove(),3200)}else alert(m)}
  function setPending(v){try{if(v){localStorage.setItem(RESET_FLAG,'1');sessionStorage.setItem(RESET_FLAG,'1')}else{localStorage.removeItem(RESET_FLAG);sessionStorage.removeItem(RESET_FLAG)}}catch(e){}}
  function hasPending(){try{return localStorage.getItem(RESET_FLAG)==='1'||sessionStorage.getItem(RESET_FLAG)==='1'}catch(e){return false}}
  function recoveryParams(){const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.replace(/^#/,''));return{isRecovery:q.get('type')==='recovery'||h.get('type')==='recovery'||q.has('reset-password')||h.has('access_token')||q.has('code'),error:q.get('error_description')||h.get('error_description')||q.get('error')||h.get('error')}}
  function resetRedirectUrl(){return `${location.origin}${location.pathname}?reset-password=1`}
  function cleanUrl(){if(history.replaceState)history.replaceState(null,document.title,location.pathname)}
  function injectStyle(){if($('#eoAuthEnhanceStyle'))return;const s=document.createElement('style');s.id='eoAuthEnhanceStyle';s.textContent=`
    .eo-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 14px}.eo-auth-tab{border:1px solid #d8e8ff;background:#eef4ff;color:#074ca1;border-radius:14px;padding:11px 12px;font-weight:900}.eo-auth-tab.active{background:#074ca1;color:#fff;border-color:#074ca1}.eo-auth-pane{display:none}.eo-auth-pane.active{display:block}.eo-auth-form{display:grid;gap:10px}.eo-auth-form.two{grid-template-columns:1fr 1fr}.eo-auth-form .full{grid-column:1/-1}.eo-privacy-box{border:1px solid #dce5f2;background:#f8fbff;border-radius:14px;padding:12px;font-size:12px;color:#475569;line-height:1.55}.eo-privacy-box b{color:#172033}.eo-auth-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.eo-link-btn{border:0;background:transparent;color:#074ca1;font-weight:900;text-decoration:underline;padding:6px 0}.eo-auth-help{font-size:12px;color:#68758a;line-height:1.45;margin:8px 0 0}.eo-auth-panel-title{font-size:18px;font-weight:950;margin:4px 0 8px}.eo-auth-back{margin-top:10px}@media(max-width:560px){.eo-auth-form.two{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}
  function showAuth(){const auth=$('#authView'),app=$('#appView');if(auth)auth.classList.remove('hide');if(app)app.classList.add('hide')}
  function build(){
    const card=$('#authView .auth-card');if(!card||card.dataset.eoAuthEnhanced==='2')return;card.dataset.eoAuthEnhanced='2';injectStyle();
    card.innerHTML=`
      <div class="brand" style="color:var(--text);margin-bottom:14px"><div class="logo" style="background:var(--blue);color:#fff">SL</div><div><h1>Samsung Lions Watch Party Manager</h1><p>삼성 직관 모임 계정 로그인</p></div></div>
      <div class="eo-auth-tabs"><button type="button" class="eo-auth-tab active" data-auth-tab="login">로그인</button><button type="button" class="eo-auth-tab" data-auth-tab="signup">회원가입</button></div>
      <div id="eoLoginPane" class="eo-auth-pane active">
        <div class="eo-auth-form"><input id="loginEmail" class="input" placeholder="이메일" type="email" autocomplete="email"><input id="loginPassword" class="input" placeholder="비밀번호" type="password" autocomplete="current-password"></div>
        <div class="eo-auth-row" style="margin-top:14px"><button class="btn green" id="signInBtn">로그인</button><button type="button" class="eo-link-btn" id="forgotPasswordBtn">비밀번호 찾기</button></div>
        <p class="eo-auth-help">가입한 이메일과 비밀번호로 로그인해 주세요.</p>
      </div>
      <div id="eoSignupPane" class="eo-auth-pane">
        <div class="eo-auth-form two">
          <input id="signupEmail" class="input" placeholder="이메일" type="email" autocomplete="email">
          <input id="signupName" class="input" placeholder="이름" autocomplete="name">
          <input id="signupPassword" class="input" placeholder="비밀번호" type="password" autocomplete="new-password">
          <input id="signupPasswordConfirm" class="input" placeholder="비밀번호 확인" type="password" autocomplete="new-password">
          <input id="signupDepartment" class="input" placeholder="부서">
          <input id="signupPhone" class="input" placeholder="전화번호" autocomplete="tel">
          <label class="eo-privacy-box full"><input type="checkbox" id="signupPrivacyAgree"> <b>개인정보 제3자 제공에 동의합니다.</b><br>가입 및 모임 운영을 위해 이름, 부서, 전화번호, 이메일 정보를 모임 관리자 및 정회원 이상에게 제공할 수 있습니다. 동의하지 않을 경우 회원가입이 제한됩니다.</label>
        </div>
        <div class="toolbar" style="margin-top:14px"><button class="btn" id="signUpBtn">회원가입</button></div>
        <p class="eo-auth-help">회원가입 후 기본 권한은 준회원입니다. 관리자가 정회원으로 변경하면 직관 체크와 채팅 작성이 가능합니다.</p>
      </div>
      <div id="eoForgotPane" class="eo-auth-pane">
        <div class="eo-auth-panel-title">비밀번호 재설정 메일 발송</div>
        <p class="eo-auth-help">가입한 이메일을 입력하면 새 비밀번호 설정 링크를 메일로 발송합니다.</p>
        <div class="eo-auth-form"><input id="resetEmail" class="input" placeholder="가입 이메일" type="email" autocomplete="email"></div>
        <div class="toolbar" style="margin-top:14px"><button class="btn green" id="sendResetMailBtn" type="button">재설정 메일 발송</button><button class="btn secondary" id="backToLoginBtn" type="button">로그인으로 돌아가기</button></div>
      </div>
      <div id="eoPasswordUpdatePane" class="eo-auth-pane">
        <div class="eo-auth-panel-title">새 비밀번호 설정</div>
        <p class="eo-auth-help" id="passwordUpdateHint">메일 인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.</p>
        <div class="eo-auth-form"><input id="newPassword" class="input" placeholder="새 비밀번호" type="password" autocomplete="new-password"><input id="newPasswordConfirm" class="input" placeholder="새 비밀번호 확인" type="password" autocomplete="new-password"></div>
        <div class="toolbar" style="margin-top:14px"><button class="btn green" id="updatePasswordBtn" type="button">비밀번호 변경</button><button class="btn secondary" id="cancelPasswordUpdateBtn" type="button">로그인으로 돌아가기</button></div>
      </div>
    `;
    bind();
  }
  function tab(name){document.querySelectorAll('.eo-auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===name));$('#eoLoginPane')?.classList.toggle('active',name==='login');$('#eoSignupPane')?.classList.toggle('active',name==='signup');$('#eoForgotPane')?.classList.toggle('active',name==='forgot');$('#eoPasswordUpdatePane')?.classList.toggle('active',name==='update')}
  function bind(){
    document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.authTab));
    $('#signInBtn').onclick=async()=>{const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;if(!email||!password)return toast('이메일과 비밀번호를 입력해 주세요.');const {error}=await c().auth.signInWithPassword({email,password});if(error)toast(error.message)};
    $('#signUpBtn').onclick=async()=>{const email=$('#signupEmail').value.trim(),password=$('#signupPassword').value,confirm=$('#signupPasswordConfirm').value,name=$('#signupName').value.trim(),department=$('#signupDepartment').value.trim(),phone=$('#signupPhone').value.trim(),agree=$('#signupPrivacyAgree').checked;if(!email||!password||!confirm||!name||!department||!phone)return toast('이메일, 비밀번호, 비밀번호 확인, 이름, 부서, 전화번호를 모두 입력해 주세요.');if(password!==confirm)return toast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');if(password.length<6)return toast('비밀번호는 최소 6자 이상 입력해 주세요.');if(!agree)return toast('개인정보 제3자 제공에 동의해야 회원가입이 가능합니다.');localStorage.setItem('eoheung_signup_profile',JSON.stringify({pending:true,email,name,department,phone,privacy_agreed:true,privacy_agreed_at:new Date().toISOString()}));const {error}=await c().auth.signUp({email,password,options:{data:{name,department,phone,privacy_agreed:true}}});if(error)return toast(error.message);toast('회원가입 요청이 완료되었습니다. 이메일 확인 또는 관리자 승인을 확인해 주세요.');tab('login');$('#loginEmail').value=email};
    $('#forgotPasswordBtn').onclick=()=>{const email=$('#loginEmail')?.value||'';tab('forgot');const r=$('#resetEmail');if(r){r.value=email;setTimeout(()=>r.focus(),0)}};
    $('#backToLoginBtn').onclick=()=>tab('login');
    $('#sendResetMailBtn').onclick=sendResetMail;
    $('#updatePasswordBtn').onclick=updatePassword;
    $('#cancelPasswordUpdateBtn').onclick=async()=>{try{await c().auth.signOut()}catch(e){}setPending(false);cleanUrl();showAuth();tab('login')};
  }
  async function sendResetMail(){const email=($('#resetEmail')?.value||'').trim();if(!email)return toast('이메일을 입력해 주세요.');const btn=$('#sendResetMailBtn');if(btn)btn.disabled=true;try{setPending(true);const {error}=await c().auth.resetPasswordForEmail(email,{redirectTo:resetRedirectUrl()});if(error)throw error;toast('비밀번호 재설정 메일을 발송했습니다. 메일의 Reset password 버튼을 눌러 주세요.')}catch(e){setPending(false);toast('메일 발송 오류: '+(e?.message||e))}finally{if(btn)btn.disabled=false}}
  async function updatePassword(){const pw=$('#newPassword')?.value||'',pw2=$('#newPasswordConfirm')?.value||'';if(pw.length<6)return toast('비밀번호는 6자 이상으로 입력해 주세요.');if(pw!==pw2)return toast('비밀번호 확인이 일치하지 않습니다.');const btn=$('#updatePasswordBtn');if(btn)btn.disabled=true;try{let session=(await c().auth.getSession()).data.session;if(!session){await new Promise(r=>setTimeout(r,800));session=(await c().auth.getSession()).data.session}if(!session)throw new Error('인증 세션을 확인할 수 없습니다. 메일의 Reset password 버튼을 다시 눌러 주세요.');const {error}=await c().auth.updateUser({password:pw});if(error)throw error;toast('비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.');setPending(false);await c().auth.signOut();cleanUrl();showAuth();tab('login')}catch(e){toast('비밀번호 변경 오류: '+(e?.message||e))}finally{if(btn)btn.disabled=false}}
  async function shouldShowUpdatePane(){const p=recoveryParams();if(p.error)return {show:true,error:p.error};if(p.isRecovery)return {show:true};if(hasPending()){const session=(await c().auth.getSession()).data.session;if(session?.user)return {show:true}}return {show:false}}
  async function handleRecovery(){build();const r=await shouldShowUpdatePane();if(!r.show)return;if(r.error){showAuth();tab('forgot');toast('재설정 링크 오류: '+decodeURIComponent(r.error));return}showAuth();tab('update');const hint=$('#passwordUpdateHint');if(hint)hint.textContent='메일 인증이 완료되었습니다. 새 비밀번호를 입력해 주세요.';startGuard()}
  function startGuard(){if(guardTimer)return;guardTimer=setInterval(async()=>{const r=await shouldShowUpdatePane();if(r.show){showAuth();tab('update')}},250)}
  function boot(){build();handleRecovery();setTimeout(()=>{build();handleRecovery()},500);setTimeout(()=>{build();handleRecovery()},1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();