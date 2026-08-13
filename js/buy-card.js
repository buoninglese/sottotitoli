/* ═══════════════════════════════════════════════════════════════
   buy-card.js — Expandable "Acquista minuti" card (panoramica.html)
   · Vanilla FLIP morph: the trigger pill grows into a fullscreen
     card (≈ framer-motion layoutId "cta-card" in the template).
   · Fluid background handled by CSS (.fluid-mesh in card,
     .fluid-rays on the page) from cta-fluid.css.
   · Purchase content mirrors purchase.html; checkout calls the
     create-checkout-session Supabase edge function.
   Load AFTER config.js, auth.js and i18n.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PRICES = {
    starter:  { name: 'Starter',      detail: '60 min · +5 crediti AI',   total: '€4,99',  key: 'sottotitoli_starter'  },
    standard: { name: 'Standard',     detail: '300 min · +20 crediti AI', total: '€14,99', key: 'sottotitoli_standard' },
    premium:  { name: 'Premium',      detail: '900 min · +60 crediti AI', total: '€29,99', key: 'sottotitoli_premium'  },
    credits:  { name: 'Solo Crediti', detail: '<span data-i18n="purchase_credits_desc">100 crediti Report AI</span>', total: '€9,99', key: 'sottotitoli_credits' }
  };
  var FEATS = {
    starter:  [['purchase_feat_5credits', '+5 crediti Report AI']],
    standard: [['purchase_feat_20credits', '+20 crediti Report AI'], ['purchase_feat_unlock', 'Report AI sbloccato']],
    premium:  [['purchase_feat_60credits', '+60 crediti Report AI'], ['purchase_feat_support', 'Supporto prioritario']],
    credits:  []
  };
  var DESCS = {
    starter: '60 minuti totali', standard: '300 minuti totali',
    premium: '900 minuti totali', credits: '100 crediti Report AI'
  };

  var DUR = 520;
  var EASE = 'cubic-bezier(.32,.72,0,1)';
  var PAD = 12;
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var overlay, card, content, gridEl, sumProduct, sumDetail, sumTotal, payBtn;
  var selected = 'standard';
  var isOpen = false;
  var currentTrigger = null;
  var paying = false;
  var prevOverflow = '';

  /* ── helpers ── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function applyI18n(root) {
    if (window.I18n && window.I18n.apply) {
      try { window.I18n.apply(root || document); } catch (e) {}
    }
  }
  function toast(msg) {
    if (typeof window.showToastMsg === 'function') { window.showToastMsg(msg); return; }
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    try { alert(msg); } catch (e) {}
  }
  function tt(key, fallback) {
    if (window.I18n && window.I18n.t) { try { var v = window.I18n.t(key); if (v && v !== key) return v; } catch (e) {} }
    return fallback;
  }
  function lockScroll(lock) {
    if (lock) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = prevOverflow || ''; }
  }
  function targetRect() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var pad = vw < 520 ? 0 : PAD;
    return { x: pad, y: pad, w: vw - pad * 2, h: vh - pad * 2 };
  }

  /* ── card markup (purchase.html content, restyled for the card) ── */
  function featsHtml(k) {
    return (FEATS[k] || []).map(function (f) {
      return '<li><span data-i18n="' + f[0] + '">' + esc(f[1]) + '</span></li>';
    }).join('');
  }
  function productCards() {
    var order = ['starter', 'standard', 'premium', 'credits'];
    var html = '';
    order.forEach(function (k) {
      var p = PRICES[k];
      var nameKey = 'purchase_' + k + (k === 'credits' ? '_only' : '');
      html += '<div class="buy-product' + (selected === k ? ' selected' : '') + '" data-key="' + k + '">' +
        (k === 'credits' ? '<span class="buy-badge" data-i18n="purchase_popular">Più scelto</span>' : '') +
        '<h3 class="buy-pname" data-i18n="' + nameKey + '">' + esc(p.name) + '</h3>' +
        '<div class="buy-price">' + esc(p.total) + '</div>' +
        '<p class="buy-pinfo" data-i18n="purchase_' + k + '_desc">' + esc(DESCS[k]) + '</p>' +
        '<ul class="buy-feats">' + featsHtml(k) + '</ul>' +
        '</div>';
    });
    return html;
  }

  function buildCard() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'buy-overlay';
    overlay.id = 'buyOverlay';
    overlay.innerHTML =
      '<div class="buy-card" id="buyCard" role="dialog" aria-modal="true" aria-label="Acquista minuti">' +
        '<div class="fluid-mesh" aria-hidden="true">' +
          '<span class="mesh-blob m1"></span><span class="mesh-blob m2"></span>' +
          '<span class="mesh-blob m3"></span><span class="mesh-blob m4"></span>' +
          '<span class="mesh-blob m5"></span><span class="mesh-blob m6"></span>' +
        '</div>' +
        '<button type="button" class="buy-close" aria-label="Chiudi">✕</button>' +
        '<div class="buy-card-content" id="buyCardContent">' +
          '<div class="buy-inner">' +
            '<div class="buy-hero">' +
              '<span class="buy-tag">🛡️&nbsp;<span data-i18n="purchase_secure">Acquisto Sicuro</span></span>' +
              '<h2 class="buy-title" data-i18n="purchase_title">Aggiungi minuti e crediti</h2>' +
              '<div class="buy-trust">' +
                '<span class="buy-trust-item"><span class="buy-dot"></span><span data-i18n="purchase_tls">Crittografia TLS</span></span>' +
                '<span class="buy-trust-item"><span class="buy-dot"></span><span data-i18n="purchase_pci">PCI-DSS Level 1</span></span>' +
                '<span class="buy-trust-item"><span class="buy-dot"></span><span data-i18n="purchase_nostore">Dati carta mai salvati</span></span>' +
                '<span class="buy-trust-item"><span class="buy-dot"></span><span data-i18n="purchase_stripe">Pagamento Stripe</span></span>' +
              '</div>' +
            '</div>' +
            '<div class="buy-grid" id="buyGrid">' + productCards() + '</div>' +
            '<div class="buy-bottom">' +
              '<div class="buy-panel">' +
                '<h3 class="buy-sub" data-i18n="purchase_howto">Come funziona</h3>' +
                '<p class="buy-info-text" data-i18n="purchase_howto_text">Scegli uno dei quattro pacchetti qui sopra. I minuti sono utilizzabili per caption e traduzione. I crediti AI servono per generare Report AI dopo le sessioni. I minuti e i crediti non scadono mai.</p>' +
              '</div>' +
              '<div class="buy-panel">' +
                '<div class="buy-sumline"><span class="lbl" data-i18n="purchase_product">Prodotto</span><span class="val" id="sumProduct"><span data-i18n="purchase_standard">Standard</span></span></div>' +
                '<div class="buy-sumline"><span class="lbl" data-i18n="purchase_includes">Include</span><span class="val" id="sumDetail">300 min · +20 crediti AI</span></div>' +
                '<div class="buy-total-row"><span class="buy-total" id="sumTotal">€14,99</span>' +
                '<button type="button" class="buy-btn" id="buyPayBtn"><span data-i18n="purchase_pay_btn">Vai al pagamento →</span></button></div>' +
              '</div>' +
            '</div>' +
            '<div class="buy-legal">' +
              '<div class="buy-legal-card"><h4 data-i18n="purchase_terms">Termini e Condizioni</h4><p data-i18n="purchase_terms_text">I minuti acquistati sono utilizzabili per caption e traduzione in tempo reale. I crediti AI sono dedicati esclusivamente alla generazione di Report AI. Il pagamento è gestito da Stripe. I crediti sono associati al tuo account e non sono trasferibili.</p></div>' +
              '<div class="buy-legal-card"><h4 data-i18n="purchase_privacy">Informativa Privacy</h4><p data-i18n="purchase_privacy_text">Trattiamo i tuoi dati personali nel rispetto del GDPR. Raccogliamo esclusivamente email, nome e storico acquisti. I dati di pagamento sono gestiti interamente da Stripe e non transitano sui nostri server.</p></div>' +
              '<div class="buy-legal-card"><h4 data-i18n="purchase_refunds">Rimborsi</h4><p data-i18n="purchase_refunds_text">Hai diritto a 14 giorni di recesso se meno del 10% dei crediti è stato utilizzato. I crediti acquistati non scadono. In caso di problemi tecnici che impediscono l\'uso del servizio, hai diritto a un rimborso proporzionale.</p></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    card = document.getElementById('buyCard');
    content = document.getElementById('buyCardContent');
    gridEl = document.getElementById('buyGrid');
    sumProduct = document.getElementById('sumProduct');
    sumDetail = document.getElementById('sumDetail');
    sumTotal = document.getElementById('sumTotal');
    payBtn = document.getElementById('buyPayBtn');

    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeBuy(); });
    card.querySelector('.buy-close').addEventListener('click', closeBuy);
    gridEl.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('.buy-product') : null;
      if (el) selectProduct(el.getAttribute('data-key'));
    });
    payBtn.addEventListener('click', goToCheckout);
    document.addEventListener('keydown', function (e) { if (isOpen && e.key === 'Escape') closeBuy(); });

    selectProduct(selected);
    applyI18n();
  }

  /* ── selection / summary (mirrors purchase.html selectProduct) ── */
  function selectProduct(key) {
    if (!PRICES[key]) key = 'standard';
    selected = key;
    var p = PRICES[key];
    var items = gridEl ? gridEl.querySelectorAll('.buy-product') : [];
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('selected', items[i].getAttribute('data-key') === key);
    }
    if (sumProduct) {
      sumProduct.innerHTML = '<span data-i18n="purchase_' + key + (key === 'credits' ? '_only' : '') + '">' + esc(p.name) + '</span>';
    }
    if (sumDetail) sumDetail.innerHTML = p.detail;
    if (sumTotal) sumTotal.textContent = p.total;
    applyI18n();
  }

  /* ── morph: open / close ── */
  function morphTransform(trigger, t) {
    var r = trigger ? trigger.getBoundingClientRect() : null;
    if (!r || !r.width || !r.height) return null;
    var sx = r.width / t.w;
    var sy = r.height / t.h;
    return 'translate(' + (r.left - t.x) + 'px,' + (r.top - t.y) + 'px) scale(' + sx + ',' + sy + ')';
  }

  function openBuy(trigger) {
    if (isOpen) return;
    buildCard();
    currentTrigger = trigger || null;
    isOpen = true;

    var t = targetRect();
    card.style.left = t.x + 'px';
    card.style.top = t.y + 'px';
    card.style.width = t.w + 'px';
    card.style.height = t.h + 'px';
    card.style.borderRadius = '24px';
    overlay.classList.add('open');
    lockScroll(true);

    var from = reducedMotion ? null : morphTransform(trigger, t);
    if (!from) { card.style.transform = 'none'; return; }

    void card.offsetWidth; /* ensure layout before animating */
    card.animate(
      [
        { transform: from, borderRadius: '100px' },
        { transform: 'none', borderRadius: '24px' }
      ],
      { duration: DUR, easing: EASE, fill: 'both' }
    );
  }

  function closeBuy() {
    if (!isOpen) return;
    isOpen = false;
    var t = targetRect();

    var finish = function () {
      overlay.classList.remove('open');
      card.style.transform = 'none';
      lockScroll(false);
      currentTrigger = null;
    };

    var to = reducedMotion ? null : morphTransform(currentTrigger, t);
    if (!to) { finish(); return; }

    var anim = card.animate(
      [
        { transform: 'none', borderRadius: '24px' },
        { transform: to, borderRadius: '100px' }
      ],
      { duration: DUR, easing: EASE, fill: 'both' }
    );
    var done = false;
    var safeFinish = function () { if (!done) { done = true; finish(); } };
    anim.onfinish = safeFinish;
    /* Fallback so the overlay can never stick (e.g. background-tab
       throttling can delay/pause WAAPI onfinish). */
    setTimeout(safeFinish, DUR + 120);
  }

  /* ── checkout ── */
  function getSessionUser() {
    return new Promise(function (resolve) {
      var sb = window.sottotitoliSupabase;
      if (!sb || !sb.auth) { resolve(null); return; }
      Promise.resolve(sb.auth.getSession()).then(function (r) {
        var s = r && ((r.data && r.data.session) || r.session);
        resolve(s && s.user ? { user: s.user, token: s.access_token } : null);
      }).catch(function () { resolve(null); });
    });
  }

  function goToCheckout() {
    if (paying || !payBtn) return;
    var cfg = window.SOTTOTITOLI_CONFIG;
    var fnUrl = cfg && cfg.stripe && cfg.stripe.checkoutFunctionUrl;
    if (!fnUrl) { toast(tt('purchase_error', 'Errore durante il pagamento. Riprova.')); return; }

    paying = true;
    payBtn.disabled = true;
    var orig = payBtn.innerHTML;
    payBtn.innerHTML = '<span data-i18n="purchase_redirecting">Reindirizzamento a Stripe…</span>';
    applyI18n(payBtn);

    var base = window.location.origin + window.location.pathname;
    getSessionUser().then(function (auth) {
      if (!auth || !auth.token) {
        throw new Error('NO_SESSION');
      }
      var user = auth.user;
      return fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + auth.token
        },
        body: JSON.stringify({
          product: PRICES[selected].key,
          userId: user ? user.id : undefined,
          email: user ? user.email : undefined,
          successUrl: base + '?payment=success',
          cancelUrl: base + '?payment=cancelled'
        })
      }).then(function (r) { return r.json(); });
    }).then(function (data) {
      if (data && data.url) { window.location.href = data.url; return; }
      throw new Error((data && data.error) || 'Checkout error');
    }).catch(function (err) {
      console.error('buy-card checkout error', err);
      paying = false;
      if (payBtn) { payBtn.disabled = false; payBtn.innerHTML = orig; }
      applyI18n(payBtn);
      if (err && err.message === 'NO_SESSION') {
        toast(tt('purchase_login', 'Effettua il login per acquistare.'));
      } else {
        toast(tt('purchase_error', 'Errore durante il pagamento. Riprova.'));
      }
    });
  }

  /* ── trigger binding ── */
  function bindTriggers() {
    var els = document.querySelectorAll('[data-buy-trigger]');
    for (var i = 0; i < els.length; i++) {
      els[i].addEventListener('click', function (e) {
        e.preventDefault();
        var ud = document.getElementById('userDropdown');
        if (ud) ud.classList.remove('open');
        openBuy(this);
      });
    }
  }

  function mountRays() {
    if (document.querySelector('.fluid-rays')) return;
    var host = document.querySelector('.main-panel') || document.body;
    var div = document.createElement('div');
    div.className = 'fluid-rays';
    div.setAttribute('aria-hidden', 'true');
    host.insertBefore(div, host.firstChild);
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { bindTriggers(); mountRays(); });
    } else {
      bindTriggers();
      mountRays();
    }
  }

  window.openBuyCard = openBuy;
  window.closeBuyCard = closeBuy;
  init();
})();
