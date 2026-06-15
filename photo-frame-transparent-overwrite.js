(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const SRC={
    '16:9|landscape':'frame/16대9가로.png','16:9|portrait':'frame/16대9세로.png',
    '1:1|landscape':'frame/1대1.png','1:1|portrait':'frame/1대1.png',
    '4:3|landscape':'frame/4대3가로.png','4:3|portrait':'frame/4대3세로.png'
  };
  const BOX={
    '16:9|landscape':[.096,.083,.807,.698], '16:9|portrait':[.159,.084,.675,.694],
    '1:1|landscape':[.129,.076,.742,.710], '1:1|portrait':[.129,.076,.742,.710],
    '4:3|landscape':[.104,.076,.794,.666], '4:3|portrait':[.145,.083,.681,.710]
  };
  let photo=null,frame=null,crop={base:1,scale:1,x:0,y:0,drag:false,sx:0,sy:0,ox:0,oy:0};
  function key(){return ($('#pfRatio')?.value||'4:3')+'|'+($('#pfOrientation')?.value||'landscape')}
  function stateObj(){try{return typeof state!=='undefined'?state:window.state}catch(e){return window.state}}
  function game(){const s=stateObj(),id=$('#pfGameSelect')?.value;return (s?.games||[]).find(g=>String(g.id)===String(id))||null}
  function readPhoto(){return new Promise((ok,fail)=>{const f=$('#pfPhoto')?.files?.[0];if(!f)return ok(null);const img=new Image();img.onload=()=>ok(img);img.onerror=fail;const r=new FileReader();r.onload=e=>img.src=e.target.result;r.onerror=fail;r.readAsDataURL(f)})}
  function loadFrame(){return new Promise((ok,fail)=>{const img=new Image();img.onload=()=>ok(img);img.onerror=fail;img.src=encodeURI(SRC[key()]||SRC['4:3|landscape'])+'?v=real2'})}
  function score(g){return {s:Number(g?.samsung_score||0),o:Number(g?.opponent_score||0)}}
  function result(g){if(!g||g.status!=='FINISHED')return'GAME DAY';if(g.result==='W')return'WIN';if(g.result==='L')return'LOSE';if(g.result==='D')return'DRAW';const s=score(g);return s.s>s.o?'WIN':s.s<s.o?'LOSE':'DRAW'}
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function box(w,h){const b=BOX[key()]||BOX['4:3|landscape'];return {x:b[0]*w,y:b[1]*h,w:b[2]*w,h:b[3]*h}}
  function reset(){if(!photo||!frame)return;const b=box(frame.naturalWidth,frame.naturalHeight);crop.base=Math.max(b.w/photo.width,b.h/photo.height);crop.scale=1;crop.x=0;crop.y=0}
  function fit(c,text,x,y,max,fs){c.fillStyle='#061f68';c.textAlign='center';c.textBaseline='middle';do{c.font='900 '+fs+'px Pretendard, Arial';if(c.measureText(text).width<=max)break;fs--}while(fs>10);c.fillText(text,x,y)}
  async function draw(){
    const cn=$('#pfCanvas'),g=game();if(!cn||!g)return;
    if(!photo)photo=await readPhoto();if(!photo)return;
    frame=await loadFrame();const w=frame.naturalWidth,h=frame.naturalHeight,c=cn.getContext('2d');cn.width=w;cn.height=h;if(!crop.base)reset();
    const b=box(w,h),sc=(crop.base||Math.max(b.w/photo.width,b.h/photo.height))*crop.scale,dw=photo.width*sc,dh=photo.height*sc;
    c.clearRect(0,0,w,h);c.save();rr(c,b.x,b.y,b.w,b.h,18);c.clip();c.drawImage(photo,b.x+(b.w-dw)/2+crop.x,b.y+(b.h-dh)/2+crop.y,dw,dh);c.restore();c.drawImage(frame,0,0,w,h);
    const s=score(g),txt=(g.game_date||'').slice(0,10)+'   '+(g.opponent||'')+'   '+s.s+' : '+s.o+'   '+result(g)+'   '+(g.stadium||'라이온즈파크');
    fit(c,txt,w/2,h*.94,w*.86,Math.round(w*.018));
    const dl=$('#pfDownloadBtn');if(dl)dl.disabled=false;
  }
  function bind(){if(window.__eoTransparentFrameOverwrite)return;window.__eoTransparentFrameOverwrite=true;document.addEventListener('change',e=>{if(e.target.id==='pfPhoto'){photo=null;crop.base=0;setTimeout(draw,80)}if(['pfRatio','pfOrientation','pfGameSelect'].includes(e.target.id)){crop.base=0;setTimeout(draw,120)}},true);document.addEventListener('click',e=>{if(e.target.closest('#pfRenderBtn'))setTimeout(draw,120);if(e.target.closest('#pfZoomInBtn')){crop.scale=Math.min(3.5,crop.scale+.1);draw()}if(e.target.closest('#pfZoomOutBtn')){crop.scale=Math.max(1,crop.scale-.1);draw()}if(e.target.closest('#pfResetCropBtn')){reset();draw()}},true);document.addEventListener('mousedown',e=>{if(!e.target.closest('#pfCanvas')||!photo)return;crop.drag=true;crop.sx=e.clientX;crop.sy=e.clientY;crop.ox=crop.x;crop.oy=crop.y},true);window.addEventListener('mousemove',e=>{if(!crop.drag||!photo)return;const cn=$('#pfCanvas'),r=cn.getBoundingClientRect();crop.x=crop.ox+(e.clientX-crop.sx)*(cn.width/r.width);crop.y=crop.oy+(e.clientY-crop.sy)*(cn.height/r.height);draw()});window.addEventListener('mouseup',()=>crop.drag=false);document.addEventListener('wheel',e=>{if(!e.target.closest('#pfCanvas')||!photo)return;e.preventDefault();crop.scale=Math.max(1,Math.min(3.5,crop.scale+(e.deltaY<0?.08:-.08)));draw()},{passive:false})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();