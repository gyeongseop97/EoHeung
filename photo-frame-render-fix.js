(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const META={
    '16:9|landscape':{w:1672,h:941},'16:9|portrait':{w:941,h:1672},'1:1|landscape':{w:1254,h:1254},'1:1|portrait':{w:1254,h:1254},'4:3|landscape':{w:1448,h:1086},'4:3|portrait':{w:1086,h:1448}
  };
  let img=null,crop={base:1,scale:1,x:0,y:0,drag:false,sx:0,sy:0,ox:0,oy:0};
  function key(){return ($('#pfRatio')?.value||'4:3')+'|'+($('#pfOrientation')?.value||'landscape')}
  function meta(){return META[key()]||META['4:3|landscape']}
  function st(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(e){return window.state||null}}
  function game(){const s=st(),id=$('#pfGameSelect')?.value;if(!s||!id)return null;return (s.games||[]).find(g=>String(g.id)===String(id))||null}
  function score(g){return {s:Number(g?.samsung_score??0),o:Number(g?.opponent_score??0)}}
  function result(g){if(!g||g.status!=='FINISHED')return'GAME DAY';if(g.result==='W')return'WIN';if(g.result==='L')return'LOSE';if(g.result==='D')return'DRAW';const a=score(g);return a.s>a.o?'WIN':a.s<a.o?'LOSE':'DRAW'}
  function date(g){return String(g?.game_date||'').slice(0,10)}
  function phrase(){if(!$('#pfUsePhrase')?.checked)return'';return $('#pfPhrase')?.value==='custom'?($('#pfCustomPhrase')?.value||'').trim():($('#pfPhrase')?.value||'')}
  function readFile(){return new Promise((resolve,reject)=>{const f=$('#pfPhoto')?.files?.[0];if(!f)return resolve(null);const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;const r=new FileReader();r.onload=e=>im.src=e.target.result;r.onerror=reject;r.readAsDataURL(f)})}
  function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
  function fit(c,text,x,y,max,size,align='center'){let fs=size;c.textAlign=align;c.textBaseline='middle';c.fillStyle='#061f68';do{c.font=`900 ${fs}px Pretendard, Arial`;if(c.measureText(text).width<=max)break;fs--}while(fs>11);c.fillText(text,x,y)}
  function photoBox(w,h){return {x:Math.round(w*.095),y:Math.round(h*.085),w:Math.round(w*.81),h:Math.round(h*.68)}}
  function reset(){if(!img)return;const b=photoBox(meta().w,meta().h);crop.base=Math.max(b.w/img.width,b.h/img.height);crop.scale=1;crop.x=0;crop.y=0}
  function drawPhoto(c,b){const sc=(crop.base||Math.max(b.w/img.width,b.h/img.height))*crop.scale,dw=img.width*sc,dh=img.height*sc;c.save();rr(c,b.x,b.y,b.w,b.h,28);c.clip();c.drawImage(img,b.x+(b.w-dw)/2+crop.x,b.y+(b.h-dh)/2+crop.y,dw,dh);c.restore()}
  function draw(){
    const cn=$('#pfCanvas'),g=game();if(!cn||!g||!img)return;const m=meta(),w=m.w,h=m.h,c=cn.getContext('2d'),b=photoBox(w,h),sc=score(g),rs=result(g),ph=phrase();
    if(cn.width!==w)cn.width=w;if(cn.height!==h)cn.height=h;
    c.clearRect(0,0,w,h);c.fillStyle='#f7fbff';c.fillRect(0,0,w,h);
    const grad=c.createLinearGradient(0,0,w,h);grad.addColorStop(0,'#003b86');grad.addColorStop(.58,'#0b61c9');grad.addColorStop(1,'#001f5c');c.fillStyle=grad;rr(c,18,18,w-36,h-36,36);c.fill();
    c.fillStyle='#ffffff';rr(c,b.x-24,b.y-24,b.w+48,b.h+48,34);c.fill();
    c.strokeStyle='#ffd34d';c.lineWidth=Math.max(7,w*.004);rr(c,b.x-12,b.y-12,b.w+24,b.h+24,28);c.stroke();
    drawPhoto(c,b);
    c.save();c.globalAlpha=.08;c.fillStyle='#fff';for(let i=-w;i<w*2;i+=90){c.fillRect(i,0,24,h)}c.restore();
    const bottomY=b.y+b.h+Math.round(h*.055);c.fillStyle='#fff';rr(c,Math.round(w*.055),bottomY,Math.round(w*.89),Math.round(h*.21),28);c.fill();
    c.fillStyle='#061f68';c.font=`900 ${Math.round(w*.045)}px Pretendard, Arial`;c.textAlign='center';c.textBaseline='middle';c.fillText('LIONS GAME DAY',w/2,Math.round(h*.055));
    c.fillStyle='#074ca1';c.font=`900 ${Math.round(w*.052)}px Pretendard, Arial`;c.textAlign='center';c.fillText(`삼성 ${sc.s} VS ${sc.o} ${g.opponent||''}`,w/2,bottomY+Math.round(h*.07));
    c.fillStyle=rs==='WIN'?'#16a34a':rs==='LOSE'?'#be123c':'#475569';rr(c,w/2-Math.round(w*.11),bottomY+Math.round(h*.112),Math.round(w*.22),Math.round(h*.052),16);c.fill();
    c.fillStyle='#fff';c.font=`900 ${Math.round(w*.027)}px Pretendard, Arial`;c.fillText(rs,w/2,bottomY+Math.round(h*.138));
    fit(c,date(g),Math.round(w*.15),bottomY+Math.round(h*.18),Math.round(w*.18),Math.round(w*.022));
    fit(c,g.stadium||'라이온즈파크',Math.round(w*.5),bottomY+Math.round(h*.18),Math.round(w*.35),Math.round(w*.02));
    if(ph)fit(c,ph,Math.round(w*.82),bottomY+Math.round(h*.18),Math.round(w*.22),Math.round(w*.02));
    if($('#pfUseWatermark')?.checked){c.save();c.globalAlpha=.16;c.fillStyle='#fff';c.font=`900 ${Math.round(w*.035)}px Arial`;c.textAlign='right';c.fillText('EOHEUNG',w-46,h-36);c.restore()}
    const dl=$('#pfDownloadBtn');if(dl)dl.disabled=false;
  }
  async function loadAndDraw(){const im=await readFile();if(!im)return;img=im;reset();draw()}
  function bind(){if(window.__eoPhotoFrameFallback2)return;window.__eoPhotoFrameFallback2=true;document.addEventListener('change',e=>{if(e.target.closest('#pfPhoto'))setTimeout(loadAndDraw,80);if(e.target.closest('#pfRatio,#pfOrientation,#pfGameSelect,#pfPhrase,#pfUsePhrase,#pfUseWatermark'))setTimeout(()=>{if(img){reset();draw()}},120)},true);document.addEventListener('click',e=>{if(e.target.closest('#pfRenderBtn'))setTimeout(loadAndDraw,120);if(e.target.closest('#pfZoomInBtn')){crop.scale=Math.min(3.5,crop.scale+.1);draw()}if(e.target.closest('#pfZoomOutBtn')){crop.scale=Math.max(1,crop.scale-.1);draw()}if(e.target.closest('#pfResetCropBtn')){reset();draw()}},true);document.addEventListener('mousedown',e=>{if(!e.target.closest('#pfCanvas')||!img)return;crop.drag=true;crop.sx=e.clientX;crop.sy=e.clientY;crop.ox=crop.x;crop.oy=crop.y},true);window.addEventListener('mousemove',e=>{if(!crop.drag||!img)return;const cn=$('#pfCanvas'),r=cn.getBoundingClientRect();crop.x=crop.ox+(e.clientX-crop.sx)*(cn.width/r.width);crop.y=crop.oy+(e.clientY-crop.sy)*(cn.height/r.height);draw()});window.addEventListener('mouseup',()=>crop.drag=false);document.addEventListener('wheel',e=>{if(!e.target.closest('#pfCanvas')||!img)return;e.preventDefault();crop.scale=Math.max(1,Math.min(3.5,crop.scale+(e.deltaY<0?.08:-.08)));draw()},{passive:false});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();