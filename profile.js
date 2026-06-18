(function(){
  function q(s){return document.querySelector(s)}
  function last(){var nav=q('.nav'),b=nav&&nav.querySelector('button[data-page="settings"]');if(nav&&b&&b.nextElementSibling)nav.appendChild(b)}
  function add(){last();var grid=q('#settings .settings-grid');if(!grid||q('#profileSettingsCard'))return;var c=document.createElement('div');c.id='profileSettingsCard';c.className='card profile-settings-card';c.innerHTML='<h3>개인정보 설정</h3><p class="note">본인 이름과 전화번호를 변경합니다.</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><input id="profileName" class="input" placeholder="이름"><input id="profilePhone" class="input" placeholder="전화번호"></div><button class="btn" id="saveProfileBtn" type="button" style="margin-top:12px">저장</button>';grid.appendChild(c)}
  function boot(){add();setInterval(function(){last();add()},1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
