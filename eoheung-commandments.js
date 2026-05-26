(function(){
  const key='eoheung_commandments_v1';
  const defaults=[
    '우리는 삼성 라이온즈를 응원한다. 이기든 지든 끝까지 함께 응원한다.',
    '직관은 약속이다. 참석이 어려우면 미리 알리고 서로의 일정을 배려한다.',
    '응원은 크게, 매너는 더 크게 한다. 상대팀과 상대 팬을 존중한다.',
    '승리요정은 존중받아야 한다. 단, 칭호는 자랑하되 남용하지 않는다.',
    '패배요정이라는 말은 농담으로만 한다. 패배를 누군가의 탓으로 돌리지 않는다.',
    '지각은 할 수 있어도 응원 타이밍은 놓치지 않는다.',
    '먹거리는 나누면 더 맛있다. 마지막 치킨 조각은 눈치껏 처리한다.',
    '기록은 추억이다. 직관 횟수, 좌석, 함께한 사람을 소중히 남긴다.',
    '비가 와도 마음은 취소되지 않는다. 우천취소와 일정 변경에도 유연하게 대응한다.',
    '우리는 어흥답게 즐긴다. 야구를 핑계로 만나고 응원을 이유로 웃는다.'
  ];
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s||'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  function items(){try{const v=JSON.parse(localStorage.getItem(key)||'null');if(Array.isArray(v)&&v.length===10)return v}catch(e){}return defaults.slice()}
  function style(){if($('#eoCmdStyle'))return;const st=document.createElement('style');st.id='eoCmdStyle';st.textContent='.eo-cmd{margin-top:14px}.eo-cmd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.eo-cmd-head h3{margin:0;font-size:22px}.eo-cmd-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.eo-cmd-item{display:grid;grid-template-columns:34px 1fr;gap:10px;padding:12px;border:1px solid #dce5f2;border-radius:14px;background:#fbfdff}.eo-cmd-no{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;background:#eef4ff;color:#074ca1;font-weight:900}.eo-cmd-txt{margin:0;font-size:13px;line-height:1.5;font-weight:700;color:#1f2937}.eo-cmd-edit{display:none;margin-top:12px;border-top:1px solid #e2e8f0;padding-top:12px}.eo-cmd-edit.show{display:block}.eo-cmd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.eo-cmd-grid textarea{width:100%;min-height:72px;border:1px solid #d7e1ef;border-radius:12px;padding:10px;font:inherit;font-size:13px}@media(max-width:900px){.eo-cmd-list,.eo-cmd-grid{grid-template-columns:1fr}.eo-cmd-head{flex-direction:column}}';document.head.appendChild(st)}
  function render(){const about=$('#about');if(!about)return;style();let card=$('#eoCmd');if(!card){card=document.createElement('div');card.id='eoCmd';card.className='card pad eo-cmd';const edit=about.querySelector('.eo-about-edit');if(edit)about.insertBefore(card,edit);else about.appendChild(card)}if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest('#eoCmd'))return;const arr=items();card.innerHTML='<div class="eo-cmd-head"><div><h3>🦁 어흥 십계명</h3><p class="note">어흥 직관 모임이 함께 지키고 즐기는 약속입니다.</p></div><button class="btn secondary" data-cmd-toggle>십계명 수정</button></div><div class="eo-cmd-list">'+arr.map((x,i)=>'<div class="eo-cmd-item"><div class="eo-cmd-no">'+(i+1)+'</div><p class="eo-cmd-txt">'+esc(x)+'</p></div>').join('')+'</div><div id="eoCmdEdit" class="eo-cmd-edit"><div class="eo-cmd-grid">'+arr.map((x,i)=>'<div><b>'+(i+1)+'계명</b><textarea id="eoCmdText'+i+'">'+esc(x)+'</textarea></div>').join('')+'</div><div class="toolbar" style="margin-top:12px;justify-content:flex-end"><button class="btn green" data-cmd-save>십계명 저장</button><button class="btn secondary" data-cmd-reset>기본값 복원</button></div></div>'}
  if(!window.__eoCmdBound){window.__eoCmdBound=true;document.body.addEventListener('click',e=>{if(e.target.closest('[data-cmd-toggle]')){$('#eoCmdEdit')?.classList.toggle('show')}if(e.target.closest('[data-cmd-save]')){localStorage.setItem(key,JSON.stringify(Array.from({length:10},(_,i)=>$('#eoCmdText'+i)?.value.trim()||defaults[i])));$('#eoCmdEdit')?.classList.remove('show');render();toast?.('어흥 십계명을 저장했습니다.')}if(e.target.closest('[data-cmd-reset]')){localStorage.removeItem(key);render();toast?.('기본값으로 복원했습니다.')}},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
  setInterval(render,1800);
})();
