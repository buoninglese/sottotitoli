import re

p888 = open('studio-caption-mockups-888.html').read()
p8 = open('studio-caption-mockups-8.html').read()

# Get I1 and I8 cards from page 8
i1_card = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>I1 · Playfair Display</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL)
i8_card = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>I8 · Manrope Light</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL)

if not i1_card or not i8_card:
    print('ERROR: Cards not found on page 8')
    exit()

# Add I1 light CSS if missing
if '.i1{' not in p888:
    i1_css = '''
.i1{background:#fefefe}
.i1 .cap-box{background:#fff;border:1px solid #e8e5df;border-radius:0;padding:28px 36px}
.i1 .cap-interim{font-family:'Playfair Display',serif;font-size:26px;color:#1a1a1a;font-weight:700;line-height:1.15}
.i1 .cap-line{font-family:'Inter',sans-serif;font-weight:400;font-size:14px;color:#4a4a4a;border-bottom:1px solid #f0ece4}
.i1 .cap-ts{font-family:'JetBrains Mono',monospace;color:#b5ad9e;font-size:9px;font-style:italic}
.i1 .chip{background:#1a1a1a;color:#fefefe;font-family:'Inter',sans-serif;font-weight:500;font-size:9px;text-transform:uppercase;letter-spacing:.8px;border-radius:0}
.i1 .btn-start{background:#1a1a1a;color:#fefefe;font-family:'Inter',sans-serif;font-weight:600;font-size:12px;letter-spacing:.5px;border-radius:0}
'''
    css_end = p888.find('</style>')
    p888 = p888[:css_end] + '\n' + i1_css + '\n' + p888[css_end:]

# Add I8 light CSS if missing
if '.i8{' not in p888:
    i8_css = '''
.i8{background:#fafafa}
.i8 .cap-box{background:#fff;border:none;border-radius:24px;padding:32px 36px}
.i8 .cap-interim{font-family:'Inter',sans-serif;font-weight:300;font-size:32px;color:#18181b;letter-spacing:-.8px;line-height:1.1}
.i8 .cap-line{font-family:'Manrope',sans-serif;font-weight:300;font-size:14px;color:#71717a;border:none;padding:6px 0}
.i8 .cap-ts{font-family:'JetBrains Mono',monospace;color:#d4d4d8;font-size:10px;font-weight:300}
.i8 .chip{background:#f4f4f5;color:#a1a1aa;font-family:'Inter',sans-serif;font-weight:400;font-size:10px;border-radius:20px;padding:6px 14px}
.i8 .btn-start{background:#18181b;color:#fafafa;font-family:'Inter',sans-serif;font-weight:400;font-size:13px;letter-spacing:-.3px;border-radius:24px;padding:14px 38px}
'''
    css_end = p888.find('</style>')
    p888 = p888[:css_end] + '\n' + i8_css + '\n' + p888[css_end:]

# Add dark CSS for I1 and I8
dark_i1_i8 = '''
[data-theme="dark"] .i1{background:#080604}
[data-theme="dark"] .i1 .cap-box{background:#0c0a06;border:1px solid #221a10;border-radius:0;padding:28px 36px}
[data-theme="dark"] .i1 .cap-interim{font-family:'Playfair Display',serif;font-size:26px;color:#c8a860;font-weight:700;line-height:1.15}
[data-theme="dark"] .i1 .cap-line{font-family:Inter,sans-serif;font-weight:400;font-size:14px;color:#908060;border-bottom:1px solid #221a10}
[data-theme="dark"] .i1 .cap-ts{font-family:'JetBrains Mono',monospace;color:#5a4228;font-size:9px;font-style:italic}
[data-theme="dark"] .i1 .chip{background:#c8a860;color:#080604;font-family:Inter,sans-serif;font-weight:500;font-size:9px;text-transform:uppercase;letter-spacing:.8px;border-radius:0}
[data-theme="dark"] .i1 .btn-start{background:#c8a860;color:#080604;font-family:Inter,sans-serif;font-weight:600;font-size:12px;letter-spacing:.5px;border-radius:0}
[data-theme="dark"] .i8{background:#06060c}
[data-theme="dark"] .i8 .cap-box{background:#0a0a14;border:none;border-radius:24px;padding:32px 36px}
[data-theme="dark"] .i8 .cap-interim{font-family:Inter,sans-serif;font-weight:300;font-size:32px;color:#c8d0e0;letter-spacing:-.8px;line-height:1.1}
[data-theme="dark"] .i8 .cap-line{font-family:Manrope,sans-serif;font-weight:300;font-size:14px;color:#788090;border:none;padding:6px 0}
[data-theme="dark"] .i8 .cap-ts{font-family:'JetBrains Mono',monospace;color:#384050;font-size:10px;font-weight:300}
[data-theme="dark"] .i8 .chip{background:#141820;color:#788090;font-family:Inter,sans-serif;font-weight:400;font-size:10px;border-radius:20px;padding:6px 14px}
[data-theme="dark"] .i8 .btn-start{background:#c8d0e0;color:#06060c;font-family:Inter,sans-serif;font-weight:400;font-size:13px;letter-spacing:-.3px;border-radius:24px;padding:14px 38px}
'''
css_end = p888.find('</style>')
p888 = p888[:css_end] + '\n' + dark_i1_i8 + '\n' + p888[css_end:]

# Insert cards
grid_close = p888.rfind('</div>', 0, p888.find('<script>'))
p888 = p888[:grid_close] + '\n' + i1_card.group(0) + '\n' + i8_card.group(0) + '\n' + p888[grid_close:]

# Update subtitle
p888 = p888.replace('6 Caption Box Designs', '8 Caption Box Designs')

open('studio-caption-mockups-888.html', 'w').write(p888)

# Verify
body = p888[p888.find('<body>'):p888.find('</body>')]
cards = re.findall(r'<span>([^<]+)</span><span>([^<]+)</span>', body)
print(f'OK: {len(cards)} cards, {len(p888)} chars')
for a,b in cards: print(' ', a)
has_dark_i1 = '[data-theme="dark"] .i1' in p888
has_dark_i8 = '[data-theme="dark"] .i8' in p888
print(f'Dark I1: {has_dark_i1}, Dark I8: {has_dark_i8}')
