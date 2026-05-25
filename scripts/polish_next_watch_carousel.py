from pathlib import Path

p = Path('eoheung-member-logo-patch.js')
text = p.read_text(encoding='utf-8')

start = '/* EOHEUNG_NEXT_WATCH_POLISH_START */'
end = '/* EOHEUNG_NEXT_WATCH_POLISH_END */'

block = r'''
/* EOHEUNG_NEXT_WATCH_POLISH_START */
(function(){
  const styleId='eoheungNextWatchPolishStyle';
  const css=`
/* 다음 직관 카드: 기존 카드/태그 색상은 유지하고 화살표만 정리 */
#dashboard #eoNextWatch .eo-next-hero{
  overflow:hidden!important;
  isolation:auto!important;
  background:linear-gradient(135deg,#074ca1,#041e42)!important;
  box-shadow:0 14px 34px rgba(4,30,66,.18)!important;
}
#dashboard #eoNextWatch .eo-next-hero::before{
  content:none!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero::after{
  content:''!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero h3::before{
  content:none!important;
  display:none!important;
}
#dashboard #eoNextWatch .eo-next-hero h3,
#dashboard #eoNextWatch .eo-next-hero p,
#dashboard #eoNextWatch .eo-next-hero p[style]{
  text-shadow:none!important;
}
#dashboard #eoNextWatch .eo-next-meta{
  padding-right:0!important;
}
#dashboard #eoNextWatch .eo-pill{
  border:0!important;
  background:rgba(255,255,255,.14)!important;
  color:#fff!important;
  backdrop-filter:none!important;
  box-shadow:none!important;
}
#dashboard #eoNextWatch .eo-seat{
  background:#fff7ed!important;
  color:#c2410c!important;
  border:1px solid #fed7aa!important;
  box-shadow:none!important;
}
#dashboard #eoNextWatch .eo-next-arrow{
  position:absolute!important;
  top:10px!important;
  transform:none!important;
  width:24px!important;
  height:24px!important;
  min-width:24px!important;
  min-height:24px!important;
  border-radius:999px!important;
  border:1px solid rgba(255,255,255,.38)!important;
  background:rgba(255,255,255,.18)!important;
  color:#ffffff!important;
  display:grid!important;
  place-items:center!important;
  padding:0!important;
  font-size:18px!important;
  line-height:20px!important;
  font-weight:800!important;
  z-index:8!important;
  backdrop-filter:blur(8px)!important;
  box-shadow:0 4px 12px rgba(4,30,66,.16), inset 0 1px 0 rgba(255,255,255,.18)!important;
  transition:background .15s ease, transform .15s ease, box-shadow .15s ease!important;
}
#dashboard #eoNextWatch .eo-next-prev{right:38px!important;left:auto!important;}
#dashboard #eoNextWatch .eo-next-next{right:10px!important;left:auto!important;}
#dashboard #eoNextWatch .eo-next-arrow:hover{
  background:rgba(255,255,255,.30)!important;
  transform:translateY(-1px)!important;
  box-shadow:0 6px 14px rgba(4,30,66,.22), inset 0 1px 0 rgba(255,255,255,.24)!important;
}
body.theme-excel #dashboard #eoNextWatch .eo-next-hero{
  background:#217346!important;
  border-color:#185c37!important;
  box-shadow:none!important;
}
body.theme-excel #dashboard #eoNextWatch .eo-next-arrow{
  background:rgba(255,255,255,.20)!important;
  border-color:rgba(255,255,255,.42)!important;
  color:#fff!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero{
  background:#fff!important;
  color:#111827!important;
  border-color:#c7d8ea!important;
  box-shadow:0 1px 4px rgba(0,0,0,.12)!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero h3,
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p[style],
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p:last-child{
  color:#174ea6!important;
  text-shadow:none!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-pill{
  background:#eaf3ff!important;
  color:#174ea6!important;
  border-radius:2px!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-seat{
  background:#fff7ed!important;
  color:#c2410c!important;
  border:1px solid #fed7aa!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-arrow{
  background:#eaf3ff!important;
  border-color:#c7d8ea!important;
  color:#174ea6!important;
  box-shadow:none!important;
}
@media(max-width:900px){
  #dashboard #eoNextWatch .eo-next-hero{
    padding-left:13px!important;
    padding-right:48px!important;
  }
  #dashboard #eoNextWatch .eo-next-arrow{
    top:12px!important;
    width:26px!important;
    height:26px!important;
    min-width:26px!important;
    min-height:26px!important;
    font-size:19px!important;
  }
  #dashboard #eoNextWatch .eo-next-prev{right:42px!important;left:auto!important;}
  #dashboard #eoNextWatch .eo-next-next{right:12px!important;left:auto!important;}
}`;
  function apply(){
    let style=document.getElementById(styleId);
    if(!style){style=document.createElement('style');style.id=styleId;document.head.appendChild(style)}
    style.textContent=css;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  setInterval(apply,2200);
})();
/* EOHEUNG_NEXT_WATCH_POLISH_END */
'''

if start in text and end in text:
    text = text.split(start)[0] + block + text.split(end, 1)[1]
else:
    text = text.rstrip() + '\n\n' + block + '\n'

p.write_text(text, encoding='utf-8')
print('refined next-watch arrows only; restored tag colors and removed decorative gradient/watermark')
