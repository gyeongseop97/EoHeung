(function(){
  function $(s,r){return (r||document).querySelector(s)}
  function $$(s,r){return Array.from((r||document).querySelectorAll(s))}
  function email(){try{return state.user&&state.user.email||''}catch(e){return ''}}
  function myMember(){
    try{
      var uid=String(state.user&&state.user.id||'');
      var mail=String(state.user&&state.user.email||'').trim().toLowerCase();
      return (state.members||[]).find(function(m){return String(m.auth_user_id||'')===uid})||(state.members||[]).find(function(m){return String(m.email||'').trim().toLowerCase()===mail})||null;
    }catch(e){return null}
  }
  function toastMsg(msg){try{if(typeof toast==='function')return toast(msg)}catch(e){}console.warn(msg)}
  function currentTheme(){try{return state.theme||localStorage.getItem('eoheung_theme')||'default'}catch(e){return localStorage.getItem('eoheung_theme')||'default'}}
  function moveMenuItems(){
    var nav=document.querySelector('.nav');
    if(!nav)return;
    var links=nav.querySelector('button[data-page="links"]');
    var about=nav.querySelector('button[data-page="about"]');
    var photo=nav.querySelector('#photoFrameNavBtn');
    var footer=document.getElementById('mobileDrawerFooter');
    if(!links)return;
    if(about)links.after(about);
    if(photo)(about||links).after(photo);
    if(footer)(photo||about||links).after(footer);
    if(links)links.style.order='50';
    if(about)about.style.order='51';
    if(photo)photo.style.order='52';
    if(footer)footer.style.order='99';
  }
  function style(){
    var s=document.getElementById('eoMobileMenuOrderStyle');
    var css='@media(max-width:900px){.nav button[data-page="links"]{order:50!important}.nav button[data-page="about"]{order:51!important}.nav #photoFrameNavBtn{order:52!important}#mobileDrawerFooter{order:99!important;display:grid;gap:10px}.mobile-account-box{display:grid!important;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.16);border-radius:14px;background:rgba(255,255,255,.08);color:#fff}.mobile-account-box h4{margin:0;font-size:14px;color:#fff}.mobile-account-email{font-size:12px;color:#dbeafe;word-break:break-all}.mobile-account-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mobile-account-field{display:grid;gap:4px}.mobile-account-field label{font-size:11px;font-weight:900;color:#bfdbfe}.mobile-account-field input{width:100%;height:34px;box-sizing:border-box;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.12);color:#fff;padding:0 9px}.mobile-account-field input::placeholder{color:rgba(255,255,255,.60)}.mobile-theme-list{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.mobile-theme-list button,.mobile-account-save,.mobile-account-logout{border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.10);color:#fff;padding:8px 7px;font-size:12px;font-weight:900}.mobile-theme-list button.active{background:#fff;color:#074ca1;border-color:#fff}.mobile-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mobile-account-logout{background:rgba(244,63,94,.14);border-color:rgba(254,205,211,.45);color:#ffe4e6}}@media(max-width:420px){.mobile-account-grid{grid-template-columns:1fr}.mobile-theme-list{grid-template-columns:1fr}}';
    if(!s){s=document.createElement('style');s.id='eoMobileMenuOrderStyle';document.head.appendChild(s)}
    if(s.textContent!==css)s.textContent=css;
  }
  function ensureFooter(){
    var nav=document.querySelector('.nav');
    if(!nav)return null;
    var footer=document.getElementById('mobileDrawerFooter');
    if(!footer){
      footer=document.createElement('div');
      footer.id='mobileDrawerFooter';
      footer.className='mobile-drawer-footer';
      nav.appendChild(footer);
    }
    return footer;
  }
  function ensureMobileAccount(){
    var footer=ensureFooter();
    if(!footer)return;
    if(!$('#mobileAccountBox',footer)){
      footer.innerHTML='<div class="mobile-account-box" id="mobileAccountBox"><h4>개인정보 / 테마</h4><div class="mobile-account-email" id="mobileAccountEmail">로그인 계정 확인 중</div><div class="mobile-account-grid"><div class="mobile-account-field"><label for="mobileAccountName">이름</label><input id="mobileAccountName" placeholder="이름"></div><div class="mobile-account-field"><label for="mobileAccountPhone">전화번호</label><input id="mobileAccountPhone" placeholder="전화번호"></div></div><div class="mobile-theme-list"><button type="button" data-mobile-theme="default">기본</button><button type="button" data-mobile-theme="groupware">그룹웨어</button><button type="button" data-mobile-theme="excel">엑셀</button></div><div class="mobile-account-actions"><button type="button" class="mobile-account-save" id="mobileAccountSave">저장</button><button type="button" class="mobile-account-logout" id="mobileAccountLogout">로그아웃</button></div></div>';
      $('#mobileAccountSave',footer).addEventListener('click',saveMobileProfile);
      $('#mobileAccountLogout',footer).addEventListener('click',async function(e){e.preventDefault();try{if(state&&state.client)await state.client.auth.signOut()}catch(x){location.reload()}});
      $$('[data-mobile-theme]',footer).forEach(function(btn){btn.addEventListener('click',function(){setMobileTheme(btn.dataset.mobileTheme)})});
    }
    fillMobileAccount();
  }
  function fillMobileAccount(){
    var footer=document.getElementById('mobileDrawerFooter');
    if(!footer)return;
    var mail=email();
    var m=myMember();
    var em=$('#mobileAccountEmail',footer);if(em)em.textContent=mail?'로그인 계정: '+mail:'로그인 계정 확인 중';
    var name=$('#mobileAccountName',footer),phone=$('#mobileAccountPhone',footer);
    if(m){
      if(name&&!name.matches(':focus'))name.value=m.name||'';
      if(phone&&!phone.matches(':focus'))phone.value=m.phone||'';
    }
    var theme=currentTheme();
    $$('[data-mobile-theme]',footer).forEach(function(btn){btn.classList.toggle('active',btn.dataset.mobileTheme===theme)});
  }
  async function saveMobileProfile(){
    var m=myMember();
    if(!m||typeof state==='undefined'||!state.client)return toastMsg('연동된 회원 정보를 찾지 못했습니다.');
    var name=($('#mobileAccountName')&&$('#mobileAccountName').value||'').trim();
    var phone=($('#mobileAccountPhone')&&$('#mobileAccountPhone').value||'').trim();
    if(!name)return toastMsg('이름을 입력해 주세요.');
    var btn=$('#mobileAccountSave');if(btn)btn.disabled=true;
    try{
      var r=await state.client.from('members').update({name:name,phone:phone}).eq('id',m.id).select().single();
      if(r.error)throw r.error;
      Object.assign(m,r.data);
      if(typeof renderMembers==='function')renderMembers();
      fillMobileAccount();
      toastMsg('개인정보를 저장했습니다.');
    }catch(e){toastMsg('개인정보 저장 오류: '+(e.message||e))}
    finally{if(btn)btn.disabled=false}
  }
  function setMobileTheme(v){
    if(typeof applyTheme==='function')applyTheme(v);
    else{
      localStorage.setItem('eoheung_theme',v);
      document.body.classList.toggle('theme-groupware',v==='groupware');
      document.body.classList.toggle('theme-excel',v==='excel');
      try{state.theme=v}catch(e){}
    }
    fillMobileAccount();
  }
  function boot(){
    style();
    ensureMobileAccount();
    moveMenuItems();
    [100,300,800,1500,3000,5000].forEach(function(ms){setTimeout(function(){style();ensureMobileAccount();moveMenuItems();fillMobileAccount()},ms)});
    setInterval(function(){ensureMobileAccount();moveMenuItems();fillMobileAccount()},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
