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
#dashboard #eoNextWatch .eo-next-hero{
  overflow:hidden!important;
  isolation:isolate!important;
  border:1px solid rgba(255,255,255,.24)!important;
  background:
    radial-gradient(circle at 92% 15%,rgba(255,255,255,.20),transparent 26%),
    radial-gradient(circle at 12% 100%,rgba(246,195,67,.20),transparent 34%),
    linear-gradient(135deg,#0757b8 0%,#073f8f 45%,#041e42 100%)!important;
  box-shadow:0 14px 34px rgba(4,30,66,.22)!important;
}
#dashboard #eoNextWatch .eo-next-hero::before{
  content:''!important;
  position:absolute!important;
  inset:0!important;
  background:linear-gradient(90deg,rgba(255,255,255,.10),transparent 30%,rgba(255,255,255,.06))!important;
  pointer-events:none!important;
  z-index:0!important;
}
#dashboard #eoNextWatch .eo-next-hero>*:not(.eo-next-arrow){position:relative!important;z-index:2!important}
#dashboard #eoNextWatch .eo-next-hero h3{
  display:flex!important;
  align-items:center!important;
  gap:6px!important;
  color:#eaf4ff!important;
  text-shadow:0 1px 1px rgba(0,0,0,.20)!important;
}
#dashboard #eoNextWatch .eo-next-hero h3::before{
  content:'🦁'!important;
  font-size:14px!important;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.20))!important;
}
#dashboard #eoNextWatch .eo-next-hero p[style]{
  color:#fff!important;
  letter-spacing:-.03em!important;
  text-shadow:0 1px 2px rgba(0,0,0,.22)!important;
}
#dashboard #eoNextWatch .eo-next-hero p:last-child{
  color:rgba(255,255,255,.92)!important;
}
#dashboard #eoNextWatch .eo-next-meta{
  padding-right:2px!important;
}
#dashboard #eoNextWatch .eo-pill{
  border:1px solid rgba(255,255,255,.18)!important;
  background:rgba(255,255,255,.14)!important;
  color:#fff!important;
  backdrop-filter:blur(10px)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.16)!important;
}
#dashboard #eoNextWatch .eo-seat{
  background:linear-gradient(135deg,#fff8ed,#ffe8c2)!important;
  color:#9a3412!important;
  border:1px solid rgba(251,191,36,.65)!important;
  box-shadow:0 5px 14px rgba(120,53,15,.16)!important;
}
#dashboard #eoNextWatch .eo-next-arrow{
  width:32px!important;
  height:54px!important;
  border-radius:999px!important;
  border:1px solid rgba(255,255,255,.46)!important;
  background:rgba(255,255,255,.22)!important;
  color:#fff!important;
  backdrop-filter:blur(12px)!important;
  box-shadow:0 10px 22px rgba(4,30,66,.24),inset 0 1px 0 rgba(255,255,255,.22)!important;
  transition:transform .16s ease,background .16s ease,box-shadow .16s ease!important;
  z-index:8!important;
}
#dashboard #eoNextWatch .eo-next-arrow:hover{
  background:rgba(255,255,255,.34)!important;
  box-shadow:0 12px 26px rgba(4,30,66,.30),inset 0 1px 0 rgba(255,255,255,.30)!important;
}
#dashboard #eoNextWatch .eo-next-prev{left:8px!important;}
#dashboard #eoNextWatch .eo-next-next{right:8px!important;}
#dashboard #eoNextWatch .eo-next-prev:hover{transform:translateY(-50%) translateX(-2px)!important;}
#dashboard #eoNextWatch .eo-next-next:hover{transform:translateY(-50%) translateX(2px)!important;}
body.theme-excel #dashboard #eoNextWatch .eo-next-hero{
  background:linear-gradient(135deg,#217346,#185c37)!important;
  border-color:#70ad47!important;
  box-shadow:none!important;
}
body.theme-excel #dashboard #eoNextWatch .eo-next-arrow{background:rgba(255,255,255,.22)!important;border-color:rgba(255,255,255,.50)!important;}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero{
  background:linear-gradient(135deg,#ffffff,#eef6ff)!important;
  color:#111827!important;
  border-color:#c7d8ea!important;
  box-shadow:0 2px 8px rgba(0,0,0,.10)!important;
}
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero h3,
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p[style],
body.theme-groupware #dashboard #eoNextWatch .eo-next-hero p:last-child{color:#174ea6!important;text-shadow:none!important;}
body.theme-groupware #dashboard #eoNextWatch .eo-pill{background:#eaf3ff!important;color:#174ea6!important;border-color:#c7d8ea!important;box-shadow:none!important;}
body.theme-groupware #dashboard #eoNextWatch .eo-next-arrow{background:#5b9bd5!important;border-color:#3479bd!important;color:#fff!important;}
@media(max-width:900px){
  #dashboard #eoNextWatch .eo-next-hero{padding-left:46px!important;padding-right:46px!important;}
  #dashboard #eoNextWatch .eo-next-arrow{width:34px!important;height:56px!important;}
  #dashboard #eoNextWatch .eo-next-prev{left:7px!important;}
  #dashboard #eoNextWatch .eo-next-next{right:7px!important;}
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
print('applied polished next-watch carousel design')
