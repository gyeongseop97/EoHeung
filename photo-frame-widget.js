(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const RATIO={
    '4:3':{w:1600,h:1200,label:'4:3'},
    '16:9':{w:1600,h:900,label:'16:9'},
    '1:1':{w:1400,h:1400,label:'1:1'}
  };
  const THEMES={
    blue:{name:'라이온즈 블루',main:'#074ca1',sub:'#0b63d1',accent:'#ffd34d',dark:'rgba(3,14,38,.74)',top:'rgba(7,76,161,.26)',badge:'#0f9f6e'},
    neon:{name:'블루 네온',main:'#00a3ff',sub:'#7dd3fc',accent:'#facc15',dark:'rgba(2,8,23,.80)',top:'rgba(14,165,233,.24)',badge:'#2563eb'},
    retro:{name:'레트로 야구카드',main:'#1e3a8a',sub:'#b45309',accent:'#f8e1a1',dark:'rgba(41,24,11,.68)',top:'rgba(248,225,161,.20)',badge:'#b45309'},
    polaroid:{name:'폴라로이드',main:'#ffffff',sub:'#e5e7eb',accent:'#074ca1',dark:'rgba(15,23,42,.58)',top:'rgba(255,255,255,.12)',badge:'#074ca1'}
  };
  const RESULT_THEME={W:{label:'WIN',className:'win'},L:{label:'LOSE',className:'lose'},D:{label:'DRAW',className:'draw'},S:{label:'GAME DAY',className:'schedule'}};
  let image=null, selected=null, rendered=false;

  function getState(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(e){return window.state||null}}
  function toast(m){const el=$('#toast');if(el){const d=document.createElement('div');d.textContent=m;el.appendChild(d);setTimeout(()=>d.remove(),3000)}else alert(m)}
  function fmtDate(v){return String(v||'').slice(0,10)}
  function scoreOf(g){return {s:Number(g.samsung_score??0),o:Number(g.opponent_score??0)}}
  function resultOf(g){if(g.status!=='FINISHED')return 'S'; if(g.result)return g.result; const s=scoreOf(g); return s.s> s.o?'W':s.s<s.o?'L':'D'}
  function gameText(g){const s=scoreOf(g);return g.status==='FINISHED'?`삼성 ${s.s} VS ${s.o} ${g.opponent}`:`삼성 VS ${g.opponent}`}
  function gameSub(g){const r=RESULT_THEME[resultOf(g)]||RESULT_THEME.S;return `${g.stadium||'라이온즈파크'} · ${r.label}`}
  function attendedGameIds(){const st=getState();const ids=new Set();(st?.gameMembers||[]).forEach(e=>{if(e&&(e.attended||e.planned))ids.add(String(e.game_id))});return ids}
  function games(){const st=getState();if(!st?.games)return[];const ids=attendedGameIds();return st.games.filter(g=>ids.has(String(g.id))).sort((a,b)=>String(b.game_date||'').localeCompare(String(a.game_date||''))||String(b.game_time||'').localeCompare(String(a.game_time||'')))}
  function attendees(g){const st=getState();if(!st||!g)return[];const ids=(st.gameMembers||[]).filter(e=>String(e.game_id)===String(g.id)&&e.attended).map(e=>String(e.member_id));return (st.members||[]).filter(m=>ids.includes(String(m.id))).map(m=>m.name).filter(Boolean)}

  function injectStyle(){
    if($('#photoFrameWidgetStyle'))return;
    const s=document.createElement('style');s.id='photoFrameWidgetStyle';s.textContent=`
      .photo-frame-grid{display:grid;grid-template-columns:390px 1fr;gap:18px;align-items:start}.photo-frame-panel{padding:20px}.photo-frame-panel h3{margin:0 0 14px;font-size:18px}.pf-form{display:grid;gap:12px}.pf-field{display:grid;gap:7px}.pf-field label,.pf-check label{font-size:12px;font-weight:900;color:#334155}.pf-field select,.pf-field input[type=file],.pf-field input[type=text]{border:1px solid var(--line,#dce5f2);border-radius:12px;background:#fff;padding:10px 12px;font-size:13px}.pf-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pf-check{border:1px solid var(--line,#dce5f2);border-radius:12px;background:#f8fbff;padding:10px 11px;font-size:12px;color:#334155}.pf-check input{margin-right:6px}.pf-info{border:1px solid #dbe7f5;border-radius:14px;background:#f8fbff;padding:13px;font-size:13px;line-height:1.55;color:#334155}.pf-info b{color:#041e42}.pf-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}.pf-preview{padding:20px}.pf-preview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.pf-preview-head h3{margin:0}.pf-canvas-wrap{background:linear-gradient(180deg,#eef5ff,#f8fbff);border:1px solid #dbe7f5;border-radius:18px;padding:16px;overflow:auto}.pf-canvas{display:block;width:100%;max-width:100%;background:white;border-radius:14px;box-shadow:0 12px 34px rgba(15,23,42,.10)}.pf-muted{font-size:12px;color:#64748b;line-height:1.45}.pf-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#eef4ff;color:#074ca1;margin-left:6px}.pf-local-note{border:1px solid #bbf7d0;background:#f0fdf4;color:#047857;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800}@media(max-width:1100px){.photo-frame-grid{grid-template-columns:1fr}}@media(max-width:640px){.pf-checks{grid-template-columns:1fr}.photo-frame-panel,.pf-preview{padding:16px}}
    `;document.head.appendChild(s);
  }

  function mount(){
    if($('#photoFrame'))return;
    injectStyle();
    const nav=$('.nav');
    if(nav&&!$('#photoFrameNavBtn')){
      const btn=document.createElement('button');btn.id='photoFrameNavBtn';btn.type='button';btn.dataset.page='photoFrame';btn.textContent='🖼️ 포토프레임';nav.insertBefore(btn,$('[data-page="settings"]',nav)||null);btn.addEventListener('click',openPage);
    }
    const main=$('.main'); if(!main)return;
    const section=document.createElement('section');section.id='photoFrame';section.className='section';section.innerHTML=`
      <div class="photo-frame-grid">
        <div class="card photo-frame-panel">
          <h3>포토프레임 만들기</h3>
          <div class="pf-form">
            <div class="pf-field"><label>직관 날짜</label><select id="pfGameSelect"><option value="">직관 경기를 선택하세요</option></select></div>
            <div class="pf-field"><label>사진 비율</label><select id="pfRatio"><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select></div>
            <div class="pf-field"><label>프레임 테마</label><select id="pfTheme"><option value="blue">라이온즈 블루</option><option value="neon">블루 네온</option><option value="retro">레트로 야구카드</option><option value="polaroid">폴라로이드</option></select></div>
            <div class="pf-field"><label>응원 문구</label><select id="pfPhrase"><option value="오늘도 승요">오늘도 승요</option><option value="직관은 승리다">직관은 승리다</option><option value="어흥 출동">어흥 출동</option><option value="라팍의 함성 그대로">라팍의 함성 그대로</option><option value="삼성! 승리를 향해">삼성! 승리를 향해</option><option value="custom">직접 입력</option></select></div>
            <div class="pf-field" id="pfCustomPhraseWrap" style="display:none"><label>직접 입력 문구</label><input id="pfCustomPhrase" type="text" maxlength="28" placeholder="예: 오늘도 라팍 접수"></div>
            <div class="pf-checks">
              <label class="pf-check"><input type="checkbox" id="pfUsePhrase" checked> 응원문구 넣기</label>
              <label class="pf-check"><input type="checkbox" id="pfUseWatermark" checked> 어흥 워터마크</label>
            </div>
            <div class="pf-field"><label>사진 업로드</label><input id="pfPhoto" type="file" accept="image/*"></div>
            <div class="pf-info" id="pfGameInfo">직관 경기를 선택하면 결과가 표시됩니다.</div>
            <div class="pf-local-note">업로드한 사진은 서버에 저장되지 않고, 현재 브라우저에서만 가공됩니다.</div>
            <div class="pf-actions"><button class="btn" id="pfRenderBtn">프레임 적용</button><button class="btn secondary" id="pfDownloadBtn" disabled>다운로드</button></div>
          </div>
        </div>
        <div class="card pf-preview">
          <div class="pf-preview-head"><h3>미리보기 <span class="pf-pill" id="pfRatioPill">4:3</span></h3><span class="pf-muted">PNG 파일로 저장됩니다.</span></div>
          <div class="pf-canvas-wrap"><canvas id="pfCanvas" class="pf-canvas"></canvas></div>
        </div>
      </div>`;
    main.appendChild(section);
    bind();
    populate();
    drawEmpty();
  }

  function openPage(){
    $$('.nav button').forEach(b=>b.classList.remove('active'));$('#photoFrameNavBtn')?.classList.add('active');
    $$('.section').forEach(s=>s.classList.remove('active'));$('#photoFrame')?.classList.add('active');
    const t=$('#pageTitle'),sub=$('#pageSub');if(t)t.textContent='포토프레임';if(sub)sub.textContent='직관 사진에 경기 결과 프레임을 씌워 저장합니다.';
    populate();
  }
  function bind(){
    $('#pfGameSelect').addEventListener('change',()=>{selected=games().find(g=>String(g.id)===$('#pfGameSelect').value)||null;updateInfo();if(image)render()});
    $('#pfRatio').addEventListener('change',()=>{$('#pfRatioPill').textContent=$('#pfRatio').value;if(image&&selected)render();else drawEmpty()});
    $('#pfTheme').addEventListener('change',()=>{if(image&&selected)render();else drawEmpty()});
    $('#pfPhrase').addEventListener('change',()=>{$('#pfCustomPhraseWrap').style.display=$('#pfPhrase').value==='custom'?'grid':'none';if(image&&selected)render()});
    $('#pfCustomPhrase').addEventListener('input',()=>{if(image&&selected)render()});
    $('#pfUsePhrase').addEventListener('change',()=>{if(image&&selected)render()});
    $('#pfUseWatermark').addEventListener('change',()=>{if(image&&selected)render()});
    $('#pfPhoto').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;image=await readImage(f);if(selected)render();else drawEmpty()});
    $('#pfRenderBtn').addEventListener('click',render);
    $('#pfDownloadBtn').addEventListener('click',download);
  }
  function populate(){
    const sel=$('#pfGameSelect'); if(!sel)return; const current=sel.value; const gs=games();
    sel.innerHTML='<option value="">직관 경기를 선택하세요</option>'+gs.map(g=>`<option value="${esc(g.id)}">${esc(fmtDate(g.game_date))} · ${esc(gameText(g))}</option>`).join('');
    if(current&&gs.some(g=>String(g.id)===String(current)))sel.value=current;
    else if(gs.length&&!selected){sel.value=String(gs[0].id);selected=gs[0]}
    updateInfo();
  }
  function updateInfo(){
    const el=$('#pfGameInfo'); if(!el)return;
    if(!selected){el.innerHTML='직관 경기를 선택하면 결과가 표시됩니다.';return}
    const r=RESULT_THEME[resultOf(selected)]||RESULT_THEME.S;
    const names=attendees(selected);
    el.innerHTML=`<b>${esc(fmtDate(selected.game_date))}</b><br><b>${esc(gameText(selected))}</b><br>${esc(gameSub(selected))}${names.length?`<br>직관: ${esc(names.join(', '))}`:''}<span class="pf-pill">${r.label}</span>`;
  }
  function readImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;const rd=new FileReader();rd.onload=e=>img.src=e.target.result;rd.onerror=reject;rd.readAsDataURL(file)})}
  function ctx(){const c=$('#pfCanvas');const size=RATIO[$('#pfRatio')?.value||'4:3'];c.width=size.w;c.height=size.h;return {canvas:c,ctx:c.getContext('2d'),w:size.w,h:size.h}}
  function cover(c,img,w,h){const s=Math.max(w/img.width,h/img.height),dw=img.width*s,dh=img.height*s;c.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh)}
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function phrase(){if(!$('#pfUsePhrase').checked)return'';return $('#pfPhrase').value==='custom'?($('#pfCustomPhrase').value.trim()||'어흥 출동'):$('#pfPhrase').value}
  function drawEmpty(){const o=ctx();const c=o.ctx,w=o.w,h=o.h;c.fillStyle='#f8fbff';c.fillRect(0,0,w,h);c.strokeStyle='#dbe7f5';c.lineWidth=10;rr(c,30,30,w-60,h-60,28);c.stroke();c.fillStyle='#074ca1';c.font=`900 ${Math.round(w*.045)}px Pretendard, Arial`;c.textAlign='center';c.fillText('포토프레임 미리보기',w/2,h/2-18);c.fillStyle='#64748b';c.font=`700 ${Math.round(w*.022)}px Pretendard, Arial`;c.fillText('직관 경기와 사진을 선택한 뒤 프레임 적용을 눌러주세요.',w/2,h/2+34);rendered=false;$('#pfDownloadBtn')&&($('#pfDownloadBtn').disabled=true)}
  function render(){
    if(!selected)return toast('직관 경기를 선택해 주세요.');
    if(!image)return toast('사진을 업로드해 주세요.');
    const o=ctx(),c=o.ctx,w=o.w,h=o.h,th=THEMES[$('#pfTheme').value]||THEMES.blue,res=RESULT_THEME[resultOf(selected)]||RESULT_THEME.S;
    cover(c,image,w,h);
    const top=c.createLinearGradient(0,0,0,h*.32);top.addColorStop(0,th.top);top.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=top;c.fillRect(0,0,w,h*.32);
    const bottom=c.createLinearGradient(0,h*.48,0,h);bottom.addColorStop(0,'rgba(0,0,0,0)');bottom.addColorStop(1,th.dark);c.fillStyle=bottom;c.fillRect(0,h*.48,w,h*.52);
    if($('#pfTheme').value==='polaroid'){c.fillStyle='rgba(255,255,255,.92)';c.fillRect(0,h*.86,w,h*.14)}
    c.lineWidth=Math.max(12,w*.008);c.strokeStyle=th.main;rr(c,22,22,w-44,h-44,28);c.stroke();
    c.lineWidth=Math.max(4,w*.003);c.strokeStyle=th.accent;rr(c,42,42,w-84,h-84,22);c.stroke();
    c.strokeStyle=th.sub;c.lineWidth=Math.max(7,w*.004);c.beginPath();c.moveTo(64,116);c.lineTo(176,116);c.moveTo(64,116);c.lineTo(64,218);c.moveTo(w-64,116);c.lineTo(w-176,116);c.moveTo(w-64,116);c.lineTo(w-64,218);c.stroke();
    c.fillStyle=th.main;rr(c,58,44,w-116,Math.max(70,h*.085),22);c.fill();
    c.fillStyle=$('#pfTheme').value==='polaroid'?'#111827':'#fff';c.font=`900 ${Math.round(w*.028)}px Pretendard, Arial`;c.textBaseline='middle';c.textAlign='left';c.fillText(fmtDate(selected.game_date),86,44+Math.max(70,h*.085)/2);
    c.textAlign='right';c.fillText(selected.stadium||'라이온즈파크',w-86,44+Math.max(70,h*.085)/2);c.textAlign='left';
    const yBase=$('#pfTheme').value==='polaroid'?h*.915:h-86;
    const titleColor=$('#pfTheme').value==='polaroid'?'#111827':'#fff';
    c.fillStyle=titleColor;c.font=`900 ${Math.round(w*.042)}px Pretendard, Arial`;c.fillText('SAMSUNG LIONS',72,yBase-112);
    c.fillStyle=th.accent;c.font=`900 ${Math.round(w*.065)}px Pretendard, Arial`;c.fillText(gameText(selected),72,yBase-44);
    const badge=res.label;c.font=`900 ${Math.round(w*.028)}px Pretendard, Arial`;const bw=c.measureText(badge).width+56,bh=Math.max(48,h*.055),bx=w-bw-72,by=yBase-128;c.fillStyle=resultOf(selected)==='L'?'#be123c':resultOf(selected)==='D'?'#475569':th.badge;rr(c,bx,by,bw,bh,18);c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.fillText(badge,bx+bw/2,by+bh/2);c.textAlign='left';
    const p=phrase();if(p){c.fillStyle=$('#pfTheme').value==='polaroid'?'#074ca1':'rgba(255,255,255,.94)';c.font=`900 ${Math.round(w*.03)}px Pretendard, Arial`;c.fillText(p,72,yBase-178)}
    if($('#pfUseWatermark').checked){c.save();c.globalAlpha=.22;c.translate(w-80,h*.52);c.rotate(-Math.PI/2);c.fillStyle='#fff';c.font=`900 ${Math.round(w*.034)}px Arial`;c.fillText('EOHEUNG',0,0);c.restore();c.globalAlpha=.95;c.fillStyle=$('#pfTheme').value==='polaroid'?'#64748b':'rgba(255,255,255,.86)';c.font=`800 ${Math.round(w*.018)}px Arial`;c.textAlign='right';c.fillText('EOHEUNG · SAMSUNG LIONS WATCH PARTY',w-72,h-46);c.textAlign='left'}
    rendered=true;$('#pfDownloadBtn').disabled=false;
  }
  function download(){if(!rendered)return toast('먼저 프레임을 적용해 주세요.');const a=document.createElement('a');a.href=$('#pfCanvas').toDataURL('image/png');a.download=`eoheung_photo_frame_${fmtDate(selected?.game_date)||'game'}.png`;a.click()}
  function boot(){mount();setTimeout(populate,900);setTimeout(populate,1800);setInterval(()=>{if($('#photoFrame')?.classList.contains('active'))populate()},5000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();