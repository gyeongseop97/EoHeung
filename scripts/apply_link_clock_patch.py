from pathlib import Path

p = Path('mobile-drawer-menu.js')
text = p.read_text(encoding='utf-8')

if 'linkClockCardHtml' in text:
    print('already patched')
    raise SystemExit

css = r'''
.link-clock-card{background:#050505!important;color:#fff!important;border:1px solid #111!important;border-radius:2px!important;box-shadow:0 2px 10px rgba(0,0,0,.18)!important;min-height:132px!important;padding:14px 16px!important;display:flex!important;flex-direction:column!important;justify-content:space-between!important;gap:10px!important;overflow:hidden!important}
.link-clock-title{font-size:15px!important;font-weight:950!important;line-height:1.25!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.link-clock-title a{color:#00d439!important;text-decoration:underline!important;text-underline-offset:2px!important;font-size:13px!important;margin-left:6px!important}.link-clock-sub{font-size:11px!important;color:#d1d5db!important;line-height:1.3!important}.link-clock-time{font-family:Arial,Helvetica,sans-serif!important;font-size:clamp(42px,4.4vw,72px)!important;font-weight:950!important;letter-spacing:-.07em!important;line-height:.9!important;color:#fff!important;white-space:nowrap!important}.link-clock-time .link-clock-sec{color:#00d41f!important}.link-clock-actions{display:flex!important;justify-content:flex-end!important;gap:8px!important}.link-clock-actions a{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:32px!important;padding:6px 10px!important;border:1px solid #334155!important;border-radius:6px!important;background:#111827!important;color:#fff!important;font-size:12px!important;font-weight:900!important}.link-clock-actions a.primary{background:#00a629!important;border-color:#00d439!important;color:#001405!important}
body.theme-excel .link-clock-card{border-radius:0!important}body.theme-groupware .link-clock-card{border-radius:0!important;box-shadow:none!important}
'''
text = text.replace('@media(max-width:900px){\n  .syncbox{display:none!important}', css + '\n@media(max-width:900px){\n  .syncbox{display:none!important}')
text = text.replace('  .topbar>.toolbar{display:none!important}\n}`;', '  .topbar>.toolbar{display:none!important}\n  .link-clock-card{min-height:116px!important;padding:13px!important}.link-clock-title{font-size:14px!important}.link-clock-time{font-size:clamp(40px,13vw,62px)!important}.link-clock-actions a{min-height:34px!important;flex:1!important}\n}`;')

helpers = r'''

  function linkClockCardHtml(){
    const ticketUrl='https://'+'www.ticketlink.co.kr/sports/baseball/57';
    const checkUrl='https://'+'time.navyism.com/?host=www.ticketlink.co.kr';
    return '<div id="linkClockCard" class="card pad quick-link-card link-clock-card">'
      + '<div><div class="link-clock-title">티켓링크(ticketlink.co.kr)의 서버시간 <a href="'+checkUrl+'" target="_blank" rel="noopener">보정보기</a></div>'
      + '<div class="link-clock-sub">예매 시작 전 확인용 · KST 기준 실시간 표시</div></div>'
      + '<div id="linkClockTime" class="link-clock-time">--:--:<span class="link-clock-sec">--.---</span></div>'
      + '<div class="link-clock-actions"><a class="primary" href="'+ticketUrl+'" target="_blank" rel="noopener">티켓링크 열기</a></div>'
      + '</div>';
  }

  function updateLinkClock(){
    const el=qs('linkClockTime');
    if(!el)return;
    const now=new Date();
    const parts=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}).formatToParts(now);
    const get=function(type){return (parts.find(p=>p.type===type)||{}).value||'00'};
    const ms=String(now.getMilliseconds()).padStart(3,'0');
    el.innerHTML=get('hour')+':'+get('minute')+':<span class="link-clock-sec">'+get('second')+'.'+ms+'</span>';
  }
'''
text = text.replace('  function installQuickLinkDelete(){', helpers + '\n  function installQuickLinkDelete(){')
text = text.replace('      root.innerHTML=links.map(function(l){', '      root.innerHTML=linkClockCardHtml()+links.map(function(l){')
text = text.replace('    setTimeout(function(){try{enhancedRenderLinks()}catch(e){}},300);', "    if(!window.__linkClockInterval){window.__linkClockInterval=setInterval(updateLinkClock,43)}\n    setTimeout(function(){try{enhancedRenderLinks();updateLinkClock()}catch(e){}},300);")
text = text.replace('    syncMobileUser();\n  }', '    syncMobileUser();\n    updateLinkClock();\n  }')

p.write_text(text, encoding='utf-8')
print('link clock patch applied')
