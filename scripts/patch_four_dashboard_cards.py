from pathlib import Path
p = Path('eoheung-member-logo-patch.js')
text = p.read_text(encoding='utf-8')

old = "@media(min-width:1201px){.rank-grid.eo-rank-grid-enhanced{grid-template-columns:repeat(4,minmax(0,1fr))!important}}"
new = """@media(min-width:901px){#dashboard .rank-grid.eo-rank-grid-enhanced{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;align-items:stretch!important}#dashboard .rank-grid.eo-rank-grid-enhanced>.card,#dashboard .rank-grid.eo-rank-grid-enhanced>#eoNextWatch{min-width:0!important;width:auto!important}#dashboard .rank-grid.eo-rank-grid-enhanced .card.pad{padding:14px!important}#dashboard .rank-grid.eo-rank-grid-enhanced h3{font-size:15px!important;line-height:1.25!important;margin-bottom:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .rank-list li{font-size:12px!important;padding:6px 0!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero h3{font-size:16px!important;margin-bottom:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p{font-size:12px!important;line-height:1.35!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p[style]{font-size:14px!important;line-height:1.35!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-meta{gap:5px!important;margin:8px 0!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-pill{font-size:11px!important;padding:4px 7px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero::after{font-size:46px!important;right:-8px!important;bottom:-12px!important}}
@media(min-width:901px) and (max-width:1280px){#dashboard .rank-grid.eo-rank-grid-enhanced{gap:8px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .card.pad{padding:12px!important}#dashboard .rank-grid.eo-rank-grid-enhanced h3{font-size:14px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .rank-list li{font-size:11.5px!important}#dashboard .rank-grid.eo-rank-grid-enhanced .eo-next-hero p[style]{font-size:13px!important}}"""

if old not in text:
    raise SystemExit('target css block not found')
text = text.replace(old, new)
p.write_text(text, encoding='utf-8')
print('patched four dashboard cards css')
