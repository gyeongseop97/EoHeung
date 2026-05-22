from pathlib import Path

p = Path('eoheung-member-logo-patch.js')
text = p.read_text(encoding='utf-8')

marker_start = '/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_START */'
marker_end = '/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_END */'

css = r'''
/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_START */
(function(){
  const styleId = 'eoheungForceFourDashboardCardsStyle';
  const css = `
@media (min-width: 901px){
  #dashboard .rank-grid{
    display:grid!important;
    grid-template-columns:repeat(4,minmax(0,1fr))!important;
    gap:10px!important;
    align-items:stretch!important;
  }
  #dashboard .rank-grid > .card,
  #dashboard .rank-grid > #eoNextWatch{
    min-width:0!important;
    width:auto!important;
    height:100%!important;
    min-height:192px!important;
  }
  #dashboard .rank-grid > .card{
    display:flex!important;
    flex-direction:column!important;
  }
  #dashboard .rank-grid .card.pad{
    padding:13px!important;
  }
  #dashboard .rank-grid h3{
    font-size:15px!important;
    line-height:1.25!important;
    margin:0 0 8px!important;
    letter-spacing:-.03em!important;
    white-space:nowrap!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
  }
  #dashboard .rank-grid .rank-list{
    margin-top:6px!important;
    flex:1 1 auto!important;
  }
  #dashboard .rank-grid .rank-list li{
    font-size:12px!important;
    line-height:1.25!important;
    padding:6px 0!important;
    gap:6px!important;
  }
  #dashboard .rank-grid .rank-list li b{
    min-width:0!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  #dashboard #eoNextWatch{
    display:block!important;
    margin:0!important;
  }
  #dashboard #eoNextWatch .eo-next-hero{
    height:100%!important;
    min-height:192px!important;
    padding:13px!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:flex-start!important;
  }
  #dashboard #eoNextWatch .eo-next-hero h3{
    font-size:15px!important;
    margin:0 0 8px!important;
    flex:0 0 auto!important;
  }
  #dashboard #eoNextWatch .eo-next-hero p{
    font-size:12px!important;
    line-height:1.35!important;
    margin:4px 0!important;
  }
  #dashboard #eoNextWatch .eo-next-hero p[style]{
    font-size:13px!important;
    line-height:1.32!important;
  }
  #dashboard #eoNextWatch .eo-next-meta{
    display:flex!important;
    flex-wrap:wrap!important;
    gap:5px!important;
    margin:8px 0!important;
    align-items:flex-start!important;
  }
  #dashboard #eoNextWatch .eo-pill{
    font-size:10.5px!important;
    padding:3px 6px!important;
    max-width:100%!important;
    overflow:hidden!important;
    text-overflow:ellipsis!important;
    white-space:nowrap!important;
  }
  #dashboard #eoNextWatch .eo-seat{
    flex-basis:100%!important;
    width:fit-content!important;
    max-width:100%!important;
    white-space:normal!important;
    line-height:1.25!important;
    overflow:visible!important;
    text-overflow:clip!important;
    margin-top:2px!important;
  }
  #dashboard #eoNextWatch .eo-next-hero::after{
    font-size:42px!important;
    right:-7px!important;
    bottom:-10px!important;
  }
}
@media (min-width:901px) and (max-width:1280px){
  #dashboard .rank-grid{gap:8px!important;}
  #dashboard .rank-grid .card.pad{padding:11px!important;}
  #dashboard .rank-grid h3{font-size:13.5px!important;}
  #dashboard .rank-grid .rank-list li{font-size:11px!important;}
  #dashboard #eoNextWatch .eo-next-hero p[style]{font-size:12px!important;}
}
@media (max-width:900px){
  #dashboard .rank-grid{grid-template-columns:1fr!important;}
  #dashboard #eoNextWatch .eo-seat{
    flex-basis:100%!important;
    white-space:normal!important;
    line-height:1.25!important;
  }
}`;
  let style = document.getElementById(styleId);
  if(!style){
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css;
})();
/* EOHEUNG_FORCE_FOUR_DASHBOARD_CARDS_END */
'''

if marker_start in text and marker_end in text:
    before = text.split(marker_start)[0]
    after = text.split(marker_end, 1)[1]
    text = before + css + after
else:
    text = text.rstrip() + '\n\n' + css + '\n'

p.write_text(text, encoding='utf-8')
print('forced four dashboard cards css with equal height and seat wrap')
