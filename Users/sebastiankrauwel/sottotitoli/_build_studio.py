import re

with open("studio.html") as f:
    c = f.read()

# ============================================================
# 1. Fix logo link to index.html
# ============================================================
c = c.replace('<a href="#" class="logo">Sotto', '<a href="index.html" class="logo">Sotto')
c = c.replace('<div class="footer-logo">Sotto', '<a href="index.html" class="footer-logo">Sotto')
c = c.replace('Sotto<span>titoli</span></div>', 'Sotto<span>titoli</span></a>')

# ============================================================
# 2. Remove caption buttons section from translate tab
# ============================================================
translate_start = c.find('id="tabTranslate"')
first_qp = c.find('<div class="quick-pairs-section">', translate_start)
second_qp = c.find('<div class="quick-pairs-section">', first_qp + 1)
caption_section = c[first_qp:second_qp]
c = c.replace(caption_section, '')

# ============================================================
# 3. Add caption buttons into caption tab
# ============================================================
caption_buttons = '''
    <div class="quick-pairs-section" style="margin-top:24px;">
      <div class="qp-header">
        <h4><i class="fas fa-bolt"></i> Sottotitoli in tempo reale</h4>
        <p>Scegli la lingua e inizia subito a leggere i sottotitoli.</p>
      </div>
      <div class="lm-grid lm-grid-full">
        <a class="lm-card" href="app.html?mode=caption-en"><div class="lm-flag">UK</div><div class="lm-name">Inglese</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-it"><div class="lm-flag">IT</div><div class="lm-name">Italiano</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-fr"><div class="lm-flag">FR</div><div class="lm-name">Francese</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-de"><div class="lm-flag">DE</div><div class="lm-name">Tedesco</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-es"><div class="lm-flag">ES</div><div class="lm-name">Spagnolo</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-nl"><div class="lm-flag">NL</div><div class="lm-name">Olandese</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-pt"><div class="lm-flag">PT</div><div class="lm-name">Portoghese</div><div class="lm-sub">Sottotitoli</div></a>
        <a class="lm-card" href="app.html?mode=caption-pl"><div class="lm-flag">PL</div><div class="lm-name">Polacco</div><div class="lm-sub">Sottotitoli</div></a>
      </div>
    </div>
  </div>'''

c = c.replace('  <!-- TRANSLATE -->', caption_buttons + '\n  <!-- TRANSLATE -->')

# ============================================================
# 4. Reorganize translate pairs by source language
# ============================================================
langs = [
    ("EN", "UK", "Inglese"),
    ("IT", "IT", "Italiano"),
    ("FR", "FR", "Francese"),
    ("DE", "DE", "Tedesco"),
    ("ES", "ES", "Spagnolo"),
    ("NL", "NL", "Olandese"),
    ("PT", "PT", "Portoghese"),
    ("PL", "PL", "Polacco"),
]

translate_blocks_html = ''
for src_code, src_flag, src_name in langs:
    targets = [(code, flag, name) for code, flag, name in langs if code != src_code]
    translate_blocks_html += '      <div class="translate-source-block">\n'
    translate_blocks_html += f'        <div class="tsb-header"><span class="tsb-flag">{src_flag}</span><span class="tsb-name">{src_name}</span></div>\n'
    translate_blocks_html += '        <div class="tsb-grid">\n'
    for tgt_code, tgt_flag, tgt_name in targets:
        mode = f'translate-{src_code.lower()}-{tgt_code.lower()}'
        translate_blocks_html += f'          <a class="tsb-card" href="app.html?mode={mode}">\n'
        translate_blocks_html += f'            <span class="tsb-flags">{src_flag}  {tgt_flag}</span>\n'
        translate_blocks_html += f'            <span class="tsb-langs">{src_name}  {tgt_name}</span>\n'
        translate_blocks_html += '          </a>\n'
    translate_blocks_html += '        </div>\n'
    translate_blocks_html += '      </div>\n'

old_coppie = '''    <div class="quick-pairs-section">
      <div class="qp-header">
        <h4><i class="fas fa-language"></i> Coppie di traduzione</h4>
        <p>Parla in una lingua, leggi i sottotitoli in un'altra.</p>
      </div>
      <div class="lm-grid">
        
        <a class="lm-card" href="app.html?mode=translate-en-it">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Italiano</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-it-en">
          <div class="lm-flag">IT</div>
          <div class="lm-name">Italiano . Inglese</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-es">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Spagnolo</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-fr">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Francese</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-de">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Tedesco</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-pt">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Portoghese</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-nl">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Olandese</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-en-pl">
          <div class="lm-flag">UK</div>
          <div class="lm-name">Inglese . Polacco</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-es-it">
          <div class="lm-flag">ES</div>
          <div class="lm-name">Spagnolo . Italiano</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-fr-it">
          <div class="lm-flag">FR</div>
          <div class="lm-name">Francese . Italiano</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
        <a class="lm-card" href="app.html?mode=translate-de-en">
          <div class="lm-flag">DE</div>
          <div class="lm-name">Tedesco . Inglese</div>
          <div class="lm-sub">Traduzione live</div>
        </a>
      </div>
    </div>'''

new_coppie = f'''    <div class="quick-pairs-section">
      <div class="qp-header">
        <h4><i class="fas fa-language"></i> Coppie di traduzione</h4>
        <p>Parla in una lingua, leggi i sottotitoli in un'altra. Clicca una coppia per iniziare.</p>
      </div>
      <div class="translate-blocks">
{translate_blocks_html}      </div>
    </div>'''

c = c.replace(old_coppie, new_coppie)

# ============================================================
# 5. Replace integrations section with buyable reports
# ============================================================
integrations_start = c.find('<!-- INTEGRATIONS')
sec_tag = c.find('<section class="integrations-section">', integrations_start)
sec_end = c.find('</section>', sec_tag) + len('</section>')
old_integrations = c[sec_tag:sec_end]

new_reports = '''<section class="reports-shop-section">
  <span class="section-label">AI Reports</span>
  <h2 style="font-size:38px;font-weight:700;color:var(--text-primary);margin-bottom:8px;line-height:1.05;letter-spacing:-1px;">Analisi avanzate per chi vuole di pi</h2>
  <p class="section-subtitle">Esegui report AI approfonditi sulle tue sessioni. Scegli un pacchetto e ottieni analisi personalizzate su grammatica, lessico e stile.</p>

  <div class="reports-shop-grid">
    <div class="report-card">
      <div class="report-icon">CHART</div>
      <div class="report-badge">Business</div>
      <h4>Business Report</h4>
      <p class="report-desc">Analisi della comunicazione professionale: chiarezza, assertivit, efficacia nei meeting e nella scrittura formale.</p>
      <div class="report-price">1 credito</div>
      <ul class="report-features">
        <li>OK Struttura del discorso</li>
        <li>OK Chiarezza e concisione</li>
        <li>OK Tono e formalit</li>
        <li>OK Efficacia comunicativa</li>
      </ul>
      <a href="#" class="report-btn">Acquista report</a>
    </div>

    <div class="report-card featured">
      <div class="report-icon">BOOK</div>
      <div class="report-badge">Linguistic</div>
      <h4>Linguistic Report</h4>
      <p class="report-desc">Analisi grammaticale completa: errori, pattern, aree di miglioramento con suggerimenti mirati.</p>
      <div class="report-price">2 crediti</div>
      <ul class="report-features">
        <li>OK Errori grammaticali</li>
        <li>OK Pattern ricorrenti</li>
        <li>OK Aree di miglioramento</li>
        <li>OK Suggerimenti mirati</li>
      </ul>
      <a href="#" class="report-btn">Acquista report</a>
    </div>

    <div class="report-card">
      <div class="report-icon">HAT</div>
      <div class="report-badge">Cambridge</div>
      <h4>Cambridge Report</h4>
      <p class="report-desc">Preparazione esami Cambridge: analisi basata sui quadri CEFR con valutazione per skill linguistiche.</p>
      <div class="report-price">3 crediti</div>
      <ul class="report-features">
        <li>OK Allineamento CEFR</li>
        <li>OK Valutazione per skill</li>
        <li>OK Gap analysis</li>
        <li>OK Piano di studio</li>
      </ul>
      <a href="#" class="report-btn">Acquista report</a>
    </div>
  </div>
</section>'''

c = c.replace(old_integrations, new_reports)

# ============================================================
# 6. Add CSS
# ============================================================
new_css = '''
    /* Translate blocks (grouped by source) */
    .translate-blocks{display:flex;flex-direction:column;gap:24px}
    .tsb-header{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .tsb-flag{font-size:22px}
    .tsb-name{font-size:15px;font-weight:600;color:var(--text-primary)}
    .tsb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
    .tsb-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 12px;background:var(--bg-card);border:1.5px solid var(--border-btn);border-radius:10px;text-decoration:none;transition:all .15s}
    .tsb-card:hover{border-color:var(--accent-blue);box-shadow:0 2px 12px rgba(37,99,235,0.1);transform:translateY(-1px)}
    .tsb-flags{font-size:22px;line-height:1}
    .tsb-langs{font-size:11px;font-weight:500;color:var(--text-secondary);text-align:center}
    @media(max-width:500px){.tsb-grid{grid-template-columns:repeat(2,1fr)}}

    /* Reports shop */
    .reports-shop-section{text-align:center;padding:80px 24px;max-width:960px;margin:0 auto}
    .reports-shop-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px}
    @media(max-width:700px){.reports-shop-grid{grid-template-columns:1fr}}
    .report-card{background:var(--bg-card);border:1.5px solid var(--border-btn);border-radius:14px;padding:24px 20px;text-align:center;transition:all .15s;display:flex;flex-direction:column}
    .report-card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.04);transform:translateY(-2px)}
    .report-card.featured{border-color:var(--accent-purple);box-shadow:0 0 0 1px var(--accent-purple)}
    .report-icon{font-size:36px;margin-bottom:8px}
    .report-badge{display:inline-flex;font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent-purple);border:1px solid rgba(124,58,237,0.15);padding:2px 12px;border-radius:100px;background:rgba(124,58,237,0.04);margin-bottom:12px}
    .report-card h4{font-size:18px;font-weight:700;color:var(--text-primary);margin-bottom:8px}
    .report-desc{font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px}
    .report-price{font-size:13px;font-weight:600;color:var(--accent-purple);background:rgba(124,58,237,0.06);padding:4px 14px;border-radius:100px;display:inline-flex;margin-bottom:12px}
    .report-features{list-style:none;padding:0;margin:0 0 20px;text-align:left;font-size:12px;color:var(--text-secondary);line-height:2}
    .report-btn{display:inline-flex;padding:10px 24px;background:var(--accent-purple);color:#fff;border-radius:100px;font-size:13px;font-weight:600;text-decoration:none;transition:opacity .15s;margin-top:auto}
    .report-btn:hover{opacity:.9}
'''

style_end = c.find('</style>')
c = c[:style_end] + new_css + '\n  ' + c[style_end:]

with open("studio.html", "w") as f:
    f.write(c)

d = c.count('<div') == c.count('</div>')
s = c.count('<section') == c.count('</section>')
cards = len(re.findall(r'class=.report-card', c))
tsb = c.count('tsb-card')
print(f"Divs: {'OK' if d else 'FAIL'}")
print(f"Sections: {'OK' if s else 'FAIL'}")
print(f"tsb-card count: {tsb}")
print(f"report-card count: {cards}")
