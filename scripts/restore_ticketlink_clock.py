from pathlib import Path

# 1) index.html에 작동하는 시계 모듈을 다시 연결
idx = Path('index.html')
text = idx.read_text(encoding='utf-8')
clock = '  <script src="ticketlink-clock-fix.js" defer></script>'
if clock not in text:
    marker = '  <script src="eoheung-commandments.js" defer></script>'
    if marker in text:
        text = text.replace(marker, marker + '\n' + clock)
    else:
        text = text.replace('</head>', clock + '\n</head>')
idx.write_text(text, encoding='utf-8')

# 2) 기존의 고장난 간단 RTT 표시 블록 제거
patch = Path('eoheung-member-logo-patch.js')
js = patch.read_text(encoding='utf-8')
start = '/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_START */'
end = '/* EOHEUNG_TICKETLINK_RTT_OPTIMIZER_END */'
if start in js and end in js:
    before = js.split(start)[0].rstrip()
    after = js.split(end, 1)[1].lstrip()
    js = before + '\n\n' + after
patch.write_text(js, encoding='utf-8')

print('restored working Ticketlink clock and removed duplicate RTT status')
