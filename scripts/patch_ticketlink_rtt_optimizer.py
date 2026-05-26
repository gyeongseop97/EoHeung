from pathlib import Path

patch_file = Path('eoheung-member-logo-patch.js')
text = patch_file.read_text(encoding='utf-8')
start = '/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_START */'
end = '/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_END */'

block = r'''
/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_START */
(function(){
  const TARGET_RTT = 100;
  const SAMPLE_COUNT = 10;
  const SAMPLE_GAP_MS = 90;
  const EDGE_URL = 'https://chaddxsntnokjjcrwiyb.supabase.co/functions/v1/ticketlink-time';
  const FALLBACK_URLS = [EDGE_URL, 'https://www.ticketlink.co.kr/'];
  let bestSample = null;
  let syncing = false;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const nowMs = () => Date.now();

  function findTicketlinkStatusNodes(){
    const nodes = Array.from(document.querySelectorAll('span,p,small,div'));
    return nodes.filter(el => {
      const txt = (el.textContent || '').trim();
      if(!txt) return false;
      return /Ticketlink|티켓링크|RTT\s*\d+ms|서버 기준/.test(txt) && txt.length < 160;
    });
  }

  function setStatus(text, mode='info'){
    const nodes = findTicketlinkStatusNodes();
    const target = nodes.find(el => /RTT|서버 기준/.test(el.textContent || '')) || nodes[nodes.length - 1];
    if(target){
      target.textContent = text;
      target.dataset.rttMode = mode;
      target.style.fontWeight = '700';
      target.style.color = mode === 'good' ? '#047857' : mode === 'warn' ? '#c2410c' : mode === 'error' ? '#be123c' : '#64748b';
    }
  }

  function showBest(){
    if(!bestSample) return;
    const mode = bestSample.rtt <= TARGET_RTT ? 'good' : 'warn';
    const suffix = bestSample.rtt <= TARGET_RTT ? '' : ' · 지연 높음';
    setStatus(`Ticketlink 서버 기준 · 최저 RTT ${bestSample.rtt}ms${suffix}`, mode);
  }

  async function requestSample(url){
    const start = performance.now();
    try{
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
        method: url === EDGE_URL ? 'GET' : 'HEAD',
        cache: 'no-store',
        mode: 'cors'
      });
      const end = performance.now();
      const rtt = Math.round(end - start);
      let serverDate = null;
      let serverTs = null;
      try{
        const ct = res.headers.get('content-type') || '';
        if(ct.includes('application/json')){
          const json = await res.clone().json();
          serverTs = Number(json.serverTime || json.server_time || json.timestamp || json.now || 0) || null;
          serverDate = json.date || json.serverDate || json.server_date || null;
        }
      }catch(e){}
      serverDate = serverDate || res.headers.get('date');
      const parsed = serverTs || (serverDate ? new Date(serverDate).getTime() : 0);
      return {rtt, url, serverTime: parsed ? parsed + rtt / 2 : null, sampledAt: nowMs()};
    }catch(e){
      return null;
    }
  }

  async function syncTicketlinkRttOptimized(force=false){
    if(syncing && !force) return bestSample;
    syncing = true;
    setStatus('Ticketlink 서버 기준 · 지연 측정 중...', 'info');
    let localBest = null;
    for(let i=0;i<SAMPLE_COUNT;i++){
      for(const url of FALLBACK_URLS){
        const sample = await requestSample(url);
        if(sample && (!localBest || sample.rtt < localBest.rtt)){
          localBest = sample;
          bestSample = sample;
          showBest();
        }
        if(localBest && localBest.rtt <= TARGET_RTT) break;
      }
      if(localBest && localBest.rtt <= TARGET_RTT) break;
      await sleep(SAMPLE_GAP_MS);
    }
    if(bestSample && bestSample.serverTime){
      window.ticketlinkTimeOffset = bestSample.serverTime - nowMs();
      window.ticketlinkBestRtt = bestSample.rtt;
    }
    if(!bestSample) setStatus('Ticketlink 서버 기준 · 지연 측정 실패', 'error');
    else showBest();
    syncing = false;
    return bestSample;
  }

  function enhanceSyncButtons(){
    Array.from(document.querySelectorAll('button')).forEach(btn => {
      const txt = (btn.textContent || '').trim();
      if((txt === '동기화' || txt.includes('서버 동기화')) && !btn.dataset.ticketlinkOptimized){
        btn.dataset.ticketlinkOptimized = '1';
        btn.addEventListener('click', () => setTimeout(() => syncTicketlinkRttOptimized(true), 80), true);
      }
    });
  }

  function boot(){
    enhanceSyncButtons();
    setTimeout(() => syncTicketlinkRttOptimized(false), 600);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setInterval(enhanceSyncButtons, 2000);
  setInterval(() => syncTicketlinkRttOptimized(false), 30000);
  window.syncTicketlinkRttOptimized = syncTicketlinkRttOptimized;
})();
/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_END */
'''

if start in text and end in text:
    text = text.split(start)[0] + block + text.split(end, 1)[1]
else:
    text = text.rstrip() + '\n\n' + block + '\n'

patch_file.write_text(text, encoding='utf-8')
print('applied Ticketlink RTT optimizer patch')

# self cleanup temporary patch files
Path('scripts/patch_ticketlink_rtt_optimizer.py').unlink(missing_ok=True)
Path('.github/workflows/patch-ticketlink-rtt-optimizer.yml').unlink(missing_ok=True)
