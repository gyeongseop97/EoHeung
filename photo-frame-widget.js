(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const BASE_RATIO={'4:3':{w:1600,h:1200},'16:9':{w:1600,h:900},'1:1':{w:1400,h:1400}};
  const THEMES={
    blue:{name:'라이온즈 블루',main:'#074ca1',sub:'#0b63d1',accent:'#ffd34d',dark:'rgba(3,14,38,.74)',top:'rgba(7,76,161,.26)',win:'#0f9f6e',lose:'#be123c',draw:'#475569',text:'#fff'},
    neon:{name:'블루 네온',main:'#00a3ff',sub:'#7dd3fc',accent:'#facc15',dark:'rgba(2,8,23,.80)',top:'rgba(14,165,233,.24)',win:'#2563eb',lose:'#be123c',draw:'#475569',text:'#fff'},
    retro:{name:'레트로 야구카드',main:'#1e3a8a',sub:'#b45309',accent:'#f8e1a1',dark:'rgba(41,24,11,.68)',top:'rgba(248,225,161,.20)',win:'#15803d',lose:'#b91c1c',draw:'#57534e',text:'#fff'},
    polaroid:{name:'폴라로이드',main:'#fff',sub:'#e5e7eb',accent:'#074ca1',dark:'rgba(15,23,42,.58)',top:'rgba(255,255,255,.12)',win:'#074ca1',lose:'#be123c',draw:'#475569',text:'#111827'}
  };
  const RESULT={W:'WIN',L:'LOSE',D:'DRAW',S:'GAME DAY'};
  const LOGOS={삼성:'samsung.png',SSG:'ssg.png',KIA:'kia.png',기아:'kia.png',두산:'doosan.png',LG:'lg.png',KT:'kt.png',한화:'hanwha.png',NC:'nc.png',롯데:'lotte.png',키움:'kiwoom.png'};
  let image=null, selected=null, rendered=false, logoCache={};
  let crop={base:1,scale:1,min:1,max:3.5,x:0,y:0,drag:false,sx:0,sy:0,ox:0,oy:0};

  function st(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(e){return window.state||null}}
  function toast(m){const el=$('#toast');if(el){const d=document.createElement('div');d.textContent=m;el.appendChild(d);setTimeout(()=>d.remove(),3000)}else alert(m)}
  function fmt(v){return String(v||'').slice(0,10)}
  function score(g){return {s:Number(g?.samsung_score??0),o:Number(g?.opponent_score??0)}}
  function res(g){if(!g||g.status!=='FINISHED')return'S';if(g.result)return g.result;const a=score(g);return a.s>a.o?'W':a.s<a.o?'L':'D'}
  function gameText(g){const a=score(g);return g?.status==='FINISHED'?`삼성 ${a.s} VS ${a.o} ${g.opponent}`:`삼성 VS ${g?.opponent||''}`}
  function attendedIds(){const s=st(),ids=new Set();(s?.gameMembers||[]).forEach(e=>{if(e&&(e.attended||e.planned))ids.add(String(e.game_id))});return ids}
  function games(){const s=st();if(!s?.games)return[];const ids=attendedIds();return s.games.filter(g=>ids.has(String(g.id))).sort((a,b)=>String(b.game_date||'').localeCompare(String(a.game_date||''))||String(b.game_time||'').localeCompare(String(a.game_time||'')))}
  function attendees(g){const s=st();if(!s||!g)return[];const ids=(s.gameMembers||[]).filter(e=>String(e.game_id)===String(g.id)&&e.attended).map(e=>String(e.member_id));return (s.members||[]).filter(m=>ids.includes(String(m.id))).map(m=>m.name).filter(Boolean)}
  function size(){const r=$('#pfRatio')?.value||'4:3',o=$('#pfOrientation')?.value||'landscape',b=BASE_RATIO[r]||BASE_RATIO['4:3'];return o==='portrait'?{w:b.h,h:b.w}:{w:b.w,h:b.h}}
  function theme(){return THEMES[$('#pfTheme')?.value||'blue']||THEMES.blue}
  function isPolaroid(){return ($('#pfTheme')?.value||'blue')==='polaroid'}

  function injectStyle(){
    if($('#photoFrameWidgetStyle'))return;
    const s=document.createElement('style');s.id='photoFrameWidgetStyle';s.textContent=`
.photo-frame-grid{display:grid;grid-template-columns:420px 1fr;gap:18px;align-items:start}.photo-frame-panel{padding:20px}.photo-frame-panel h3{margin:0 0 14px;font-size:18px}.pf-form{display:grid;gap:12px}.pf-field{display:grid;gap:7px}.pf-field label,.pf-check label{font-size:12px;font-weight:900;color:#334155}.pf-field select,.pf-field input[type=file],.pf-field input[type=text]{border:1px solid var(--line,#dce5f2);border-radius:12px;background:#fff;padding:10px 12px;font-size:13px}.pf-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pf-checks{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pf-check{border:1px solid var(--line,#dce5f2);border-radius:12px;background:#f8fbff;padding:10px 11px;font-size:12px;color:#334155}.pf-info{border:1px solid #dbe7f5;border-radius:14px;background:#f8fbff;padding:13px;font-size:13px;line-height:1.55;color:#334155}.pf-info b{color:#041e42}.pf-actions,.pf-crop-controls{display:flex;gap:8px;flex-wrap:wrap}.pf-preview{padding:20px}.pf-preview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.pf-preview-head h3{margin:0}.pf-canvas-wrap{background:linear-gradient(180deg,#eef5ff,#f8fbff);border:1px solid #dbe7f5;border-radius:18px;padding:16px;overflow:auto}.pf-canvas{display:block;width:100%;max-width:100%;background:white;border-radius:14px;box-shadow:0 12px 34px rgba(15,23,42,.10);cursor:grab}.pf-canvas:active{cursor:grabbing}.pf-muted{font-size:12px;color:#64748b;line-height:1.45}.pf-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;background:#eef4ff;color:#074ca1;margin-left:6px}.pf-local-note{border:1px solid #bbf7d0;background:#f0fdf4;color:#047857;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:800}.pf-crop-box{border:1px solid #dbe7f5;border-radius:14px;background:#f8fbff;padding:12px}.pf-crop-box h4{margin:0 0 8px;font-size:14px}.pf-crop-note{font-size:12px;color:#64748b;line-height:1.45;margin-bottom:10px}@media(max-width:1100px){.photo-frame-grid{grid-template-columns:1fr}}@media(max-width:640px){.pf-checks,.pf-row-2{grid-template-columns:1fr}.photo-frame-panel,.pf-preview{padding:16px}}
    `;document.head.appendChild(s);
  }

  function mount(){
    if($('#photoFrame'))return;injectStyle();
    const nav=$('.nav');
    if(nav&&!$('#photoFrameNavBtn')){const btn=document.createElement('button');btn.id='photoFrameNavBtn';btn.type='button';btn.dataset.page='photoFrame';btn.textContent='🖼️ 포토프레임';nav.insertBefore(btn,$('[data-page="settings"]',nav)||null);btn.addEventListener('click',openPage)}
    const main=$('.main');if(!main)return;
    const section=document.createElement('section');section.id='photoFrame';section.className='section';section.innerHTML=`
<div class="photo-frame-grid"><div class="card photo-frame-panel"><h3>포토프레임 만들기</h3><div class="pf-form">
<div class="pf-field"><label>직관 날짜</label><select id="pfGameSelect"><option value="">직관 경기를 선택하세요</option></select></div>
<div class="pf-row-2"><div class="pf-field"><label>사진 비율</label><select id="pfRatio"><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select></div><div class="pf-field"><label>사진 방향</label><select id="pfOrientation"><option value="landscape">가로</option><option value="portrait">세로</option></select></div></div>
<div class="pf-field"><label>프레임 테마</label><select id="pfTheme"><option value="blue">라이온즈 블루</option><option value="neon">블루 네온</option><option value="retro">레트로 야구카드</option><option value="polaroid">폴라로이드</option></select></div>
<div class="pf-field"><label>응원 문구</label><select id="pfPhrase"><option value="오늘도 승요">오늘도 승요</option><option value="직관은 승리다">직관은 승리다</option><option value="어흥 출동">어흥 출동</option><option value="라팍의 함성 그대로">라팍의 함성 그대로</option><option value="삼성! 승리를 향해">삼성! 승리를 향해</option><option value="custom">직접 입력</option></select></div>
<div class="pf-field" id="pfCustomPhraseWrap" style="display:none"><label>직접 입력 문구</label><input id="pfCustomPhrase" type="text" maxlength="28" placeholder="예: 오늘도 라팍 접수"></div>
<div class="pf-checks"><label class="pf-check"><input type="checkbox" id="pfUsePhrase" checked> 응원문구 넣기</label><label class="pf-check"><input type="checkbox" id="pfUseWatermark" checked> 어흥 워터마크</label></div>
<div class="pf-field"><label>사진 업로드</label><input id="pfPhoto" type="file" accept="image/*"></div>
<div class="pf-crop-box"><h4>사진 위치 조정</h4><div class="pf-crop-note">미리보기 사진을 드래그해 원하는 위치로 맞추고, 마우스 휠 또는 버튼으로 확대/축소할 수 있습니다.</div><div class="pf-crop-controls"><button class="btn secondary" type="button" id="pfZoomOutBtn">－</button><button class="btn secondary" type="button" id="pfZoomInBtn">＋</button><button class="btn secondary" type="button" id="pfResetCropBtn">초기화</button></div></div>
<div class="pf-info" id="pfGameInfo">직관 경기를 선택하면 결과가 표시됩니다.</div><div class="pf-local-note">업로드한 사진은 서버에 저장되지 않고, 현재 브라우저에서만 가공됩니다.</div>
<div class="pf-actions"><button class="btn" id="pfRenderBtn">프레임 적용</button><button class="btn secondary" id="pfDownloadBtn" disabled>다운로드</button></div></div></div>
<div class="card pf-preview"><div class="pf-preview-head"><h3>미리보기 <span class="pf-pill" id="pfRatioPill">4:3 · 가로</span></h3><span class="pf-muted">PNG 파일로 저장됩니다.</span></div><div class="pf-canvas-wrap"><canvas id="pfCanvas" class="pf-canvas"></canvas></div></div></div>`;
    main.appendChild(section);bind();populate();drawEmpty();
  }
  function openPage(){$$('.nav button').forEach(b=>b.classList.remove('active'));$('#photoFrameNavBtn')?.classList.add('active');$$('.section').forEach(s=>s.classList.remove('active'));$('#photoFrame')?.classList.add('active');const t=$('#pageTitle'),sub=$('#pageSub');if(t)t.textContent='포토프레임';if(sub)sub.textContent='직관 사진에 경기 결과 프레임을 씌워 저장합니다.';populate();pill()}
  function bind(){
    $('#pfGameSelect').addEventListener('change',()=>{selected=games().find(g=>String(g.id)===$('#pfGameSelect').value)||null;updateInfo();if(image)render()});
    ['pfRatio','pfOrientation'].forEach(id=>$('#'+id).addEventListener('change',()=>{pill();resetCrop();image&&selected?render():drawEmpty()}));
    $('#pfTheme').addEventListener('change',()=>image&&selected?render():drawEmpty());
    $('#pfPhrase').addEventListener('change',()=>{$('#pfCustomPhraseWrap').style.display=$('#pfPhrase').value==='custom'?'grid':'none';if(image&&selected)render()});
    $('#pfCustomPhrase').addEventListener('input',()=>{if(image&&selected)render()});
    $('#pfUsePhrase').addEventListener('change',()=>{if(image&&selected)render()});$('#pfUseWatermark').addEventListener('change',()=>{if(image&&selected)render()});
    $('#pfPhoto').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;image=await readImage(f);resetCrop();selected?render():drawEmpty()});
    $('#pfRenderBtn').addEventListener('click',render);$('#pfDownloadBtn').addEventListener('click',download);$('#pfZoomInBtn').addEventListener('click',()=>zoom(.1));$('#pfZoomOutBtn').addEventListener('click',()=>zoom(-.1));$('#pfResetCropBtn').addEventListener('click',()=>{resetCrop();image&&selected?render():drawEmpty()});bindCanvas();
  }
  function bindCanvas(){const c=$('#pfCanvas');if(!c)return;c.addEventListener('mousedown',e=>{if(!image)return;crop.drag=true;crop.sx=e.clientX;crop.sy=e.clientY;crop.ox=crop.x;crop.oy=crop.y});window.addEventListener('mousemove',e=>{if(!crop.drag||!image)return;crop.x=crop.ox+(e.clientX-crop.sx);crop.y=crop.oy+(e.clientY-crop.sy);if(selected)render()});window.addEventListener('mouseup',()=>crop.drag=false);c.addEventListener('wheel',e=>{if(!image)return;e.preventDefault();zoom(e.deltaY<0?.08:-.08)},{passive:false})}
  function zoom(v){crop.scale=Math.max(crop.min,Math.min(crop.max,crop.scale+v));if(image&&selected)render()}
  function pill(){const o=$('#pfOrientation')?.value==='portrait'?'세로':'가로';const p=$('#pfRatioPill');if(p)p.textContent=($('#pfRatio')?.value||'4:3')+' · '+o}
  function populate(){const sel=$('#pfGameSelect');if(!sel)return;const cur=sel.value,gs=games();sel.innerHTML='<option value="">직관 경기를 선택하세요</option>'+gs.map(g=>`<option value="${esc(g.id)}">${esc(fmt(g.game_date))} · ${esc(gameText(g))}</option>`).join('');if(cur&&gs.some(g=>String(g.id)===String(cur))){sel.value=cur;selected=gs.find(g=>String(g.id)===String(cur))||selected}else if(gs.length&&!selected){sel.value=String(gs[0].id);selected=gs[0]}updateInfo();pill()}
  function updateInfo(){const el=$('#pfGameInfo');if(!el)return;if(!selected){el.innerHTML='직관 경기를 선택하면 결과가 표시됩니다.';return}const names=attendees(selected),r=RESULT[res(selected)]||RESULT.S;el.innerHTML=`<b>${esc(fmt(selected.game_date))}</b><br><b>${esc(gameText(selected))}</b><br>${esc(selected.stadium||'라이온즈파크')} · <span class="pf-pill">${r}</span>${names.length?`<br>직관: ${esc(names.join(', '))}`:''}`}
  function readImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;const rd=new FileReader();rd.onload=e=>img.src=e.target.result;rd.onerror=reject;rd.readAsDataURL(file)})}
  function logo(team){return new Promise(resolve=>{const f=LOGOS[team];if(!f)return resolve(null);const src='logo/'+f;if(logoCache[src])return resolve(logoCache[src]);const img=new Image();img.onload=()=>{logoCache[src]=img;resolve(img)};img.onerror=()=>resolve(null);img.src=src})}
  function canvas(){const c=$('#pfCanvas'),s=size();c.width=s.w;c.height=s.h;return {canvas:c,ctx:c.getContext('2d'),w:s.w,h:s.h}}
  function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function resetCrop(){if(!image){crop={base:1,scale:1,min:1,max:3.5,x:0,y:0,drag:false,sx:0,sy:0,ox:0,oy:0};return}const s=size();crop.base=Math.max(s.w/image.width,s.h/image.height);crop.scale=1;crop.min=1;crop.max=3.5;crop.x=0;crop.y=0}
  function drawImg(c,img,w,h){const sc=(crop.base||Math.max(w/img.width,h/img.height))*crop.scale,dw=img.width*sc,dh=img.height*sc;c.drawImage(img,(w-dw)/2+crop.x,(h-dh)/2+crop.y,dw,dh)}
  function phrase(){if(!$('#pfUsePhrase')?.checked)return'';return $('#pfPhrase').value==='custom'?($('#pfCustomPhrase').value.trim()||'어흥 출동'):$('#pfPhrase').value}
  function drawEmpty(){const o=canvas(),c=o.ctx,w=o.w,h=o.h;c.fillStyle='#f8fbff';c.fillRect(0,0,w,h);c.strokeStyle='#dbe7f5';c.lineWidth=10;rr(c,30,30,w-60,h-60,28);c.stroke();c.fillStyle='#074ca1';c.font=`900 ${Math.round(w*.045)}px Pretendard, Arial`;c.textAlign='center';c.fillText('포토프레임 미리보기',w/2,h/2-18);c.fillStyle='#64748b';c.font=`700 ${Math.round(w*.022)}px Pretendard, Arial`;c.fillText('직관 경기와 사진을 선택한 뒤 프레임 적용을 눌러주세요.',w/2,h/2+34);rendered=false;$('#pfDownloadBtn')&&($('#pfDownloadBtn').disabled=true)}
  async function render(){
    if(!selected)return toast('직관 경기를 선택해 주세요.');if(!image)return toast('사진을 업로드해 주세요.');
    const o=canvas(),c=o.ctx,w=o.w,h=o.h,th=theme(),rs=res(selected),sc=score(selected),opp=selected.opponent||'',lg1=await logo('삼성'),lg2=await logo(opp);
    c.clearRect(0,0,w,h);drawImg(c,image,w,h);
    let g=c.createLinearGradient(0,0,0,h*.32);g.addColorStop(0,th.top);g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h*.32);
    g=c.createLinearGradient(0,h*.48,0,h);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,th.dark);c.fillStyle=g;c.fillRect(0,h*.48,w,h*.52);
    if(isPolaroid()){c.fillStyle='rgba(255,255,255,.94)';c.fillRect(0,h*.84,w,h*.16)}
    c.lineWidth=Math.max(12,w*.008);c.strokeStyle=th.main;rr(c,22,22,w-44,h-44,28);c.stroke();c.lineWidth=Math.max(4,w*.003);c.strokeStyle=th.accent;rr(c,42,42,w-84,h-84,22);c.stroke();
    c.strokeStyle=th.sub;c.lineWidth=Math.max(7,w*.004);c.beginPath();c.moveTo(64,116);c.lineTo(176,116);c.moveTo(64,116);c.lineTo(64,218);c.moveTo(w-64,116);c.lineTo(w-176,116);c.moveTo(w-64,116);c.lineTo(w-64,218);c.stroke();
    const topH=Math.max(70,h*.085);c.fillStyle=th.main;rr(c,58,44,w-116,topH,22);c.fill();c.fillStyle=isPolaroid()?'#111827':'#fff';c.font=`900 ${Math.round(w*.028)}px Pretendard, Arial`;c.textBaseline='middle';c.textAlign='left';c.fillText(fmt(selected.game_date),86,44+topH/2);c.textAlign='right';c.fillText(selected.stadium||'라이온즈파크',w-86,44+topH/2);c.textAlign='left';
    const baseY=isPolaroid()?h*.91:h-70,textColor=isPolaroid()?'#111827':'#fff';const ph=phrase();if(ph){c.fillStyle=isPolaroid()?'#074ca1':'rgba(255,255,255,.94)';c.font=`900 ${Math.round(w*.03)}px Pretendard, Arial`;c.fillText(ph,72,baseY-188)}
    const centerY=baseY-118,logoSize=Math.round(Math.min(w,h)*.11),left=w*.27,mid=w*.5,right=w*.73;
    function block(img,name,x){if(img)c.drawImage(img,x-logoSize/2,centerY-logoSize/2,logoSize,logoSize);else{c.fillStyle='rgba(255,255,255,.18)';rr(c,x-logoSize/2,centerY-logoSize/2,logoSize,logoSize,14);c.fill()}c.fillStyle=textColor;c.font=`800 ${Math.round(w*.018)}px Pretendard, Arial`;c.textAlign='center';c.textBaseline='alphabetic';c.fillText(name,x,centerY+logoSize/2+30)}
    block(lg1,'삼성',left);c.fillStyle=th.accent;c.font=`900 ${Math.round(w*.045)}px Pretendard, Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText('VS',mid,centerY+8);block(lg2,opp,right);c.textAlign='left';c.textBaseline='alphabetic';
    c.fillStyle=textColor;c.font=`900 ${Math.round(w*.058)}px Pretendard, Arial`;c.fillText(`삼성 ${sc.s} VS ${sc.o} ${opp}`,72,baseY-10);
    const badge=RESULT[rs]||RESULT.S;c.font=`900 ${Math.round(w*.028)}px Pretendard, Arial`;const bw=c.measureText(badge).width+56,bh=Math.max(48,h*.055),bx=w-bw-72,by=baseY-104;c.fillStyle=rs==='W'?th.win:rs==='L'?th.lose:th.draw;rr(c,bx,by,bw,bh,18);c.fill();c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.fillText(badge,bx+bw/2,by+bh/2);c.textAlign='left';c.textBaseline='alphabetic';
    c.fillStyle=isPolaroid()?'#4b5563':'rgba(255,255,255,.88)';c.font=`800 ${Math.round(w*.018)}px Pretendard, Arial`;c.fillText(`${selected.stadium||'라이온즈파크'} · ${fmt(selected.game_date)}`,72,h-42);
    if($('#pfUseWatermark')?.checked){c.save();c.globalAlpha=.22;c.translate(w-80,h*.52);c.rotate(-Math.PI/2);c.fillStyle='#fff';c.font=`900 ${Math.round(w*.034)}px Arial`;c.fillText('EOHEUNG',0,0);c.restore();c.fillStyle=isPolaroid()?'#64748b':'rgba(255,255,255,.86)';c.font=`800 ${Math.round(w*.018)}px Arial`;c.textAlign='right';c.fillText('EOHEUNG · SAMSUNG LIONS WATCH PARTY',w-72,h-16);c.textAlign='left'}
    rendered=true;$('#pfDownloadBtn').disabled=false;
  }
  function download(){if(!rendered)return toast('먼저 프레임을 적용해 주세요.');const a=document.createElement('a');a.href=$('#pfCanvas').toDataURL('image/png');a.download=`eoheung_photo_frame_${fmt(selected?.game_date)||'game'}.png`;a.click()}
  function boot(){mount();setTimeout(populate,900);setTimeout(populate,1800);setInterval(()=>{if($('#photoFrame')?.classList.contains('active'))populate()},5000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();