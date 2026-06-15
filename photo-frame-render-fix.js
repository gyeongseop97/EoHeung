(function(){
  const $=(s,r=document)=>r.querySelector(s);
  const META={
    '16:9|landscape':{w:1672,h:941,photo:[160,78,1350,657],date:[250,881,210,28],opponent:[582,881,210,28],score:[922,881,150,28],result:[1165,881,190,28],location:[1440,881,170,28]},
    '16:9|portrait':{w:941,h:1672,photo:[150,140,635,1160],date:[260,1537,300,30],opponent:[685,1537,280,30],score:[250,1594,180,30],result:[660,1594,300,30],location:[450,1638,720,30]},
    '1:1|landscape':{w:1254,h:1254,photo:[162,95,930,890],date:[245,1188,150,24],opponent:[485,1188,145,24],score:[675,1188,100,24],result:[885,1188,120,24],location:[1110,1188,140,24]},
    '1:1|portrait':{w:1254,h:1254,photo:[162,95,930,890],date:[245,1188,150,24],opponent:[485,1188,145,24],score:[675,1188,100,24],result:[885,1188,120,24],location:[1110,1188,140,24]},
    '4:3|landscape':{w:1448,h:1086,photo:[150,82,1150,723],date:[250,1017,150,26],opponent:[525,1017,170,26],score:[760,1017,100,26],result:[1015,1017,170,26],location:[1235,1017,160,26]},
    '4:3|portrait':{w:1086,h:1448,photo:[158,120,740,1028],date:[280,1335,260,28],opponent:[735,1335,280,28],score:[280,1388,180,28],result:[730,1388,300,28],location:[500,1423,720,28]}
  };
  let bg=null,img=null,crop={base:1,scale:1,x:0,y:0,drag:false,sx:0,sy:0,ox:0,oy:0};
  function key(){return ($('#pfRatio')?.value||'4:3')+'|'+($('#pfOrientation')?.value||'landscape')}
  function meta(){return META[key()]||META['4:3|landscape']}
  function st(){try{return typeof state!=='undefined'?state:(window.state||null)}catch(e){return window.state||null}}
  function game(){const s=st(),id=$('#pfGameSelect')?.value;if(!s||!id)return null;return (s.games||[]).find(g=>String(g.id)===String(id))||null}
  function score(g){return {s:Number(g?.samsung_score??0),o:Number(g?.opponent_score??0)}}
  function result(g){if(!g||g.status!=='FINISHED')return'GAME DAY';if(g.result==='W')return'WIN';if(g.result==='L')return'LOSE';if(g.result==='D')return'DRAW';const a=score(g);return a.s>a.o?'WIN':a.s<a.o?'LOSE':'DRAW'}
  function date(g){return String(g?.game_date||'').slice(0,10)}
  function phrase(){if(!$('#pfUsePhrase')?.checked)return'';return $('#pfPhrase')?.value==='custom'?($('#pfCustomPhrase')?.value||'').trim():($('#pfPhrase')?.value||'')}
  function readFile(){return new Promise((resolve,reject)=>{const f=$('#pfPhoto')?.files?.[0];if(!f)return resolve(null);const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;const r=new FileReader();r.onload=e=>im.src=e.target.result;r.onerror=reject;r.readAsDataURL(f)})}
  function loadDataUrl(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>resolve(im);im.src=src})}
  function fit(ctx,text,box,size,weight=900){let fs=size;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#061f68';do{ctx.font=`${weight} ${fs}px Pretendard, Arial`;if(ctx.measureText(text).width<=box[2])break;fs--}while(fs>10);ctx.fillText(text,box[0],box[1])}
  function drawPhoto(ctx,im,b){const sc=(crop.base||Math.max(b[2]/im.width,b[3]/im.height))*crop.scale,dw=im.width*sc,dh=im.height*sc;ctx.save();ctx.beginPath();ctx.rect(b[0],b[1],b[2],b[3]);ctx.clip();ctx.drawImage(im,b[0]+(b[2]-dw)/2+crop.x,b[1]+(b[3]-dh)/2+crop.y,dw,dh);ctx.restore()}
  function resetCrop(){if(!img)return;const b=meta().photo;crop.base=Math.max(b[2]/img.width,b[3]/img.height);crop.scale=1;crop.x=0;crop.y=0}
  async function captureAndDraw(){
    const cn=$('#pfCanvas'),g=game();if(!cn||!g)return;
    img=await readFile();if(!img)return;
    const m=meta(); if(cn.width!==m.w||cn.height!==m.h){cn.width=m.w;cn.height=m.h}
    await new Promise(r=>setTimeout(r,450));
    bg=await loadDataUrl(cn.toDataURL('image/png'));
    resetCrop();
    draw();
    const dl=$('#pfDownloadBtn');if(dl)dl.disabled=false;
  }
  function draw(){
    const cn=$('#pfCanvas'),g=game();if(!cn||!g||!img||!bg)return;const m=meta(),ctx=cn.getContext('2d'),b=m.photo,sc=score(g),ph=phrase();
    ctx.clearRect(0,0,cn.width,cn.height);
    ctx.drawImage(bg,0,0,cn.width,cn.height);
    drawPhoto(ctx,img,b);
    // 프레임 이미지가 사진 영역을 하얗게 덮는 구조라 사진을 위에 다시 얹고 텍스트를 재기입합니다.
    fit(ctx,date(g),m.date,Math.round(cn.width*.02));
    fit(ctx,g.opponent||'',m.opponent,Math.round(cn.width*.02));
    fit(ctx,`${sc.s} : ${sc.o}`,m.score,Math.round(cn.width*.023));
    fit(ctx,result(g)+(ph?' · '+ph:''),m.result,Math.round(cn.width*.018));
    fit(ctx,g.stadium||'라이온즈파크',m.location,Math.round(cn.width*.018));
  }
  function bind(){
    if(window.__eoPhotoFrameRenderFix)return;window.__eoPhotoFrameRenderFix=true;
    document.addEventListener('click',e=>{if(e.target.closest('#pfRenderBtn'))setTimeout(captureAndDraw,80)},true);
    document.addEventListener('change',e=>{if(e.target.closest('#pfRatio,#pfOrientation,#pfGameSelect,#pfPhrase,#pfUsePhrase,#pfUseWatermark')){bg=null;img=null}},true);
    document.addEventListener('mousedown',e=>{const cn=e.target.closest('#pfCanvas');if(!cn||!img)return;crop.drag=true;crop.sx=e.clientX;crop.sy=e.clientY;crop.ox=crop.x;crop.oy=crop.y});
    window.addEventListener('mousemove',e=>{if(!crop.drag||!img)return;const cn=$('#pfCanvas'),r=cn.getBoundingClientRect();crop.x=crop.ox+(e.clientX-crop.sx)*(cn.width/r.width);crop.y=crop.oy+(e.clientY-crop.sy)*(cn.height/r.height);draw()});
    window.addEventListener('mouseup',()=>crop.drag=false);
    document.addEventListener('wheel',e=>{if(!e.target.closest('#pfCanvas')||!img)return;e.preventDefault();crop.scale=Math.max(1,Math.min(3.5,crop.scale+(e.deltaY<0?.08:-.08)));draw()},{passive:false});
    document.addEventListener('click',e=>{if(e.target.closest('#pfZoomInBtn')){crop.scale=Math.min(3.5,crop.scale+.1);draw()}if(e.target.closest('#pfZoomOutBtn')){crop.scale=Math.max(1,crop.scale-.1);draw()}if(e.target.closest('#pfResetCropBtn')){resetCrop();draw()}},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();