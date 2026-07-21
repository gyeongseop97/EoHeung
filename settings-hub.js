(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const ROLE_LABEL={associate:'준회원',regular:'정회원',admin:'관리자'};
  const RESET_PATH='/reset-password';
  let activeSection='account';
  let lastMemberId='';

  function toast(message){
    try{if(typeof window.toast==='function')return window.toast(message)}catch(e){}
    const root=$('#toast');
    if(!root)return console.warn(message);
    const item=document.createElement('div');
    item.textContent=message;
    root.appendChild(item);
    setTimeout(()=>item.remove(),3200);
  }

  function appState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(e){return window.state||null}}
  function currentUser(){return appState()?.user||null}
  function currentMember(){
    const user=currentUser();
    if(!user)return null;
    const uid=String(user.id||'');
    const email=String(user.email||'').trim().toLowerCase();
    return (appState()?.members||[]).find(member=>String(member.auth_user_id||'')===uid)
      ||(appState()?.members||[]).find(member=>String(member.email||'').trim().toLowerCase()===email)
      ||null;
  }

  function style(){
    if($('#eoSettingsHubStyle'))return;
    const sheet=document.createElement('style');
    sheet.id='eoSettingsHubStyle';
    sheet.textContent=`
      #settings.eo-settings-ready{max-width:1180px;margin:0 auto}
      .eo-settings-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}
      .eo-settings-nav{position:sticky;top:18px;padding:10px;display:grid;gap:6px}
      .eo-settings-nav-title{padding:8px 10px 11px;font-size:12px;font-weight:900;color:var(--muted)}
      .eo-settings-nav button{width:100%;display:flex;align-items:center;gap:10px;border:0;background:transparent;color:var(--text);padding:11px 12px;border-radius:12px;text-align:left;font-weight:850}
      .eo-settings-nav button:hover{background:#f3f7fd}
      .eo-settings-nav button.active{background:#eaf3ff;color:var(--blue)}
      .eo-settings-nav-icon{width:28px;height:28px;border-radius:9px;background:#eef4ff;display:grid;place-items:center;flex:0 0 auto}
      .eo-settings-content{min-width:0;display:grid;gap:14px}
      .eo-settings-panel{display:none;gap:14px}
      .eo-settings-panel.active{display:grid}
      .eo-settings-card{padding:22px}
      .eo-settings-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:18px}
      .eo-settings-card-head h3{margin:0 0 5px;font-size:19px}
      .eo-settings-card-head p{margin:0;color:var(--muted);font-size:13px;line-height:1.5}
      .eo-settings-badge{display:inline-flex;align-items:center;border-radius:999px;background:#eef4ff;color:var(--blue);padding:6px 10px;font-size:11px;font-weight:900;white-space:nowrap}
      .eo-settings-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .eo-settings-field{display:grid;gap:6px;min-width:0}
      .eo-settings-field.full{grid-column:1/-1}
      .eo-settings-field label{font-size:12px;font-weight:900;color:#475569}
      .eo-settings-readonly{background:#f8fafc!important;color:#64748b!important}
      .eo-settings-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:15px}
      .eo-settings-help{margin:8px 0 0;color:var(--muted);font-size:12px;line-height:1.55}
      .eo-settings-divider{height:1px;background:var(--line);margin:20px 0}
      .eo-theme-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .eo-theme-option{border:2px solid var(--line);background:#fff;color:var(--text);border-radius:14px;padding:14px;text-align:left;box-shadow:none;transition:.16s}
      .eo-theme-option:hover{transform:translateY(-1px);border-color:#b7d2f5}
      .eo-theme-option.active{border-color:var(--blue);box-shadow:0 0 0 3px rgba(7,76,161,.10)}
      .eo-theme-swatch{height:78px;border:1px solid #dce5f2;border-radius:10px;margin-bottom:12px;overflow:hidden;background:#f4f7fc;display:grid;grid-template-columns:28% 1fr}
      .eo-theme-swatch i{display:block;background:linear-gradient(180deg,#062f67,#041e42)}
      .eo-theme-swatch span{display:block;margin:12px;background:#fff;border:1px solid #dce5f2;border-radius:8px}
      .eo-theme-option[data-settings-theme="groupware"] .eo-theme-swatch{border-radius:3px;background:#eef3f7}.eo-theme-option[data-settings-theme="groupware"] .eo-theme-swatch i{background:#263b55}.eo-theme-option[data-settings-theme="groupware"] .eo-theme-swatch span{border-radius:2px;border-color:#c7d8ea}
      .eo-theme-option[data-settings-theme="excel"] .eo-theme-swatch{border-radius:2px;background:#f3f3f3}.eo-theme-option[data-settings-theme="excel"] .eo-theme-swatch i{background:#217346}.eo-theme-option[data-settings-theme="excel"] .eo-theme-swatch span{border-radius:0;border-color:#70ad47;background:repeating-linear-gradient(0deg,#fff 0,#fff 14px,#e2f0d9 15px)}
      .eo-theme-option strong{display:block;font-size:14px;margin-bottom:4px}.eo-theme-option small{display:block;color:var(--muted);line-height:1.45}
      .eo-notification-list{display:grid;border-top:1px solid var(--line)}
      .eo-notification-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:17px 0;border-bottom:1px solid var(--line)}
      .eo-notification-row h4{margin:0 0 5px;font-size:15px}.eo-notification-row p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      .eo-switch{position:relative;display:inline-flex;width:48px;height:28px;flex:0 0 auto}
      .eo-switch input{position:absolute;opacity:0;pointer-events:none}
      .eo-switch span{width:100%;height:100%;border-radius:999px;background:#cbd5e1;transition:.18s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06)}
      .eo-switch span::after{content:'';position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(15,23,42,.25);transition:.18s}
      .eo-switch input:checked+span{background:var(--blue)}.eo-switch input:checked+span::after{transform:translateX(20px)}
      .eo-switch input:disabled+span{opacity:.55;cursor:not-allowed}
      .eo-notification-status{display:flex;align-items:center;gap:7px;margin-top:9px;font-size:12px;color:var(--muted)}
      .eo-status-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8}.eo-status-dot.on{background:#16a34a}.eo-status-dot.blocked{background:#dc2626}
      .eo-settings-data-actions{display:flex;gap:8px;flex-wrap:wrap}
      #settingsHistorySlot #eoHistoryPanel{margin-top:0!important}
      #settings #themeSelect,#settings #themePreview{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important}
      body.theme-excel .eo-settings-nav button,body.theme-excel .eo-theme-option{border-radius:0!important}
      body.theme-groupware .eo-settings-nav button,body.theme-groupware .eo-theme-option{border-radius:2px!important}
      @media(max-width:900px){
        #settings.eo-settings-ready{max-width:none}
        .eo-settings-layout{grid-template-columns:1fr}
        .eo-settings-nav{position:static;display:flex;overflow-x:auto;gap:7px;padding:8px}
        .eo-settings-nav-title{display:none}.eo-settings-nav button{width:auto;min-width:max-content;padding:9px 11px}.eo-settings-nav-icon{width:24px;height:24px}
        .eo-theme-options{grid-template-columns:1fr}.eo-settings-form{grid-template-columns:1fr}.eo-settings-field.full{grid-column:auto}
      }
      @media(max-width:560px){.eo-settings-card{padding:17px}.eo-settings-card-head{display:block}.eo-settings-badge{margin-top:10px}.eo-notification-row{gap:12px}}
    `;
    document.head.appendChild(sheet);
  }

  function markup(){
    return `
      <div class="eo-settings-layout">
        <nav class="card eo-settings-nav" aria-label="설정 항목">
          <div class="eo-settings-nav-title">설정 메뉴</div>
          <button type="button" data-settings-target="account"><span class="eo-settings-nav-icon">👤</span><span>내 계정</span></button>
          <button type="button" data-settings-target="theme"><span class="eo-settings-nav-icon">🎨</span><span>테마</span></button>
          <button type="button" data-settings-target="notifications"><span class="eo-settings-nav-icon">🔔</span><span>채팅 알림</span></button>
          <button type="button" data-settings-target="data"><span class="eo-settings-nav-icon">🗂️</span><span>데이터 관리</span></button>
        </nav>
        <div class="eo-settings-content">
          <div class="eo-settings-panel" data-settings-panel="account">
            <article class="card eo-settings-card">
              <div class="eo-settings-card-head"><div><h3>내 계정 설정</h3><p>로그인 계정과 모임에서 사용하는 개인정보를 관리합니다.</p></div><span class="eo-settings-badge" id="settingsRoleBadge">회원</span></div>
              <div class="eo-settings-form">
                <div class="eo-settings-field full"><label for="settingsAccountEmail">로그인 이메일</label><input id="settingsAccountEmail" class="input eo-settings-readonly" type="email" readonly></div>
                <div class="eo-settings-field"><label for="settingsAccountName">이름</label><input id="settingsAccountName" class="input" autocomplete="name" placeholder="이름"></div>
                <div class="eo-settings-field"><label for="settingsAccountPhone">전화번호</label><input id="settingsAccountPhone" class="input" autocomplete="tel" placeholder="전화번호"></div>
              </div>
              <div class="eo-settings-actions"><button type="button" class="btn" id="settingsProfileSave">개인정보 저장</button></div>
              <div class="eo-settings-divider"></div>
              <div class="eo-settings-card-head"><div><h3>비밀번호 변경</h3><p>로그인 이메일로 본인 확인 링크를 받아 새 비밀번호를 설정합니다.</p></div></div>
              <div class="eo-settings-actions"><button type="button" class="btn secondary" id="settingsPasswordReset">비밀번호 변경 메일 받기</button></div>
            </article>
          </div>

          <div class="eo-settings-panel" data-settings-panel="theme">
            <article class="card eo-settings-card">
              <div class="eo-settings-card-head"><div><h3>테마 설정</h3><p>원하는 화면 분위기를 선택합니다. 이 브라우저에 자동으로 저장됩니다.</p></div></div>
              <div class="eo-theme-options">
                <button type="button" class="eo-theme-option" data-settings-theme="default"><span class="eo-theme-swatch"><i></i><span></span></span><strong>기본 대시보드</strong><small>어흥의 기본 파란색 카드형 화면</small></button>
                <button type="button" class="eo-theme-option" data-settings-theme="groupware"><span class="eo-theme-swatch"><i></i><span></span></span><strong>그룹웨어</strong><small>사내 업무 시스템과 유사한 화면</small></button>
                <button type="button" class="eo-theme-option" data-settings-theme="excel"><span class="eo-theme-swatch"><i></i><span></span></span><strong>엑셀 업무표</strong><small>표 중심의 간결한 녹색 화면</small></button>
              </div>
              <select id="themeSelect" tabindex="-1" aria-hidden="true"><option value="default">기본</option><option value="groupware">그룹웨어</option><option value="excel">엑셀</option></select><div id="themePreview" aria-hidden="true"></div>
            </article>
          </div>

          <div class="eo-settings-panel" data-settings-panel="notifications">
            <article class="card eo-settings-card">
              <div class="eo-settings-card-head"><div><h3>채팅 알림 설정</h3><p>새 채팅이 왔을 때 알림을 표시할 위치를 선택합니다.</p></div></div>
              <div class="eo-notification-list">
                <div class="eo-notification-row"><div><h4>사이트 내 알림</h4><p>어흥 화면을 보고 있을 때 우측 하단에 발신자와 메시지 미리보기를 표시합니다.</p></div><label class="eo-switch"><input id="settingsInAppNotification" type="checkbox"><span></span></label></div>
                <div class="eo-notification-row"><div><h4>컴퓨터 알림</h4><p>브라우저 창을 내려놓거나 다른 프로그램을 보는 중에도 Windows 알림을 표시합니다.</p><div class="eo-notification-status"><span class="eo-status-dot" id="settingsSystemStatusDot"></span><span id="settingsSystemStatus">상태 확인 중</span></div></div><label class="eo-switch"><input id="settingsSystemNotification" type="checkbox"><span></span></label></div>
              </div>
              <p class="eo-settings-help">컴퓨터 알림은 브라우저와 어흥 탭이 열려 있을 때 작동합니다. 처음 켤 때 브라우저의 알림 허용이 필요합니다.</p>
            </article>
          </div>

          <div class="eo-settings-panel" data-settings-panel="data">
            <article class="card eo-settings-card">
              <div class="eo-settings-card-head"><div><h3>데이터 관리</h3><p>현재 Supabase 데이터를 JSON 파일로 내려받아 별도로 보관합니다.</p></div></div>
              <div class="eo-settings-data-actions"><button type="button" class="btn secondary" id="exportBtn">JSON 백업 내보내기</button></div>
            </article>
            <div id="settingsHistorySlot"></div>
          </div>
        </div>
      </div>`;
  }

  function openSection(id){
    const valid=$(`[data-settings-panel="${id}"]`)?id:'account';
    activeSection=valid;
    $$('[data-settings-target]').forEach(button=>{
      const active=button.dataset.settingsTarget===valid;
      button.classList.toggle('active',active);
      if(active)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');
    });
    $$('[data-settings-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.settingsPanel===valid));
    if(valid==='account')fillAccount();
    if(valid==='theme')syncTheme();
    if(valid==='notifications')syncNotifications();
    if(valid==='data')relocateHistory();
  }

  function fillAccount(){
    const user=currentUser();
    const member=currentMember();
    const email=$('#settingsAccountEmail');
    const name=$('#settingsAccountName');
    const phone=$('#settingsAccountPhone');
    if(email)email.value=user?.email||'';
    if(member){
      lastMemberId=String(member.id||'');
      if(name&&name!==document.activeElement)name.value=member.name||'';
      if(phone&&phone!==document.activeElement)phone.value=member.phone||'';
    }
    const role=member?.member_role||'associate';
    const badge=$('#settingsRoleBadge');
    if(badge)badge.textContent=ROLE_LABEL[role]||'회원';
  }

  async function saveProfile(){
    const client=appState()?.client;
    const member=currentMember();
    if(!client||!member)return toast('연동된 회원 정보를 찾지 못했습니다.');
    const name=($('#settingsAccountName')?.value||'').trim();
    const phone=($('#settingsAccountPhone')?.value||'').trim();
    if(!name)return toast('이름을 입력해 주세요.');
    const button=$('#settingsProfileSave');
    if(button)button.disabled=true;
    try{
      const {data,error}=await client.from('members').update({name,phone}).eq('id',member.id).select().single();
      if(error)throw error;
      const index=(appState()?.members||[]).findIndex(item=>String(item.id)===String(member.id));
      if(index>=0)appState().members[index]=data;
      try{window.renderMembers?.();window.renderDashboard?.();window.renderRecords?.();window.renderDateDetail?.()}catch(e){}
      fillAccount();
      toast('개인정보를 저장했습니다.');
    }catch(error){toast('개인정보 저장 오류: '+(error?.message||error))}
    finally{if(button)button.disabled=false}
  }

  async function sendPasswordReset(){
    const client=appState()?.client;
    const email=currentUser()?.email;
    if(!client||!email)return toast('로그인 계정을 확인할 수 없습니다.');
    const button=$('#settingsPasswordReset');
    if(button)button.disabled=true;
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${RESET_PATH}`});
      if(error)throw error;
      toast('비밀번호 변경 메일을 발송했습니다. 메일의 버튼을 눌러 주세요.');
    }catch(error){toast('메일 발송 오류: '+(error?.message||error))}
    finally{if(button)button.disabled=false}
  }

  function currentTheme(){return appState()?.theme||localStorage.getItem('eoheung_theme')||'default'}
  function syncTheme(){
    const theme=currentTheme();
    $$('[data-settings-theme]').forEach(button=>button.classList.toggle('active',button.dataset.settingsTheme===theme));
    const legacy=$('#themeSelect');
    if(legacy)legacy.value=theme;
  }
  function setTheme(theme){
    if(typeof window.applyTheme==='function')window.applyTheme(theme);
    else{
      localStorage.setItem('eoheung_theme',theme);
      document.body.classList.toggle('theme-groupware',theme==='groupware');
      document.body.classList.toggle('theme-excel',theme==='excel');
      if(appState())appState().theme=theme;
    }
    syncTheme();
  }

  function storedBool(key,fallback){const raw=localStorage.getItem(key);return raw===null?fallback:raw==='true'}
  function fallbackNotificationSettings(){
    const supported='Notification'in window;
    const permission=supported?Notification.permission:'unsupported';
    return{
      inApp:storedBool('eoheung_chat_in_app_notifications',true),
      system:storedBool('eoheung_chat_system_notifications',permission==='granted'),
      supported,
      permission
    };
  }
  function notificationSettings(){return window.eoChatNotificationSettings?.get?.()||fallbackNotificationSettings()}
  function syncNotifications(){
    const settings=notificationSettings();
    const inApp=$('#settingsInAppNotification');
    const system=$('#settingsSystemNotification');
    if(inApp)inApp.checked=!!settings.inApp;
    if(system){system.checked=!!settings.system&&settings.permission==='granted';system.disabled=!settings.supported}
    const dot=$('#settingsSystemStatusDot');
    const text=$('#settingsSystemStatus');
    dot?.classList.toggle('on',settings.permission==='granted'&&settings.system);
    dot?.classList.toggle('blocked',settings.permission==='denied'||!settings.supported);
    if(text){
      if(!settings.supported)text.textContent='이 브라우저에서는 컴퓨터 알림을 지원하지 않습니다.';
      else if(settings.permission==='denied')text.textContent='브라우저에서 알림이 차단되어 있습니다.';
      else if(settings.permission==='granted'&&settings.system)text.textContent='컴퓨터 알림이 켜져 있습니다.';
      else if(settings.permission==='granted')text.textContent='컴퓨터 알림이 꺼져 있습니다.';
      else text.textContent='켜면 브라우저에서 알림 허용을 요청합니다.';
    }
  }

  async function setInAppNotifications(enabled){
    if(window.eoChatNotificationSettings?.setInApp)window.eoChatNotificationSettings.setInApp(enabled);
    else localStorage.setItem('eoheung_chat_in_app_notifications',String(enabled));
    syncNotifications();
    toast(enabled?'사이트 내 채팅 알림을 켰습니다.':'사이트 내 채팅 알림을 껐습니다.');
  }
  async function setSystemNotifications(enabled){
    if(window.eoChatNotificationSettings?.setSystem)await window.eoChatNotificationSettings.setSystem(enabled);
    else if(!enabled)localStorage.setItem('eoheung_chat_system_notifications','false');
    else if('Notification'in window){
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      localStorage.setItem('eoheung_chat_system_notifications',String(permission==='granted'));
      if(permission!=='granted')toast('컴퓨터 알림이 허용되지 않았습니다.');
    }
    syncNotifications();
  }

  function exportData(){
    const current=appState();
    const data={members:current?.members||[],games:current?.games||[],gameMembers:current?.gameMembers||[],links:current?.links||[]};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const anchor=document.createElement('a');
    anchor.href=URL.createObjectURL(blob);
    anchor.download='eoheung-backup.json';
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
  }

  function relocateHistory(){
    const slot=$('#settingsHistorySlot');
    const history=$('#eoHistoryPanel');
    if(slot&&history&&history.parentElement!==slot)slot.appendChild(history);
  }

  function bind(){
    const settings=$('#settings');
    settings.addEventListener('click',event=>{
      const target=event.target.closest('[data-settings-target]');
      if(target){event.preventDefault();openSection(target.dataset.settingsTarget);return}
      const theme=event.target.closest('[data-settings-theme]');
      if(theme){event.preventDefault();setTheme(theme.dataset.settingsTheme)}
    });
    $('#settingsProfileSave')?.addEventListener('click',saveProfile);
    $('#settingsPasswordReset')?.addEventListener('click',sendPasswordReset);
    $('#settingsInAppNotification')?.addEventListener('change',event=>setInAppNotifications(event.target.checked));
    $('#settingsSystemNotification')?.addEventListener('change',event=>setSystemNotifications(event.target.checked));
    $('#exportBtn')?.addEventListener('click',exportData);
    window.addEventListener('eoheung:chat-notification-settings',syncNotifications);
  }

  function mount(){
    const settings=$('#settings');
    if(!settings||settings.dataset.settingsHub==='1')return;
    style();
    settings.dataset.settingsHub='1';
    settings.classList.add('eo-settings-ready');
    settings.innerHTML=markup();
    bind();
    openSection(activeSection);
    refresh();
  }

  function refresh(){
    fillAccount();
    syncTheme();
    syncNotifications();
    relocateHistory();
  }

  window.eoSettingsHub={
    open(section='account'){
      if(typeof window.navigateToPage==='function')window.navigateToPage('settings');
      else if(typeof window.activatePage==='function')window.activatePage('settings',{updateUrl:true});
      openSection(section);
    },
    refresh,
    addSection({id,label,icon='⚙️',content=''}){
      if(!id||$(`[data-settings-panel="${id}"]`))return false;
      const button=document.createElement('button');
      button.type='button';button.dataset.settingsTarget=id;button.innerHTML=`<span class="eo-settings-nav-icon">${icon}</span><span>${label||id}</span>`;
      $('.eo-settings-nav')?.appendChild(button);
      const panel=document.createElement('div');panel.className='eo-settings-panel';panel.dataset.settingsPanel=id;panel.innerHTML=content;
      $('.eo-settings-content')?.appendChild(panel);
      return true;
    }
  };

  function boot(){
    mount();
    setInterval(()=>{
      mount();
      const member=currentMember();
      if(String(member?.id||'')!==lastMemberId||activeSection==='account')fillAccount();
      syncTheme();syncNotifications();relocateHistory();
    },1200);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();
