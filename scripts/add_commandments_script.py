from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
script='  <script src="eoheung-commandments.js" defer></script>'
if script not in text:
    text=text.replace('  <script src="eoheung-member-logo-patch.js" defer></script>', '  <script src="eoheung-member-logo-patch.js" defer></script>\n'+script)
p.write_text(text,encoding='utf-8')
print('commandments script linked')
