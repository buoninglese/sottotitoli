import re

with open('/Users/sebastiankrauwel/sottotitoli/index.html') as f:
    c = f.read()

# ============================================================
# STEP 1: Extract all sections
# ============================================================

# Hero
hero_start = c.find('<section class="hero"')
hero_end = c.find('</section>', hero_start) + len('</section>')
hero = c[hero_start:hero_end]

# Intro
intro_start = c.find('<section class="section-intro"')
intro_end = c.find('</section>', intro_start) + len('</section>')

# Section-anchor blocks
blocks = {}
for m in re.finditer(r'<section class="section-anchor[^"]*"[^>]*>.*?</section>', c, re.DOTALL):
    label = re.search(r'block-label">(\d+)', m.group())
    num = label.group(1) if label else '?'
    blocks[int(num)] = (m.start(), m.end(), m.group())

# Footer (block 24 - no section wrapper)
fb_start = c.find('block-label">24')
fb_end = c.find('<script', fb_start)
footer_raw = c[fb_start:fb_end].strip() if fb_start >= 0 else ''

# Script start
scripts_start = c.find('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2">')
if scripts_start < 0:
    scripts_start = c.find('<script>', hero_end)

# ============================================================
# STEP 2: Extract inner content from blocks (card data only)
# ============================================================

def extract_inner(raw):
    """Extract content inside block-wrap, removing block-label and wrapper"""
    # Find start after block-label
    label_end = raw.find('</div>', raw.find('block-label')) + len('</div>')
    inner = raw[label_end:]
    # Remove trailing </div></section>
    inner = re.sub(r'</div>\s*</section>\s*$', '', inner)
    # Remove block-wrap (but keep its content)
    inner = re.sub(r'<div class="block-wrap">', '', inner)
    return inner.strip()

b8_inner = extract_inner(blocks[8][2])
b12_inner = extract_inner(blocks[12][2])
b16_inner = extract_inner(blocks[16][2])
b23_inner = extract_inner(blocks[23][2])
b26_inner = extract_inner(blocks[26][2])

# For lang grid, just take the gh-grid
lang_grid_m = re.search(r'<div class="lang-cards-grid">(.*?)</div>', b16_inner, re.DOTALL)
lang_grid = lang_grid_m.group(0) if lang_grid_m else ''

# Clean footer
footer_clean = re.sub(r'<div class="block-label">[^<]+</div>\n?', '', footer_raw)
footer_clean = footer_clean.strip()

# ============================================================
# STEP 3: Build new unified content
# ============================================================

new_hero = '''<section class="hero">
  <div class="inner">
    <h1>
      I tuoi sottotitoli in tempo reale.
      <span class="subtitle">Microfono, voce, <em>sottotitoli</em>.<br>In 8 lingue. Gratis.</span>
    </h1>
    <p>
      Premi "Avvia" e parla. Sottotitoli trascrive ci\u00f2 che dici in tempo reale,
      lo traduce in un\u2019altra lingua se vuoi, e salva tutto per te. Senza installare nulla.
    </p>
    <a href="studio.html" class="cta-btn">
      Avvia Sottotitoli <span style="font-weight:400;opacity:0.8;">\u2014 \u00e8 gratis</span>
      <span class="arrow">\u2192</span>
    </a>
    <div class="hero-stats">
      <div class="stat"><div class="stat-num">8</div><div class="stat-label">Lingue</div></div>
      <div class="stat"><div class="stat-num">Live</div><div class="stat-label">Trascrizione</div></div>
      <div class="stat"><div class="stat-num">\u2194\ufe0f</div><div class="stat-label">Traduzione</div></div>
      <div class="stat"><div class="stat-num">100%</div><div class="stat-label">Gratis</div></div>
    </div>
  </div>
</section>'''

sections_html = []

# Intro
sections_html.append('''<section class="page-section" style="padding:16px 24px 0;">
  <div class="page-section-inner" style="text-align:center;">
    <p style="font-size:16px;color:var(--text-secondary);line-height:1.7;max-width:620px;margin:0 auto;">
      Usalo per <strong>lezioni</strong>, <strong>riunioni</strong>, <strong>streaming</strong>,
      <strong>presentazioni</strong> o per <strong>imparare una lingua</strong>.<br>
      Ogni sessione viene salvata: ritrovi trascrizioni, vocabolario e report AI su
      <a href="account.html" style="color:var(--accent-purple);font-weight:600;">Account</a>.
    </p>
  </div>
</section>''')

# How it works
sections_html.append('''<section class="page-section page-section-alt">
  <div class="page-section-inner">
    <div class="page-section-header">
      <span class="page-section-tag">Come funziona</span>
      <h2>Tre passaggi, zero configurazione</h2>
      <p class="page-section-sub">Niente account, niente download, niente attese.</p>
    </div>
    ''' + b8_inner + '''
  </div>
</section>''')

# Languages
sections_html.append('''<section class="page-section">
  <div class="page-section-inner">
    <div class="page-section-header">
      <span class="page-section-tag">Lingue supportate</span>
      <h2>8 lingue, trascrizione e traduzione</h2>
      <p class="page-section-sub">Clicca una lingua e inizia subito. Gratis.</p>
    </div>
    ''' + lang_grid + '''
  </div>
</section>''')

# Use cases
sections_html.append('''<section class="page-section page-section-alt">
  <div class="page-section-inner">
    <div class="page-section-header">
      <span class="page-section-tag">Per ogni situazione</span>
      <h2>Quando i sottotitoli cambiano l\u2019esperienza</h2>
      <p class="page-section-sub">Dalla scuola al lavoro, dalla pratica linguistica all\u2019accessibilit\u00e0.</p>
    </div>
    ''' + b26_inner + '''
  </div>
</section>''')

# Testimonials
sections_html.append('''<section class="page-section">
  <div class="page-section-inner">
    <div class="page-section-header">
      <span class="page-section-tag">Chi lo usa</span>
      <h2>Cosa dicono le persone</h2>
      <p class="page-section-sub">Chi prova Sottotitoli lo usa ogni giorno.</p>
    </div>
    ''' + b12_inner + '''
  </div>
</section>''')

# Newsletter
sections_html.append('''<section class="page-section page-section-alt">
  <div class="page-section-inner">
    ''' + b23_inner + '''
  </div>
</section>''')

# Footer
sections_html.append('''<section class="page-section" style="padding-bottom:0;">
  <div class="page-section-inner">
    ''' + footer_clean + '''
  </div>
</section>''')

# ============================================================
# STEP 4: Assemble page
# ============================================================

# Replace hero
c = c[:hero_start] + new_hero + c[hero_end:]

# Find new hero end
new_hero_end = c.find('</section>', hero_start) + len('</section>')

# Replace everything between new hero and scripts
new_middle = '\n\n'.join(sections_html)
c = c[:new_hero_end] + '\n\n' + new_middle + '\n\n' + c[scripts_start:]

# ============================================================
# STEP 5: Add unified CSS
# ============================================================

new_css = '''
    /* ─── Unified page sections ─── */
    .page-section{padding:56px 24px 64px;background:var(--bg)}
    .page-section-alt{background:var(--bg-btn-subtle)}
    .page-section-inner{max-width:900px;margin:0 auto}
    .page-section-header{text-align:center;margin-bottom:32px}
    .page-section-tag{display:inline-flex;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--accent-purple);border:1px solid rgba(124,58,237,0.15);padding:3px 14px;border-radius:100px;background:rgba(124,58,237,0.04);margin-bottom:10px}
    .page-section-header h2{font-size:28px;font-weight:800;letter-spacing:-.5px;color:var(--text-primary);margin-bottom:6px}
    .page-section-sub{font-size:14px;color:var(--text-secondary);max-width:560px;margin:0 auto}
    
    /* Block 8 — how it works */
    .block-8 .inner .track{display:flex;gap:24px;justify-content:center;flex-wrap:wrap}
    .block-8 .step{text-align:left;flex:1;min-width:180px;max-width:260px;padding:24px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px}
    .block-8 .step .dot{width:32px;height:32px;border-radius:8px;background:var(--accent-purple);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-bottom:10px}
    .block-8 .step .dot.outline{background:transparent;border:2px solid var(--accent-purple);color:var(--accent-purple)}
    .block-8 .step h4{font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
    .block-8 .step p{font-size:12px;color:var(--text-secondary);line-height:1.6;margin:0}
    
    /* Block 26 — use cases */
    .block-26 .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
    @media(max-width:660px){.block-26 .grid{grid-template-columns:repeat(2,1fr)}}
    .block-26 .card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px 18px;text-align:center}
    .block-26 .card .emoji{font-size:28px;margin-bottom:8px}
    .block-26 .card h4{font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:4px}
    .block-26 .card p{font-size:12px;color:var(--text-secondary);line-height:1.6;margin:0}
    
    /* Block 12 — testimonials */
    .block-12 .inner{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
    @media(max-width:700px){.block-12 .inner{grid-template-columns:1fr}}
    .block-12 .card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px 20px;transition:box-shadow .15s}
    .block-12 .card:hover{box-shadow:var(--shadow-card)}
    .block-12 .card.featured{background:#7c3aed;border-color:#7c3aed}
    .block-12 .card.featured .text{color:rgba(255,255,255,0.9)}
    .block-12 .card.featured .author .avatar{background:rgba(255,255,255,0.15);color:#fff}
    .block-12 .card.featured .author .info .name{color:#fff}
    .block-12 .card.featured .author .info .role{color:rgba(255,255,255,0.6)}
    .block-12 .card.featured .stars{color:#fbbf24}
    .block-12 .card.featured .quote-icon{color:rgba(255,255,255,0.15)}
    .block-12 .quote-icon{font-size:32px;font-weight:700;color:var(--accent-purple);line-height:1;margin-bottom:6px;opacity:.3;font-family:Georgia,serif}
    .block-12 .stars{font-size:11px;color:#f59e0b;margin-bottom:8px;letter-spacing:1px}
    .block-12 .text{font-size:13px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px}
    .block-12 .author{display:flex;align-items:center;gap:8px}
    .block-12 .avatar{width:32px;height:32px;border-radius:50%;background:var(--bg-btn-subtle);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--text-primary);flex-shrink:0}
    .block-12 .info .name{font-size:12px;font-weight:600;color:var(--text-primary)}
    .block-12 .info .role{font-size:10px;color:var(--text-muted)}
    
    /* Block 23 — newsletter */
    .block-23 .inner{text-align:center;max-width:420px;margin:0 auto}
    .block-23 .icon{font-size:32px;margin-bottom:8px}
    .block-23 h3{font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:6px}
    .block-23 p{font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:18px}
    .block-23 .form{display:flex;gap:8px;max-width:380px;margin:0 auto}
    .block-23 input{flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;background:var(--bg-card);color:var(--text-primary);outline:none}
    .block-23 input:focus{border-color:var(--accent-purple)}
    .block-23 button{padding:10px 20px;border:none;border-radius:8px;background:var(--accent-purple);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:opacity .12s}
    .block-23 button:hover{opacity:0.9}
    .block-23 .footnote{font-size:11px;color:var(--text-muted);margin-top:10px}
    
    /* Block 24 — footer */
    .block-24 .inner{max-width:900px;margin:0 auto}
    .block-24 .grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px}
    @media(max-width:640px){.block-24 .grid{grid-template-columns:1fr 1fr;gap:24px}}
    .block-24 .brand{font-size:18px;font-weight:800;color:var(--text-primary);margin-bottom:8px}
    .block-24 .brand span{color:var(--accent-purple)}
    .block-24 .col p{font-size:12px;color:var(--text-secondary);line-height:1.6;margin:0}
    .block-24 .col h5{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-primary);margin-bottom:14px}
    .block-24 .col a{display:block;font-size:13px;color:var(--text-secondary);text-decoration:none;margin-bottom:8px;transition:color .12s}
    .block-24 .col a:hover{color:var(--accent-purple)}
    .block-24 .bottom{display:flex;justify-content:space-between;align-items:center;margin-top:40px;padding-top:20px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)}
    .block-24 .social{display:flex;gap:12px}
    .block-24 .social a{color:var(--text-muted);text-decoration:none;font-size:12px}
    .block-24 .social a:hover{color:var(--accent-purple)}
'''

c = c.replace('</style>', new_css + '\n  </style>')

# ============================================================
# STEP 6: Clean up leftover junk
# ============================================================

# Remove leftover classes
c = c.replace('section-anchor', 'page-section')
c = c.replace('section-alt', 'page-section-alt')

# Remove old CSS patterns that no longer apply
for pat in [
    r'\.section-divider\{[^}]*\}',
    r'\.section-alt \+ \.section-divider\{[^}]*\}',
    r'\.hero-companies\{[^}]*\}',
    r'\.hero-companies \.label\{[^}]*\}',
    r'\.hero-companies \.logos\{[^}]*\}',
    r'\.hero-companies \.logos span\{[^}]*\}',
]:
    c = re.sub(pat, '', c)

with open('/Users/sebastiankrauwel/sottotitoli/index.html', 'w') as f:
    f.write(c)

# ============================================================
# VERIFY
# ============================================================
print(f"Size: {len(c):,} chars")
print(f"Divs: {c.count('<div')} = {c.count('</div>')} {'OK' if c.count('<div') == c.count('</div>') else 'FAIL'}")
print(f"Scripts: {c.count('<script')} = {c.count('</script>')} {'OK' if c.count('<script') == c.count('</script>') else 'FAIL'}")
print(f"Block labels: {c.count('block-label')}")
print(f"Pricing (block-20): {'block-20' in c}")
print(f"Page sections: {c.count('page-section')}")
print(f"Section-anchor: {'section-anchor' in c}")
