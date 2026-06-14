(function(){
  const URL='https://chaddxsntnokjjcrwiyb.supabase.co';
  const KEY='sb_publishable_NiKj0BxbW3VauGK_kkflbg_OqMXPpCT';
  const $=(s,r=document)=>r.querySelector(s);
  let client=null;
  function c(){if(window.state?.client)return window.state.client;if(!client&&window.supabase)client=window.supabase.createClient(URL,KEY);return client}
  function toast(m){const el=$('#toast');if(el){const d=document.createElement('div');d.textContent=m;el.appendChild(d);setTimeout(()=>d.remove(),3200)}else alert(m)}
  function injectStyle(){if($('#eoAuthEnhanceStyle'))return;const s=document.createElement('style');s.id='eoAuthEnhanceStyle';s.textContent=`
    .eo-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 14px}.eo-auth-tab{border:1px solid #d8e8ff;background:#eef4ff;color:#074ca1;border-radius:14px;padding:11px 12px;font-weight:900}.eo-auth-tab.active{background:#074ca1;color:#fff;border-color:#074ca1}.eo-auth-pane{display:none}.eo-auth-pane.active{display:block}.eo-auth-form{display:grid;gap:10px}.eo-auth-form.two{grid-template-columns:1fr 1fr}.eo-auth-form .full{grid-column:1/-1}.eo-privacy-box{border:1px solid #dce5f2;background:#f8fbff;border-radius:14px;padding:12px;font-size:12px;color:#475569;line-height:1.55}.eo-privacy-box b{color:#172033}.eo-auth-row{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.eo-link-btn{border:0;background:transparent;color:#074ca1;font-weight:900;text-decoration:underline;padding:6px 0}.eo-auth-help{font-size:12px;color:#68758a;line-height:1.45;margin:8px 0 0}@media(max-width:560px){.eo-auth-form.two{grid-template-columns:1fr}}
  `;document.head.appendChild(s)}
  function build(){
    const card=$('#authView .auth-card');if(!card||card.dataset.eoAuthEnhanced==='1')return;card.dataset.eoAuthEnhanced='1';injectStyle();
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
    `;
    bind();
  }
  function tab(name){document.querySelectorAll('.eo-auth-tab').forEach(b=>b.classList.toggle('active',b.dataset.authTab===name));$('#eoLoginPane')?.classList.toggle('active',name==='login');$('#eoSignupPane')?.classList.toggle('active',name==='signup')}
  function bind(){
    document.querySelectorAll('[data-auth-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.authTab));
    $('#signInBtn').onclick=async()=>{const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;if(!email||!password)return toast('이메일과 비밀번호를 입력해 주세요.');const {error}=await c().auth.signInWithPassword({email,password});if(error)toast(error.message)};
    $('#signUpBtn').onclick=async()=>{const email=$('#signupEmail').value.trim(),password=$('#signupPassword').value,confirm=$('#signupPasswordConfirm').value,name=$('#signupName').value.trim(),department=$('#signupDepartment').value.trim(),phone=$('#signupPhone').value.trim(),agree=$('#signupPrivacyAgree').checked;if(!email||!password||!confirm||!name||!department||!phone)return toast('이메일, 비밀번호, 비밀번호 확인, 이름, 부서, 전화번호를 모두 입력해 주세요.');if(password!==confirm)return toast('비밀번호와 비밀번호 확인이 일치하지 않습니다.');if(password.length<6)return toast('비밀번호는 최소 6자 이상 입력해 주세요.');if(!agree)return toast('개인정보 제3자 제공에 동의해야 회원가입이 가능합니다.');localStorage.setItem('eoheung_signup_profile',JSON.stringify({pending:true,email,name,department,phone,privacy_agreed:true,privacy_agreed_at:new Date().toISOString()}));const {error}=await c().auth.signUp({email,password,options:{data:{name,department,phone,privacy_agreed:true}}});if(error)return toast(error.message);toast('회원가입 요청이 완료되었습니다. 이메일 확인 또는 관리자 승인을 확인해 주세요.');tab('login');$('#loginEmail').value=email};
    $('#forgotPasswordBtn').onclick=async()=>{const email=($('#loginEmail')?.value||prompt('비밀번호를 재설정할 이메일을 입력해 주세요.')||'').trim();if(!email)return toast('이메일을 입력해 주세요.');const redirectTo=location.origin+location.pathname;const {error}=await c().auth.resetPasswordForEmail(email,{redirectTo});if(error)return toast(error.message);toast('비밀번호 재설정 메일을 발송했습니다. 메일함을 확인해 주세요.')};
  }
  function boot(){build();setTimeout(build,500);setTimeout(build,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();