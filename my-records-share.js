(function(){
  'use strict';
  const BLUE='#074ca1',DEEP='#003b7a',INK='#153657',MUTED='#69819b',ICE='#edf5ff';
  const FONT='Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif';
  let imageUrl=null,lastFocus=null;
  const number=(n,d=0)=>n==null?'—':Number(n).toFixed(d);
  const signed=n=>n==null?'—':(n>0?'+':'')+n;
  function rounded(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
  function text(ctx,value,x,y,size=28,color=INK,weight=600,maxWidth){
    let s=String(value??'');ctx.font=`${weight} ${size}px ${FONT}`;
    if(maxWidth){while(s.length>1&&ctx.measureText(s).width>maxWidth){s=s.slice(0,-2)+'…';}}
    ctx.fillStyle=color;ctx.fillText(s,x,y);
  }
  function line(ctx,y){ctx.beginPath();ctx.moveTo(112,y);ctx.lineTo(968,y);ctx.strokeStyle='#dfe9f4';ctx.lineWidth=2;ctx.stroke();}
  function period(filters){return [filters.year==='ALL'?'전체 시즌':filters.year+' 시즌',filters.month==='ALL'?'전체 월':filters.month+'월',({ALL:'전체 경기',REGULAR:'정규시즌',POSTSEASON:'포스트시즌',PRESEASON:'시범경기'})[filters.season]].filter(Boolean).join(' · ');}
  async function render({member,rows,filters}){
    await document.fonts.ready;
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1920;
    const c=canvas.getContext('2d');const s=EoMyRecords.summary(rows);
    c.fillStyle=ICE;c.fillRect(0,0,1080,1920);
    rounded(c,60,60,960,1800,36,'#fff');
    c.save();c.beginPath();c.roundRect(60,60,960,1800,36);c.clip();c.fillStyle=BLUE;c.fillRect(60,60,960,385);c.restore();
    text(c,'MY BASEBALL DIARY',112,129,23,'#bed9fb',800);
    text(c,member.name+'님의',112,219,56,'#fff',850,740);
    text(c,'라이온즈 직관 기록',112,287,54,'#fff',850,800);
    text(c,period(filters),112,370,25,'#d4e5ff',600,835);
    try{
      const logo=new Image();logo.src=new URL('logo/samsung.png',document.baseURI).href;await logo.decode();
      rounded(c,876,102,94,94,20,'#fff');c.drawImage(logo,884,110,78,78);
    }catch(error){text(c,'LIONS',855,147,27,'#fff',900);}
    text(c,'완료한 직관',112,510,27,MUTED,700);text(c,'내 직관 승률',574,510,27,MUTED,700);
    text(c,s.games,112,625,104,INK,900,390);text(c,s.rate==null?'—':(s.rate*100).toFixed(1)+'%',574,625,92,BLUE,900,395);
    text(c,'경기',115,674,26,MUTED);text(c,'무승부 제외',577,674,23,MUTED);
    line(c,711);
    const results=[['승리',s.wins,BLUE],['무승부',s.draws,'#7c91a8'],['패배',s.losses,'#a65065']];
    results.forEach(([label,n,color],i)=>{const x=112+i*304;text(c,label,x,768,24,MUTED);text(c,n+'회',x,826,43,color,850);});
    [['경기당 평균 득점',s.avgRs],['경기당 평균 실점',s.avgRa]].forEach(([label,n],i)=>{
      const x=112+i*440;rounded(c,x,871,416,157,18,ICE);text(c,label,x+24,916,23,MUTED,650);text(c,number(n,1),x+24,992,61,BLUE,850);
    });
    [['누적 득점',s.scored?s.rs:null],['누적 실점',s.scored?s.ra:null],['득실차',s.scored?signed(s.diff):null]].forEach(([label,n],i)=>{
      const x=112+i*304;text(c,label,x,1090,23,MUTED);text(c,n??'—',x,1150,45,INK,850);
    });
    line(c,1190);text(c,'기억에 남는 기록',112,1249,28,INK,800);
    const moments=[['홈런',s.events?.homeRuns,'개'],['탈삼진',s.events?.strikeouts,'개'],['끝내기 승리',s.events?.walkoffWins,'회'],['최다 득점',s.highRs?.value,'점'],['최다 실점',s.highRa?.value,'점'],['최장 연승',s.winStreak,'경기']];
    moments.forEach(([label,n,unit],i)=>{const x=112+(i%3)*304,y=1300+Math.floor(i/3)*102;text(c,label,x,y,21,MUTED);text(c,n==null?'—':n+unit,x,y+51,37,INK,800);});
    const coverage=s.events?`홈런·삼진 ${s.events.coverage}/${s.games} · 끝내기 ${s.events.walkoffCoverage}/${s.games}경기 확인`:'홈런·삼진·끝내기: 세부 기록 확인 중';
    text(c,coverage,112,1493,18,MUTED,500,850);line(c,1516);
    text(c,'구단별 상대 전적',112,1561,25,INK,800);
    const opponents=new Map(EoMyRecords.group(rows,g=>g.opponent).map(record=>[record.label,record]));
    ['LG','KT','SSG','KIA','두산','한화','롯데','키움','NC'].forEach((team,i)=>{
      const x=112+(i%3)*304,y=1607+Math.floor(i/3)*65,record=opponents.get(team);
      text(c,team,x,y,23,BLUE,850);
      text(c,record?.rate!=null?(record.rate*100).toFixed(0)+'%':'—',x+170,y,21,MUTED,650);
      text(c,record?`${record.wins}승 ${record.draws}무 ${record.losses}패`:'직관 기록 없음',x,y+27,20,INK,650,275);
    });
    text(c,'어흥 · SAMSUNG LIONS',112,1804,22,BLUE,850);
    const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
    text(c,date+' 기준',728,1804,19,MUTED,500);
    return {canvas,date,stats:s};
  }
  function dialog(){
    let el=document.getElementById('myRecordShareDialog');if(el)return el;
    el=document.createElement('dialog');el.id='myRecordShareDialog';el.className='my-share-dialog';el.setAttribute('aria-labelledby','myShareTitle');
    el.innerHTML='<div class="my-share-head"><div><h3 id="myShareTitle">내 직관 기록 내보내기</h3><p>인스타그램 스토리 · 세로 9:16 · 1080×1920</p></div><button type="button" class="btn secondary" data-share-close>닫기</button></div><div class="my-share-preview"><img alt="내 직관 기록 이미지 미리보기"></div><div class="my-share-actions"><span>선택한 시즌·월의 기록을 PNG로 저장합니다.</span><a class="btn" id="myShareDownload">PNG 이미지 저장</a></div>';
    document.body.appendChild(el);
    el.querySelector('[data-share-close]').addEventListener('click',()=>el.close());
    el.addEventListener('close',()=>{if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}lastFocus?.focus();});
    return el;
  }
  async function open(payload){
    lastFocus=document.activeElement;
    const {canvas,date}=await render(payload);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('이미지 생성에 실패했습니다.')),'image/png'));
    if(imageUrl)URL.revokeObjectURL(imageUrl);imageUrl=URL.createObjectURL(blob);
    const el=dialog(),link=el.querySelector('#myShareDownload');el.querySelector('img').src=imageUrl;
    link.href=imageUrl;link.download=`어흥_${String(payload.member.name).replace(/[\\/:*?"<>|]/g,'')}_${payload.filters.year==='ALL'?'전체시즌':payload.filters.year+'시즌'}_${payload.filters.month==='ALL'?'전체월':payload.filters.month+'월'}_${date}.png`;
    el.showModal();
  }
  window.EoMyRecordsShare={open,render};
})();
