from pathlib import Path
p=Path('index.html')
text=p.read_text(encoding='utf-8')
css='  <link rel="stylesheet" href="kbo-standings-fix.css" />'
js='  <script src="kbo-standings-fix.js" defer></script>'
if css not in text:
    text=text.replace('  <link rel="stylesheet" href="kbo-standings-homeaway.css" />','  <link rel="stylesheet" href="kbo-standings-homeaway.css" />\n'+css)
if js not in text:
    marker='  <script src="eoheung-commandments.js" defer></script>'
    if marker in text:
        text=text.replace(marker, marker+'\n'+js)
    else:
        text=text.replace('</head>', js+'\n</head>')
p.write_text(text,encoding='utf-8')
print('linked KBO standings fix files')
