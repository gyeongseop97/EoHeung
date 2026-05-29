from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
text=text.replace('  <script src="ticketlink-clock-fix.js" defer></script>\n','')
p.write_text(text,encoding='utf-8')
print('removed duplicate clock include')
