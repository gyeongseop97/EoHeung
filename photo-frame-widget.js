(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const FRAME_ASSET_VERSION='frame20260616c';
  const SRC={
    '16:9|landscape':'frame/16대9가로.png',
    '16:9|portrait':'frame/16대9세로.png',
    '1:1|landscape':'frame/1대1.png',
    '1:1|portrait':'frame/1대1.png',
    '4:3|landscape':'frame/4대3가로.png',
    '4:3|portrait':'frame/4대3세로.png'
  };
  const PHOTO_BOX={
    '16:9|landscape':{ref:[1635,927],x:100,y:83,w:1435,h:670},
    '16:9|portrait':{ref:[979,1533],x:147,y:130,w:683,h:1135},
    '1:1|landscape':{ref:[1242,1245],x:142,y:78,w:958,h:925},
    '1:1|portrait':{ref:[1242,1245],x:142,y:78,w:958,h:925},
    '4:3|landscape':{ref:[1426,1072],x:110,y:80,w:1208,h:760},
    '4:3|portrait':{ref:[1074,1444],x:158,y:116,w:751,h:1057}
  };
  const TEXT_POS={
    '16:9|landscape':{ref:[1635,927],font:24,date:{x:272,y:884,w:144},opponent:{x:596,y:884,w:154},scoreHome:{x:828,y:884,w:39},scoreAway:{x:895,y:884,w:40},cheer:{x:1076,y:884,w:210},location:{x:1422,y:884,w:158}},
    '16:9|portrait':{ref:[979,1533],font:26,date:{x:281,y:1438,w:260},opponent:{x:774,y:1438,w:263},scoreHome:{x:213,y:1471,w:84},scoreAway:{x:336,y:1471,w:80},cheer:{x:699,y:1471,w:406},location:{x:553,y:1503,w:683}},
    '1:1|landscape':{ref:[1242,1245],font:22,date:{x:242,y:1188,w:95},opponent:{x:472,y:1188,w:95},scoreHome:{x:635,y:1188,w:34},scoreAway:{x:687,y:1188,w:33},cheer:{x:820,y:1188,w:162},location:{x:1064,y:1188,w:69}},
    '1:1|portrait':{ref:[1242,1245],font:22,date:{x:242,y:1188,w:95},opponent:{x:472,y:1188,w:95},scoreHome:{x:635,y:1188,w:34},scoreAway:{x:687,y:1188,w:33},cheer:{x:820,y:1188,w:162},location:{x:1064,y:1188,w:69}},
    '4:3|landscape':{ref:[1426,1072],font:23,date:{x:249,y:1015,w:115},opponent:{x:518,y:1015,w:118},scoreHome:{x:705,y:1015,w:38},scoreAway:{x:765,y:1015,w:39},cheer:{x:924,y:1015,w:196},location:{x:1228,y:1015,w:126}},
    '4:3|portrait':{ref:[1074,1444],font:25,date:{x:306,y:1333,w:276},opponent:{x:834,y:1333,w:301},scoreHome:{x:223,y:1370,w:84},scoreAway:{x:350,y:1370,w:81},cheer:{x:762,y:1370,w:439},location:{x:601,y:1406,w:745}}
  };
  let pic=null,frame=null,game=null,crop={base:1,scale:1,x:0,y:0,down:false,sx:0,sy:0,ox:0,oy:0};
  function st(){try{return typeof state!='undefined'?state:window.state}catch(e){return window.state}}
  function k(){return ($('#pfRatio')?.value||'4:3')+'|'+($('#pfOrientation')?.value||'landscape')}
  function sc(g){return {s:Number(g?.samsung_score||0),o:Number(g?.opponent_score||0)}}
  function ids(){let s=st(),r=new Set;(s?.gameMembers||[]).forEach(e=>{if(e&&(e.attended||e.planned))r.add(String(e.game_id))});return r}
  function games(){let s=st(),r=ids();return(s?.games||[]).filter(g=>r.has(String(g.id))).sort((a,b)=>String(b.game_date||'').localeCompare(String(a.game_date||'')))}
  function gtxt(g){let a=sc(g);return g?.status=='FINISHED'?`삼성 ${a.s} VS ${a.o} ${g.opponent||''}`:`삼성 VS ${g?.opponent||''}`}
  function scaleRect(r,w,h){let sx=w/r.ref[0],sy=h/r.ref[1];return{x:r.x*sx,y:r.y*sy,w:r.w*sx,h:r.h*sy}}
  function box(w,h){return scaleRect(PHOTO_BOX[k()]||PHOTO_BOX['4:3|landscape'],w,h)}
  function textCfg(w,h){let cfg=TEXT_POS[k()]||TEXT_POS['4:3|landscape'],sx=w/cfg.ref[0],sy=h/cfg.ref[1],out={font:Math.round(cfg.font*Math.min(sx,sy))};['date','opponent','scoreHome','scoreAway','cheer','location'].forEach(n=>{let p=cfg[n];out[n]={x:p.x*sx,y:p.y*sy,w:p.w*sx}});return out}
  function loadImg(src){return new Promise((ok,no)=>{let i=new Image;i.onload=()=>ok(i);i.onerror=no;const sep=src.includes('?')?'&':'?';i.src=encodeURI(src)+sep+'v='+FRAME_ASSET_VERSION+'&t='+(Date.now())})}
  function read(f){return new Promise((ok,no)=>{let i=new Image,r=new FileReader;i.onload=()=>ok(i);i.onerror=no;r.onload=e=>i.src=e.target.result;r.onerror=no;r.readAsDataURL(f)})}
  async function lf(){frame=await loadImg(SRC[k()]||SRC['4:3|landscape']);return frame}
  function reset(){if(!pic||!frame)return;let b=box(frame.naturalWidth,frame.naturalHeight);crop.base=Math.max(b.w/pic.width,b.h/pic.height);crop.scale=1;crop.x=0;crop.y=0}
  function isLandscapeFrame(){return ($('#pfOrientation')?.value||'landscape')==='landscape'}
  function fit(c,t,x,y,max,fs){t=String(t??'').trim();if(!t)return;c.save();c.fillStyle='#061f68';c.textAlign='center';c.textBaseline='bottom';c.lineJoin='round';c.miterLimit=2;do{c.font=`900 ${fs}px "Noto Sans KR", Arial, sans-serif`;if(c.measureText(t).width<=max)break;fs--}while(fs>9);c.strokeStyle='rgba(255,255,255,.82)';c.lineWidth=Math.max(2,Math.round(fs*.13));c.strokeText(t,x,y);c.fillText(t,x,y);c.restore()}
  function gameTexts(){let a=sc(game),finished=game?.status=='FINISHED';return{date:String(game?.game_date||'').slice(0,10),opponent:game?.opponent||'',scoreHome:finished?String(a.s):'',scoreAway:finished?String(a.o):'',location:game?.stadium||'라이온즈파크',cheer:($('#pfCheerText')?.value||'').trim()}}
  function drawText(c,w,h){let cfg=textCfg(w,h),t=gameTexts(),fs=cfg.font;fit(c,t.date,cfg.date.x,cfg.date.y,cfg.date.w,fs);fit(c,t.opponent,cfg.opponent.x,cfg.opponent.y,cfg.opponent.w,fs);fit(c,t.scoreHome,cfg.scoreHome.x,cfg.scoreHome.y,cfg.scoreHome.w,fs);fit(c,t.scoreAway,cfg.scoreAway.x,cfg.scoreAway.y,cfg.scoreAway.w,fs);fit(c,t.cheer,cfg.cheer.x,cfg.cheer.y,cfg.cheer.w,Math.round(fs*.92));fit(c,t.location,cfg.location.x,cfg.location.y,cfg.location.w,fs)}
  async function draw(){if(!game||!pic)return;await lf();let cn=$('#pfCanvas'),c=cn.getContext('2d'),w=frame.naturalWidth,h=frame.naturalHeight,b=box(w,h);cn.width=w;cn.height=h;let z=(crop.base||Math.max(b.w/pic.width,b.h/pic.height))*crop.scale,dw=pic.width*z,dh=pic.height*z;c.clearRect(0,0,w,h);if(isLandscapeFrame()){c.drawImage(pic,b.x+(b.w-dw)/2+crop.x,b.y+(b.h-dh)/2+crop.y,dw,dh)}else{c.save();c.beginPath();c.rect(b.x,b.y,b.w,b.h);c.clip();c.drawImage(pic,b.x+(b.w-dw)/2+crop.x,b.y+(b.h-dh)/2+crop.y,dw,dh);c.restore()}c.drawImage(frame,0,0,w,h);drawText(c,w,h);$('#pfDownloadBtn').disabled=false}
  function style(){if($('#photoFrameWidgetStyle'))return;let s=document.createElement('style');s.id='photoFrameWidgetStyle';s.textContent='.photo-frame-grid{display:grid;grid-template-columns:420px 1fr;gap:18px}.photo-frame-panel,.pf-preview{padding:20px}.pf-form{display:grid;gap:12px}.pf-row-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pf-field{display:grid;gap:7px}.pf-field select,.pf-field input{border:1px solid #dce5f2;border-radius:12px;padding:10px}.pf-help{font-size:12px;color:#64748b;line-height:1.45;margin-top:-3px}.pf-canvas{width:100%;background:transparent;border-radius:14px;cursor:grab}.pf-canvas-wrap{background:#eef5ff;border:1px solid #dbe7f5;border-radius:18px;padding:16px;overflow:auto}.pf-actions{display:flex;gap:8px}';document.head.appendChild(s)}
  function mount(){if($('#photoFrame'))return;style();let nav=$('.nav');if(nav&&!$('#photoFrameNavBtn')){let b=document.createElement('button');b.id='photoFrameNavBtn';b.textContent='🖼️ 포토프레임';b.onclick=open;nav.appendChild(b)}let main=$('.main');if(!main)return;let sec=document.createElement('section');sec.id='photoFrame';sec.className='section';sec.innerHTML='<div class="photo-frame-grid"><div class="card photo-frame-panel"><h3>포토프레임 만들기</h3><div class="pf-form"><div class="pf-field"><label>직관 날짜</label><select id="pfGameSelect"></select></div><div class="pf-row-2"><div class="pf-field"><label>사진 비율</label><select id="pfRatio"><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="1:1">1:1</option></select></div><div class="pf-field"><label>사진 방향</label><select id="pfOrientation"><option value="landscape">가로</option><option value="portrait">세로</option></select></div></div><div class="pf-field"><label>응원 문구</label><input id="pfCheerText" type="text" maxlength="30" placeholder="예: 오늘도 삼성 승리! / 라팍 직관 완료"><div class="pf-help">프레임 하단 SCORE 옆의 제목 없는 빈줄에 표시됩니다.</div></div><div class="pf-field"><label>사진 업로드</label><input id="pfPhoto" type="file" accept="image/*"></div><div class="pf-actions"><button class="btn" id="pfRenderBtn">프레임 적용</button><button class="btn secondary" id="pfDownloadBtn" disabled>다운로드</button></div></div></div><div class="card pf-preview"><h3>미리보기</h3><div class="pf-canvas-wrap"><canvas id="pfCanvas" class="pf-canvas"></canvas></div></div></div>';main.appendChild(sec);bind();pop();lf().then(i=>{let cn=$('#pfCanvas');cn.width=i.naturalWidth;cn.height=i.naturalHeight;cn.getContext('2d').drawImage(i,0,0)})}
  function open(){$$('.section').forEach(s=>s.classList.remove('active'));$('#photoFrame').classList.add('active');pop()}
  function pop(){let sel=$('#pfGameSelect');if(!sel)return;let gs=games();sel.innerHTML=gs.map(g=>`<option value="${g.id}">${String(g.game_date||'').slice(0,10)} · ${gtxt(g)}</option>`).join('');if(gs[0]&&!game){game=gs[0];sel.value=String(game.id)}}
  function bind(){document.addEventListener('input',e=>{if(e.target.id=='pfCheerText'&&pic)draw()},true);document.addEventListener('change',async e=>{if(e.target.id=='pfGameSelect'){game=games().find(g=>String(g.id)==e.target.value)||game;draw()}if(e.target.id=='pfPhoto'){let f=e.target.files[0];if(f){pic=await read(f);await lf();reset();draw()}}if(e.target.id=='pfRatio'||e.target.id=='pfOrientation'){await lf();if(pic)reset();pic?draw():mount()}},true);document.addEventListener('click',e=>{if(e.target.closest('#pfRenderBtn'))draw();if(e.target.closest('#pfDownloadBtn')){let a=document.createElement('a');a.href=$('#pfCanvas').toDataURL('image/png');a.download='eoheung_photo_frame.png';a.click()}},true);document.addEventListener('mousedown',e=>{if(!e.target.closest('#pfCanvas')||!pic)return;crop.down=true;crop.sx=e.clientX;crop.sy=e.clientY;crop.ox=crop.x;crop.oy=crop.y},true);window.addEventListener('mousemove',e=>{if(!crop.down||!pic)return;let cn=$('#pfCanvas'),r=cn.getBoundingClientRect();crop.x=crop.ox+(e.clientX-crop.sx)*(cn.width/r.width);crop.y=crop.oy+(e.clientY-crop.sy)*(cn.height/r.height);draw()});window.addEventListener('mouseup',()=>crop.down=false)}
  if(document.readyState=='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();