from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
script='  <script src="ticketlink-clock-fix.js" defer></script>'
if script not in text:
    marker='  <script src="eoheung-commandments.js" defer></script>'
    if marker in text:
        text=text.replace(marker, marker+'\n'+script)
    else:
        text=text.replace('</head>', script+'\n</head>')
p.write_text(text,encoding='utf-8')
print('ticketlink clock script linked')
