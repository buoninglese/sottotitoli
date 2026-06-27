import re

# Read page 8 (has 4 J cards in light mode + V5 script)
p8 = open('studio-caption-mockups-8.html').read()
# Read page 888 (has B7 and K1)
p888 = open('studio-caption-mockups-888.html').read()

# Extract B7 and K1 cards
b7_card = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>B7 · Flexible</span>.*?</div>\s*</div>\s*</div>', p888, re.DOTALL).group(0)
k1_card = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>K1 · One-Point Perspective</span>.*?</div>\s*</div>\s*</div>', p888, re.DOTALL).group(0)

# Extract 4 J cards from page 8
j1a = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>J1A · Karesansui</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL).group(0)
j1b = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>J1B · Karesansui</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL).group(0)
j7a = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>J7A · Shoji</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL).group(0)
j7b = re.search(r'<div class="mockup-card"><div class="mockup-label"><span>J7B · Shoji</span>.*?</div>\s*</div>\s*</div>', p8, re.DOTALL).group(0)

all_cards = j1a + '\n' + j1b + '\n' + j7a + '\n' + j7b + '\n' + b7_card + '\n' + k1_card

# Remove per-card toggle buttons
all_cards = re.sub(r'<button[^>]*toggle[^>]*>.*?</button>', '', all_cards, flags=re.DOTALL)

# Get head from page 8 (light-mode CSS)
head_end = p8.find('</head>')
head = p8[:head_end]
head = head.replace('Netflix Sans &amp; Inter Caption Mockups', 'Dark Mode Redesigns - 888')

# Get V5 script from page 8
script_start = p8.find('<script>')
body_close = p8.find('</body>')
v5_script = p8[script_start:body_close]

# Dark CSS
dark_css = '''
[data-theme="dark"] body{background:#06070d;color:#c8cfe0}
[data-theme="dark"] h1{color:#e0e4f0}
[data-theme="dark"] .subtitle{color:#5a6070}
[data-theme="dark"] .mockup-card{background:#0c0e16;border-color:#181a28;box-shadow:0 4px 24px rgba(0,0,0,.6)}
[data-theme="dark"] .mockup-label{background:#10121c;color:#7a8098}
[data-theme="dark"] .mockup-label span:last-child{color:#4a5068}
[data-theme="dark"] .mockup-card:hover{box-shadow:0 12px 48px rgba(0,0,0,.7);border-color:#242840}
[data-theme="dark"] .mockup-card:hover .mockup-label{background:#181a28;color:#a78bfa}
[data-theme="dark"] .cap-line:hover{background:rgba(167,139,250,.05)}

[data-theme="dark"] .j1{background:#09090f}
[data-theme="dark"] .j1::before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 8px,rgba(200,170,80,.03) 8px,rgba(200,170,80,.03) 9px);pointer-events:none}
[data-theme="dark"] .j1::after{content:'\\77F3';position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:40px;color:rgba(200,170,80,.06);font-family:'Noto Serif JP',serif}
[data-theme="dark"] .j1a .chip{background:#1a1410;color:#c8a860;font-family:Inter,sans-serif;font-weight:500;font-size:9px;letter-spacing:.5px;border:1px solid #3a2a18;border-radius:2px}
[data-theme="dark"] .j1a .cap-box{background:#0e0c08;border:1px solid #221a10;padding:20px}
[data-theme="dark"] .j1a .cap-interim{font-family:'DM Serif Display',serif;font-size:28px;color:#c8a860;font-weight:400}
[data-theme="dark"] .j1a .cap-line{font-family:Inter,sans-serif;font-weight:350;font-size:14px;color:#908060;border-bottom:1px solid #221a10;padding:7px 0;line-height:1.6}
[data-theme="dark"] .j1a .cap-ts{font-family:'JetBrains Mono',monospace;color:#4a3820;font-size:9px}
[data-theme="dark"] .j1a .btn-start{background:linear-gradient(135deg,#1a1410,#221810);color:#c8a860;font-family:'DM Serif Display',serif;font-size:14px;letter-spacing:.3px;border:1px solid #3a2a18;border-radius:2px;font-weight:400}

[data-theme="dark"] .j1b .chip{background:#141820;color:#788898;font-family:Inter,sans-serif;font-weight:400;font-size:10px;border-radius:20px;padding:6px 14px;border:1px solid #242c38}
[data-theme="dark"] .j1b .cap-box{background:#0c0e14;border:none;padding:20px}
[data-theme="dark"] .j1b .cap-interim{font-family:Inter,sans-serif;font-weight:300;font-size:32px;color:#b8c4d8;letter-spacing:-.8px;line-height:1.1}
[data-theme="dark"] .j1b .cap-line{font-family:Manrope,sans-serif;font-weight:300;font-size:14px;color:#606878;border:none;padding:6px 0;line-height:1.6}
[data-theme="dark"] .j1b .cap-ts{font-family:'JetBrains Mono',monospace;color:#303848;font-size:10px;font-weight:300}
[data-theme="dark"] .j1b .btn-start{background:#141820;color:#8898a8;font-family:Inter,sans-serif;font-weight:400;font-size:13px;letter-spacing:-.3px;border-radius:24px;padding:14px 38px;border:1px solid #242c38}

[data-theme="dark"] .j7{background:#0d0d13}
[data-theme="dark"] .j7::before{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,.02) 0%,transparent 5%,transparent 95%,rgba(255,255,255,.02) 100%)}
[data-theme="dark"] .j7a .chip{background:#161210;color:#b89860;font-family:Inter,sans-serif;font-weight:500;font-size:9px;letter-spacing:.5px;border:1px solid #302818;border-radius:2px}
[data-theme="dark"] .j7a .cap-box{background:#100e0a;border:1px solid #201810;padding:20px;border-radius:4px;box-shadow:0 2px 20px rgba(0,0,0,.4),0 0 40px rgba(200,160,80,.03)}
[data-theme="dark"] .j7a .cap-interim{font-family:'DM Serif Display',serif;font-size:28px;color:#b89860;font-weight:400}
[data-theme="dark"] .j7a .cap-line{font-family:Inter,sans-serif;font-weight:350;font-size:14px;color:#887858;border-bottom:1px solid #201810;padding:7px 0;line-height:1.6}
[data-theme="dark"] .j7a .cap-ts{font-family:'JetBrains Mono',monospace;color:#4a3820;font-size:9px}
[data-theme="dark"] .j7a .btn-start{background:linear-gradient(135deg,#161210,#201810);color:#b89860;font-family:'DM Serif Display',serif;font-size:14px;letter-spacing:.3px;border:1px solid #302818;border-radius:2px;font-weight:400}

[data-theme="dark"] .j7b .chip{background:#141820;color:#788890;font-family:Inter,sans-serif;font-weight:400;font-size:10px;border-radius:20px;padding:6px 14px;border:1px solid #242c36}
[data-theme="dark"] .j7b .cap-box{background:#0e1016;border:none;padding:20px;border-radius:4px;box-shadow:0 2px 16px rgba(0,0,0,.4)}
[data-theme="dark"] .j7b .cap-interim{font-family:Inter,sans-serif;font-weight:300;font-size:32px;color:#b0bcc8;letter-spacing:-.8px;line-height:1.1}
[data-theme="dark"] .j7b .cap-line{font-family:Manrope,sans-serif;font-weight:300;font-size:14px;color:#606878;border:none;padding:6px 0;line-height:1.6}
[data-theme="dark"] .j7b .cap-ts{font-family:'JetBrains Mono',monospace;color:#303848;font-size:10px;font-weight:300}
[data-theme="dark"] .j7b .btn-start{background:#141820;color:#8898a8;font-family:Inter,sans-serif;font-weight:400;font-size:13px;letter-spacing:-.3px;border-radius:24px;padding:14px 38px;border:1px solid #242c36}

[data-theme="dark"] .b7{background:linear-gradient(160deg,#070810,#0a0616)}
[data-theme="dark"] .b7::before{content:'';position:absolute;top:-50px;right:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(130,80,220,.2),transparent 70%);border-radius:50%;pointer-events:none}
[data-theme="dark"] .b7 .chip{background:rgba(255,255,255,.04);color:#7890b8;font-family:Inter,sans-serif;font-weight:500;font-size:9px;border:1px solid rgba(140,160,210,.15);border-radius:12px;backdrop-filter:blur(6px)}
[data-theme="dark"] .b7 .cap-box{background:rgba(12,12,28,.6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:20px;box-shadow:0 4px 24px rgba(0,0,0,.5)}
[data-theme="dark"] .b7 .cap-interim{font-family:Inter,sans-serif;font-size:20px;color:#8898d0;font-weight:600;letter-spacing:-.3px}
[data-theme="dark"] .b7 .cap-line{font-family:Inter,sans-serif;font-weight:380;font-size:12px;color:#6878a0;border:none;line-height:1.7}
[data-theme="dark"] .b7 .cap-ts{color:rgba(130,160,210,.25);font-size:9px}
[data-theme="dark"] .b7 .btn-start{background:rgba(100,130,200,.1);color:#8090b8;font-family:Inter,sans-serif;font-weight:500;font-size:11px;letter-spacing:.5px;border:1px solid rgba(130,160,210,.12);border-radius:12px;backdrop-filter:blur(6px)}

[data-theme="dark"] .k1{background:#010107}
[data-theme="dark"] .k1 .cap-box{background:linear-gradient(180deg,#060618,#01010c);border:1px solid #0a0a20;border-radius:0}
[data-theme="dark"] .k1 .cap-box::before{content:"";position:absolute;top:50%;left:50%;width:1px;height:200%;background:linear-gradient(180deg,transparent,rgba(0,255,180,.25),transparent);transform:translate(-50%,-50%);animation:vanishingLines 4s linear infinite;opacity:.7}
[data-theme="dark"] .k1 .cap-box::after{content:"";position:absolute;top:50%;left:50%;width:200%;height:1px;background:linear-gradient(90deg,transparent,rgba(0,200,255,.2),transparent);transform:translate(-50%,-50%)}
[data-theme="dark"] .k1 .cap-interim{font-family:Inter,sans-serif;font-size:22px;color:#0ff;font-weight:600;text-align:center;letter-spacing:4px;text-shadow:0 0 30px rgba(0,255,200,.4)}
[data-theme="dark"] .k1 .chip{background:rgba(0,255,180,.06);color:#0ff;border:1px solid rgba(0,255,180,.15);font-family:'JetBrains Mono',monospace;font-size:9px}
[data-theme="dark"] .k1 .btn-start{background:rgba(0,255,180,.06);color:#0ff;border:1px solid rgba(0,255,180,.18);font-family:Inter,sans-serif;font-size:12px;letter-spacing:3px;border-radius:2px}

.theme-toggle{position:fixed;top:16px;right:16px;z-index:999;background:#fff;border:1px solid #ddd;color:#333;padding:10px 18px;border-radius:24px;cursor:pointer;font-family:Inter,sans-serif;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;transition:all .3s;box-shadow:0 2px 12px rgba(0,0,0,.08)}
.theme-toggle:hover{background:#f0f0f0;transform:translateY(-2px)}
[data-theme="dark"] .theme-toggle{background:#141720;border:1px solid #242840;color:#c0c8e0;box-shadow:0 2px 12px rgba(0,0,0,.5)}
'''

# Insert dark CSS
css_end = head.find('</style>')
head = head[:css_end] + '\n' + dark_css + '\n' + head[css_end:]

# Toggle HTML + script
toggle_html = '<button class="theme-toggle" id="themeToggle" onclick="toggleTheme()"><span class="toggle-icon">&#x1F319;</span> <span class="toggle-label">Dark Mode</span></button>'

toggle_script = '''
<script>
function toggleTheme(){
  var html=document.documentElement;
  var btn=document.getElementById("themeToggle");
  var icon=btn.querySelector(".toggle-icon");
  var label=btn.querySelector(".toggle-label");
  if(html.getAttribute("data-theme")==="dark"){
    html.setAttribute("data-theme","light");
    icon.innerHTML="&#x1F319;";
    label.textContent="Dark Mode";
    localStorage.setItem("mockup888_theme","light");
  }else{
    html.setAttribute("data-theme","dark");
    icon.innerHTML="&#x2600;&#xFE0F;";
    label.textContent="Light Mode";
    localStorage.setItem("mockup888_theme","dark");
  }
}
(function(){
  var saved=localStorage.getItem("mockup888_theme")||"dark";
  document.documentElement.setAttribute("data-theme",saved);
  var btn=document.getElementById("themeToggle");
  if(btn){
    if(saved==="dark"){
      btn.querySelector(".toggle-icon").innerHTML="&#x2600;&#xFE0F;";
      btn.querySelector(".toggle-label").textContent="Light Mode";
    }else{
      btn.querySelector(".toggle-icon").innerHTML="&#x1F319;";
      btn.querySelector(".toggle-label").textContent="Dark Mode";
    }
  }
})();
</script>
'''

# Build body
new_body = '<body>\n<h1>Dark Mode Redesigns</h1>\n<p class="subtitle">6 Caption Box Designs - Full Dark Mode Overhaul - June 2026</p>\n' + toggle_html + '\n<div class="grid">\n' + all_cards + '\n</div>\n' + v5_script + '\n' + toggle_script + '\n</body>\n</html>'

# Combine
page = head + '\n' + new_body
page = page.replace('<html lang="it" data-theme="dark">', '<html lang="it" data-theme="light" id="top">')

open('studio-caption-mockups-888.html', 'w').write(page)

# Verify
cards = re.findall(r'<span>([^<]+)</span><span>([^<]+)</span>', page)
print(f'OK: {len(cards)} cards, {len(page)} chars')
for a,b in cards: print(' ', a)
