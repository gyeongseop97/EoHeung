(function(){
  const CARD_ID='ticketlinkServerClockCard';
  const STYLE_ID='ticketlinkClockFixStyle';
  const ENDPOINTS=[
    'https://chaddxsntnokjjcrwiyb.supabase.co/functions/v1/ticketlink-time',
    'https://www.ticketlink.co.kr/'
  ];
  const SAMPLES=8;
  const GAP=80;
  let best=null;
  let timer=null;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const pad=n=>String(n).padStart(2,'0');
  const fmt=d=>`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3,'0')}`;

  function injectStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${CARD_ID}{position:relative;overflow:hidden;min-height:120px;display:flex;flex-direction:column;justify-content:space-between}
      #${CARD_ID} .tl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
      #${CARD_ID} .tl-title{font-size:16px;font-weight:950;color:#0f172a;letter-spacing:-.03em}
      #${CARD_ID} .tl-time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:42px;font-weight:950;letter-spacing:-.06em;line-height:1;color:#041e42;margin:8px 0}
      #${CARD_ID} .tl-meta{font-size:12px;color:#64748b;font-weight:800;line-height:1.45}
      #${CARD_ID} .tl-sync{border:0;border-radius:10px;background:#eef4ff;color:#074ca1;padding:7px 10px;font-size:12px;font-weight:900;cursor:pointer}
      #${CARD_ID} .tl-good{color:#047857!important}.tl-warn{color:#c2410c!important}.tl-error{color:#be123c!important}
      body.theme-excel #${CARD_ID}{border-radius:2px!important}body.theme-excel #${CARD_ID} .tl-time{color:#185c37}body.theme-excel #${CARD_ID} .tl-sync{border-radius:2px;background:#e2f0d9;color:#185c37;border:1px solid #70ad47}
      body.theme-groupware #${CARD_ID}{border-radius:0!important}body.theme-groupware #${CARD_ID} .tl-time{color:#174ea6}body.theme-groupware #${CARD_ID} .tl-sync{border-radius:2px;background:#eaf3ff;color:#174ea6;border:1px solid #c7d8ea}
      @media(max-width:900px){#${CARD_ID} .tl-time{font-size:34px}}
    `;
    document.head.appendChild(s);
  }

  function findOrCreateCard(){
    injectStyle();
    let card=document.getElementById(CARD_ID);
    if(card)return card;
    const links=document.getElementById('linkList');
    if(!links)return null;
    card=document.createElement('div');
    card.id=CARD_ID;
    card.className='card pad';
    links.prepend(card);
    return card;
  }

  function render(status='측정 중...', cls=''){
    const card=findOrCreateCard();
    if(!card)return;
    const time=best&&best.serverTime?fmt(new Date(best.serverTime+(Date.now()-best.clientAt))):'--:--:--.---';
    const rtt=best?`최저 RTT ${best.rtt}ms${best.rtt>100?' · 지연 높음':''}`:status;
    const mode=best?(best.rtt<=100?'tl-good':'tl-warn'):cls;
    card.innerHTML=`<div class="tl-head"><div class="tl-title">Ticketlink 서버 시간</div><button class="tl-sync" data-tl-sync>동기화</button></div><div class="tl-time">${time}</div><div class="tl-meta ${mode}">Ticketlink 서버 기준 · ${rtt}</div>`;
  }

  async function sample(url){
    const started=performance.now();
    try{
      const res=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(),{method:url.includes('/functions/')?'GET':'HEAD',cache:'no-store',mode:'cors'});
      const ended=performance.now();
      const rtt=Math.round(ended-started);
      let serverMs=0;
      try{
        const ct=res.headers.get('content-type')||'';
        if(ct.includes('application/json')){
          const j=await res.clone().json();
          serverMs=Number(j.serverTime||j.server_time||j.timestamp||j.now||0)||0;
        }
      }catch(e){}
      if(!serverMs){
        const d=res.headers.get('date');
        if(d)serverMs=new Date(d).getTime();
      }
      if(!serverMs)return null;
      return {rtt,serverTime:serverMs+rtt/2,clientAt:Date.now(),url};
    }catch(e){return null;}
  }

  async function sync(){
    render('측정 중...','');
    let local=null;
    for(let i=0;i<SAMPLES;i++){
      for(const url of ENDPOINTS){
        const s=await sample(url);
        if(s&&(!local||s.rtt<local.rtt)){local=s;best=s;render();}
        if(local&&local.rtt<=100)break;
      }
      if(local&&local.rtt<=100)break;
      await sleep(GAP);
    }
    if(!best)render('측정 실패','tl-error');
  }

  function boot(){
    findOrCreateCard();
    sync();
    if(timer)clearInterval(timer);
    timer=setInterval(render,100);
    document.body.addEventListener('click',e=>{if(e.target.closest('[data-tl-sync]'))sync();},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  setInterval(()=>{if(document.getElementById('links')?.classList.contains('active'))findOrCreateCard();},1000);
})();
