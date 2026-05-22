from pathlib import Path

p = Path('index.html')
text = p.read_text(encoding='utf-8')

needle = '<script src="mobile-drawer-menu.js" defer></script>'
insert = needle + '\n  <script src="eoheung-member-logo-patch.js" defer></script>'

if 'eoheung-member-logo-patch.js' not in text:
    if needle not in text:
        raise SystemExit('mobile-drawer-menu.js script tag not found')
    text = text.replace(needle, insert, 1)
    p.write_text(text, encoding='utf-8')
    print('inserted eoheung-member-logo-patch.js')
else:
    print('eoheung-member-logo-patch.js already loaded')
