from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
script='  <script src="kbo-recent-badges.js" defer></script>'
if script not in text:
    marker='  <script src="kbo-standings-fix.js" defer></script>'
    if marker in text:
        text=text.replace(marker, marker+'\n'+script)
    else:
        text=text.replace('</head>', script+'\n</head>')
p.write_text(text,encoding='utf-8')
print('linked kbo recent badges override')
