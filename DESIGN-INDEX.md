# index.html — Complete Design Spec (self-contained)

> Feed this entire file to an AI design agent. It contains all CSS, HTML structure,
> design tokens, component specs, and responsive behavior for the landing page.
> No external CSS dependencies for layout — this page is fully standalone.

---

## PART 1: COMPLETE CSS (inline `<style>` block)

```css
/* ═══ DESIGN TOKENS ═══ */
:root{
  --bg:#050810;
  --surface:rgba(255,255,255,.03);
  --text:#f8fafc;
  --text-secondary:rgba(226,232,240,.70);
  --accent:#22d3ee;
  --accent-glow:rgba(34,211,238,.35);
  --radius:14px;
  --radius-pill:999px;
  --t-micro:180ms cubic-bezier(.2,.8,.2,1);
  --t-lift:280ms cubic-bezier(.34,1.56,.64,1);
  --t-surface:500ms cubic-bezier(.2,.8,.2,1);
}

/* ═══ GLOBAL RESET ═══ */
*,*::before,*::after{box-sizing:border-box}
::selection{background:rgba(34,211,238,.22);color:#fff}
html{scrollbar-width:thin;scrollbar-color:rgba(34,211,238,.15) transparent}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(34,211,238,.15);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(34,211,238,.28)}

body{
  margin:0;background:var(--bg);color:var(--text);
  font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  min-height:100dvh;overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;
}

/* ═══ BACKGROUND LAYERS (z-index stack) ═══ */
/* -2: crossfading bg images, -1: vignette, 9000: inset border frame, 9996: noise grain */
.bg-xf-a,.bg-xf-b{position:fixed;inset:0;z-index:-2;background-size:cover;background-position:center}
.bg-xf-a{background-image:linear-gradient(to bottom,rgba(5,8,16,.75) 0%,rgba(5,8,16,.20) 50%,rgba(5,8,16,.92) 100%),url('img/bg-home.png');animation:bgFade14s linear infinite;animation-delay:0s}
.bg-xf-b{background-image:linear-gradient(to bottom,rgba(5,8,16,.50) 0%,rgba(5,8,16,.10) 50%,rgba(5,8,16,.88) 100%),url('img/bg-home.png');animation:bgFade14s linear infinite;animation-delay:-7s;opacity:0}
@keyframes bgFade14s{0%,45%,100%{opacity:1}50%,95%{opacity:0}}
.bg-overlay{position:fixed;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(to bottom,var(--bg) 0%,transparent 35%,transparent 65%,var(--bg) 100%)}
.page-border{position:fixed;inset:0;z-index:9000;pointer-events:none;border-radius:22px;margin:11px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),inset 0 0 100px rgba(0,0,0,.35);transition:box-shadow var(--t-surface)}
.noise-overlay{position:fixed;inset:0;z-index:9996;pointer-events:none;opacity:.028;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");background-repeat:repeat;background-size:150px}

:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:inherit}

/* ═══ TOP BAR ═══ */
.topbar{position:fixed;top:20px;left:20px;right:20px;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 22px;height:72px;background:transparent}
.topbar-right{display:flex;align-items:center;gap:10px}
.topbar-brand{display:flex;align-items:center;gap:10px;font-family:'Manrope',sans-serif;font-weight:700;font-size:17px;color:#fff;text-decoration:none;letter-spacing:-0.02em}
.topbar-login{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:10px;background:rgba(0,0,0,.25);color:#fff;font-size:13px;font-weight:600;border:1px solid rgba(255,255,255,.25);cursor:pointer;font-family:'Inter',sans-serif;text-decoration:none;text-shadow:0 1px 4px rgba(0,0,0,.3);transition:border-color var(--t-micro),background var(--t-micro),transform var(--t-lift)}
.topbar-login:hover{border-color:rgba(255,255,255,.5);background:rgba(0,0,0,.4);transform:translateY(-1px)}
.topbar-login:active{transform:translateY(0) scale(.98)}

/* ═══ SLIDE SYSTEM ═══ */
.stage-root{position:relative;z-index:2;width:100%;height:100dvh;min-height:100dvh;overflow:hidden}
.stage-track{position:relative;width:100%;height:100dvh}
.slide{position:absolute;top:0;left:0;width:100%;height:100dvh;display:flex;align-items:center;padding:100px 40px 80px;opacity:0;pointer-events:none;z-index:1;transform:scale(1.015);transition:opacity 1100ms cubic-bezier(.25,.1,.25,1),transform 1200ms cubic-bezier(.25,.1,.25,1)}
.slide.active{opacity:1;pointer-events:auto;z-index:2;transform:scale(1)}
.slide .text-side{transform:translateY(24px);opacity:0;transition:transform 900ms cubic-bezier(.25,.1,.25,1) 150ms,opacity 800ms cubic-bezier(.25,.1,.25,1) 150ms}
.slide.active .text-side{transform:translateY(0);opacity:1}
.slide .media-side{transform:translateY(-14px) scale(.98);opacity:0;transition:transform 1000ms cubic-bezier(.25,.1,.25,1) 200ms,opacity 900ms cubic-bezier(.25,.1,.25,1) 200ms}
.slide.active .media-side{transform:translateY(0) scale(1);opacity:1}
.slide-hero .container{justify-content:center}
.slide-hero .text-side{max-width:640px;text-align:center}

/* ═══ CONTENT LAYOUT ═══ */
.container{display:flex;align-items:center;justify-content:space-between;width:100%;max-width:1160px;margin:0 auto;gap:56px}
.text-side{flex:1.15;max-width:520px}
.media-side{flex:1;display:flex;justify-content:center;align-items:center}

/* ═══ TYPOGRAPHY ═══ */
.eyebrow{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:rgba(226,232,240,.55);margin-bottom:14px}
.headline{font-family:'Manrope',sans-serif;font-weight:800;color:#fff;letter-spacing:-0.02em;line-height:1.1;margin:0 0 16px;overflow:visible}
h1.headline{font-size:clamp(38px,5.5vw + 12px,68px)}
h2.headline{font-size:clamp(28px,3.8vw + 10px,48px)}
.body-text{font-family:'Inter',sans-serif;font-size:16px;font-weight:400;color:rgba(255,255,255,.78);line-height:1.65;letter-spacing:.01em;max-width:520px;margin-left:auto;margin-right:auto;text-wrap:balance;margin-bottom:30px}

/* ═══ BUTTONS ═══ */
.continua-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:var(--radius-pill);color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:500;text-decoration:none;cursor:pointer;transition:background var(--t-micro),border-color var(--t-micro),transform var(--t-lift),box-shadow var(--t-micro)}
.continua-btn:hover{background:rgba(255,255,255,.10);border-color:rgba(34,211,238,.20);transform:translateY(-1px);box-shadow:0 0 24px rgba(34,211,238,.08),0 8px 24px rgba(0,0,0,.20)}
.continua-btn:active{transform:translateY(0) scale(.96);box-shadow:inset 0 2px 8px rgba(0,0,0,.25)}
.slide-cta-btn{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);z-index:50;display:inline-flex;align-items:center;gap:10px;height:48px;padding:0 24px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:var(--radius-pill);color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;text-decoration:none;cursor:pointer;opacity:0;pointer-events:none;transition:opacity 800ms cubic-bezier(.25,.1,.25,1),background var(--t-micro),border-color var(--t-micro),transform var(--t-lift),box-shadow var(--t-micro)}
.slide-cta-btn.is-visible{opacity:1;pointer-events:auto}
.slide-cta-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(34,211,238,.25);transform:translateX(-50%) translateY(-1px);box-shadow:0 0 24px rgba(34,211,238,.08),0 8px 24px rgba(0,0,0,.20)}
.slide-cta-btn:active{transform:translateX(-50%) translateY(0) scale(.96)}
.pill-arrow{display:inline-block;transition:transform var(--t-lift)}
.continua-btn:hover .pill-arrow{transform:translateX(4px)}

/* ═══ PHONE MOCKUP (slide 2) ═══ */
.phone-base{position:relative;width:250px;height:520px;background:rgba(6,9,18,.92);border-radius:24px;border:1px solid rgba(255,255,255,.10);box-shadow:0 30px 70px rgba(0,0,0,.50),0 0 0 1px rgba(34,211,238,.03),inset 0 1px 0 rgba(255,255,255,.05);overflow:hidden;animation:phoneRise 1600ms cubic-bezier(.2,.8,.2,1) forwards;opacity:0;transform:translateY(36px)}
.phone-notch{position:absolute;top:0;left:50%;transform:translateX(-50%);width:110px;height:26px;background:#000;border-radius:0 0 12px 12px;z-index:10}
.phone-screen{position:absolute;inset:8px;border-radius:20px;background:rgba(0,0,0,.40);overflow:hidden;display:flex;flex-direction:column;box-shadow:inset 0 0 30px rgba(0,0,0,.20)}
.phone-time{position:absolute;top:10px;left:0;right:0;text-align:center;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;color:rgba(255,255,255,.50);letter-spacing:.06em;z-index:5}
.phone-screen-content{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:20px;text-align:center}
.caption-sublabel{font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;color:var(--accent);letter-spacing:.18em;margin-bottom:6px}
.caption-line{font-family:'Inter',sans-serif;font-size:14px;font-weight:500;color:rgba(255,255,255,.90);line-height:1.45;opacity:0;transform:translateY(6px)}
.caption-line.is-visible{opacity:.90;transform:translateY(0)}
.phone-footer{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;background:rgba(0,0,0,.40);border-top:1px solid rgba(255,255,255,.05)}
.phone-brand{font-family:'Manrope',sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,.75)}
@keyframes phoneRise{to{opacity:1;transform:translateY(0)}}

/* ═══ SLIDE NAVIGATION ═══ */
.controls{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;z-index:100}
.arrow-btn{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:var(--radius-pill);color:rgba(255,255,255,.60);cursor:pointer;transition:background var(--t-micro),border-color var(--t-micro),transform var(--t-lift),color var(--t-micro),box-shadow var(--t-micro)}
.arrow-btn:hover{background:rgba(255,255,255,.10);border-color:rgba(34,211,238,.20);transform:translateY(-1px);color:#fff;box-shadow:0 0 0 3px rgba(34,211,238,.08),0 8px 24px rgba(0,0,0,.20)}
.arrow-btn:active{transform:translateY(0) scale(.95)}
.control-dots{display:flex;align-items:center;gap:8px;padding:5px 11px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:var(--radius-pill)}
.control-dots .dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.18);cursor:pointer;position:relative;transition:background var(--t-micro),box-shadow var(--t-micro),transform var(--t-lift);border:none;padding:0}
.control-dots .dot::after{content:"";position:absolute;inset:-10px}
.control-dots .dot:hover{background:rgba(255,255,255,.32);box-shadow:0 0 0 2px rgba(255,255,255,.12);transform:translateY(-1px)}
.control-dots .dot.active{background:var(--accent);box-shadow:0 0 0 2px var(--accent),0 0 12px var(--accent-glow);animation:dotPulse 2s ease-in-out infinite}
@keyframes dotPulse{0%,100%{box-shadow:0 0 0 2px var(--accent),0 0 8px rgba(34,211,238,.25)}50%{box-shadow:0 0 0 3px var(--accent),0 0 16px rgba(34,211,238,.45)}}

/* ═══ SUBTITLE STREAM FRAME (slide 2, desktop only) ═══ */
.subtitle-stream-frame{position:relative;width:100%;max-width:480px;padding:32px;border-radius:18px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-top:1px solid rgba(34,211,238,.06);box-shadow:0 24px 60px rgba(0,0,0,.30),inset 0 1px 0 rgba(255,255,255,.04);display:flex;flex-direction:column;gap:24px;backdrop-filter:blur(16px) saturate(1.1);-webkit-backdrop-filter:blur(16px) saturate(1.1);opacity:0;transition:opacity 800ms cubic-bezier(.25,.1,.25,1)}
.subtitle-line{display:flex;align-items:flex-start;gap:14px;opacity:0;transform:translateY(12px) scale(.98);filter:blur(3px);transition:opacity 600ms cubic-bezier(.25,.1,.25,1),transform 650ms cubic-bezier(.34,1.56,.64,1);will-change:transform,opacity}
.subtitle-line.is-visible{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}
.accent-bar{width:2px;flex-shrink:0;border-radius:2px;align-self:stretch;background:linear-gradient(to bottom,var(--accent),rgba(34,211,238,0));box-shadow:0 0 8px rgba(34,211,238,.12);opacity:0;transform:scaleY(0);transform-origin:top;transition:opacity 600ms cubic-bezier(.25,.1,.25,1) 120ms,transform 700ms cubic-bezier(.34,1.56,.64,1) 120ms;min-height:44px}
.subtitle-line.is-visible .accent-bar{opacity:1;transform:scaleY(1)}
.line-content{display:flex;flex-direction:column;gap:5px;padding-top:2px}
.lang-it{font-family:'Manrope',sans-serif;font-size:18px;font-weight:500;color:rgba(255,255,255,.88);line-height:1.55;letter-spacing:0;max-width:440px;text-wrap:balance}
.lang-en{font-family:'Inter',sans-serif;font-size:13px;font-weight:400;color:rgba(255,255,255,.42);line-height:1.4;letter-spacing:.01em}
.stream-indicator{display:flex;gap:5px;justify-content:center;align-items:center;margin-top:2px}
.stream-indicator span{display:block;width:4px;height:4px;border-radius:50%;background:rgba(34,211,238,.25);animation:streamPulse 1.6s cubic-bezier(.2,.8,.2,1) infinite both}
.stream-indicator span:nth-child(1){animation-delay:0s}
.stream-indicator span:nth-child(2){animation-delay:.25s}
.stream-indicator span:nth-child(3){animation-delay:.5s}
@keyframes streamPulse{0%,100%{opacity:.25;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}

/* ═══ FEATURE GRID (slide 3) ═══ */
.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;max-width:460px}
.feature-chip{position:relative;display:flex;flex-direction:column;gap:10px;padding:30px 20px 18px 20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:var(--radius);overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.06);opacity:0;transform:translateY(10px);transition:opacity 700ms cubic-bezier(.25,.1,.25,1),transform 700ms cubic-bezier(.25,.1,.25,1),background var(--t-micro),border-color var(--t-micro),box-shadow var(--t-micro);transform-style:preserve-3d}
.feature-chip.is-visible{opacity:1;transform:translateY(0)}
.feature-chip:hover{background:rgba(255,255,255,.08);border-color:rgba(34,211,238,.14);transform:perspective(900px) rotateX(1deg) rotateY(-1deg) translateY(-3px);box-shadow:0 20px 40px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.06),0 0 30px rgba(34,211,238,.06)}
.feature-chip:active{transform:perspective(900px) rotateX(0.5deg) rotateY(-0.5deg) translateY(-2px) scale(.98)}
.feature-chip::before{content:"";position:absolute;top:0;left:0;right:0;height:26px;background:rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.08)}
.feature-chip-dots{position:absolute;top:10px;left:14px;display:flex;gap:5px;z-index:2}
.wc-dot{width:6px;height:6px;border-radius:50%}
.wc-dot.r{background:rgba(255,85,85,.85)}
.wc-dot.y{background:rgba(255,185,50,.88)}
.wc-dot.g{background:rgba(45,200,95,.88)}
.feature-icon{margin-top:4px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:rgba(255,255,255,.10);color:var(--accent);transition:box-shadow var(--t-micro),transform var(--t-lift)}
.feature-chip:hover .feature-icon{transform:translateY(-2px);box-shadow:0 0 12px rgba(34,211,238,.12)}
.feature-chip h3{font-family:'Manrope',sans-serif;font-size:16px;font-weight:600;color:#fff;margin:0}
.feature-chip p{font-family:'Inter',sans-serif;font-size:13px;color:rgba(255,255,255,.62);margin:0;line-height:1.5}

/* ═══ PRICING TABLE (slide 4) ═══ */
.s4-pricing{opacity:0;transform:translateY(16px);transition:opacity 800ms cubic-bezier(.25,.1,.25,1) 300ms,transform 800ms cubic-bezier(.25,.1,.25,1) 300ms;max-width:640px;width:100%}
.active .s4-pricing{opacity:1;transform:translateY(0)}
.s4-table{display:none}
@media(min-width:600px){.s4-table{display:block}}
.s4-table-inner{overflow:hidden;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.35)}
.s4-table .row{display:flex;border-bottom:1px solid rgba(255,255,255,.06);transition:background var(--t-micro)}
.s4-table .row:last-child{border-bottom:none}
.s4-table .row:hover{background:rgba(255,255,255,.015)}
.s4-table .cell{flex:1;padding:clamp(10px,1.6vh,14px) clamp(10px,1.5vw,16px);text-align:center;font-size:clamp(11px,1vw,13px);color:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;min-width:0}
.s4-table .cell:first-child{text-align:left;justify-content:flex-start;color:rgba(255,255,255,.45);font-weight:500;flex:1.2}
.s4-table .head .cell{font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(13px,1.4vw,16px);text-transform:uppercase;letter-spacing:.04em;color:rgba(255,255,255,.75);padding:clamp(14px,2vh,18px) clamp(10px,1.5vw,16px) clamp(12px,1.6vh,14px)}
.s4-table .head{background:rgba(0,0,0,.2)}
.s4-table .price{font-family:'Manrope',sans-serif;font-weight:800;font-size:clamp(18px,2.2vw,22px);color:rgba(255,255,255,.9);line-height:1}
.s4-table .price small{font-size:.42em;color:#fff;font-weight:500}
.s4-table .feat-col{border-left:1px solid rgba(34,211,238,.08);background:rgba(34,211,238,.02)}
.s4-table .check{color:#10b981;font-size:12px}
.s4-table .dash{color:rgba(255,255,255,.08);font-size:10px}
/* Column reveal animation */
.s4-table .cell-col{opacity:0;transform:translateY(8px)}
.s4-table .cell-col.reveal{animation:colReveal .45s cubic-bezier(.25,.1,.25,1) forwards}
@keyframes colReveal{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
.col-accent{transition:background .5s ease}
.col-accent.in{background:rgba(34,211,238,.06)}
.col-accent-1,.col-accent-2,.col-accent-3,.col-accent-4{border-left:1px solid rgba(34,211,238,.08)}

/* ═══ MOBILE PRICING TOGGLE (≤599px) ═══ */
.s4-toggle{display:none;text-align:center}
@media(max-width:599px){.s4-toggle{display:block}}
.s4-toggle .toggle-row{display:inline-flex;flex-wrap:wrap;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:100px;padding:3px;margin-bottom:16px}
.s4-toggle .toggle-btn{padding:7px 14px;border-radius:100px;font-size:11px;font-weight:600;cursor:pointer;color:rgba(255,255,255,.4);transition:color var(--t-micro),background var(--t-micro);border:none;background:none;font-family:'Inter',sans-serif;white-space:nowrap}
.s4-toggle .toggle-btn.active{background:rgba(34,211,238,.15);color:var(--accent)}
.s4-toggle .main-card{background:linear-gradient(180deg,rgba(34,211,238,.06),rgba(34,211,238,.01));border:1px solid rgba(34,211,238,.12);border-radius:20px;padding:28px 24px;max-width:360px;margin:0 auto}
.s4-toggle .main-tier{font-weight:800;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--accent);margin-bottom:6px}
.s4-toggle .main-price{font-family:'Manrope',sans-serif;font-weight:900;font-size:clamp(42px,7vw,52px);color:#fff;line-height:1;margin:2px 0}
.s4-toggle .main-price small{font-size:.32em;color:#fff;font-weight:600}
.s4-toggle .main-detail{color:rgba(255,255,255,.35);font-size:13px;line-height:1.5}
.s4-toggle .dots{display:flex;justify-content:center;gap:7px;margin-top:14px}
.s4-toggle .dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.1);cursor:pointer;transition:background var(--t-micro),transform var(--t-lift)}
.s4-toggle .dot.active{background:var(--accent);transform:scale(1.3)}

/* ═══ FOOTER ═══ */
.bottom-nav{position:absolute;bottom:0;left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 36px;pointer-events:none}
.bottom-nav-row{display:flex;align-items:center;gap:18px;pointer-events:auto}
.bottom-nav-row a{font-family:'Inter',sans-serif;font-size:12px;color:rgba(255,255,255,.45);text-decoration:none;transition:color var(--t-micro),text-shadow var(--t-micro)}
.bottom-nav-row a:hover{color:var(--accent);text-shadow:0 0 12px rgba(34,211,238,.25)}
.bottom-copy{font-family:'Inter',sans-serif;font-size:12px;color:rgba(255,255,255,.30)}

/* ═══ AUTH TOAST ═══ */
.auth-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%) translateY(-5px);z-index:10001;padding:9px 18px;background:rgba(5,8,16,.96);border:1px solid rgba(34,211,238,.12);border-radius:10px;color:rgba(255,255,255,.85);font-family:'Inter',sans-serif;font-size:12px;font-weight:500;opacity:0;pointer-events:none;transition:opacity var(--t-micro),transform var(--t-micro),border-color var(--t-micro),box-shadow var(--t-micro);box-shadow:0 12px 40px rgba(0,0,0,.25)}
.auth-toast.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;border-color:rgba(34,211,238,.20);box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 24px rgba(34,211,238,.06)}

/* ═══ NOTIFICATIONS ═══ */
.notif-empty{text-align:center;padding:36px 20px;color:rgba(255,255,255,.3);font-size:14px;line-height:1.6}
.notif-item{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;transition:background .15s}
.notif-item:hover{background:rgba(255,255,255,.03)}
.notif-item.unread{border-left:3px solid var(--accent)}
.notif-item.read{border-left:3px solid transparent;opacity:.6}
.notif-icon{width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.notif-title{font-size:13px;font-weight:600;color:#fff;margin-bottom:2px}
.notif-msg{font-size:12px;color:rgba(255,255,255,.5);line-height:1.45}
.notif-time{font-size:11px;color:rgba(255,255,255,.25);margin-top:4px}
.notif-toast{position:fixed;top:20px;right:20px;max-width:360px;padding:14px 18px;background:rgba(20,24,36,.97);border:1px solid rgba(255,255,255,.08);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.5);z-index:9999;display:flex;flex-direction:column;gap:4px;transform:translateX(120%);transition:transform .4s cubic-bezier(.25,.1,.25,1);backdrop-filter:blur(20px)}
.notif-toast.show{transform:translateX(0)}
.notif-toast strong{font-size:13px;color:#fff}
.notif-toast span{font-size:12px;color:rgba(255,255,255,.5)}

/* ═══════════════════════════════════════════
   RESPONSIVE BREAKPOINTS
   ═══════════════════════════════════════════ */

/* ── 980px: Tablet ── */
@media(max-width:980px){
  .container{flex-direction:column-reverse;gap:28px}
  .slide{padding:90px 28px 72px;height:auto;min-height:100dvh}
  .phone-base{width:210px;height:440px;max-width:55vw}
  .subtitle-stream-frame,.pricing-card,.feature-grid{max-width:100%}
  .topbar{left:12px;right:12px}
}

/* ── 640px: Phone ── */
@media(max-width:640px){
  .topbar{top:10px;left:10px;right:10px;height:50px;padding:0 12px 0 14px;border-radius:12px}
  .slide{padding:80px 52px 72px 18px;padding-bottom:calc(72px + env(safe-area-inset-bottom, 0px))}
  /* arrows move to right edge, stacked vertically, dots hidden */
  .controls{bottom:50%;left:auto;right:10px;transform:translateY(50%);flex-direction:column;gap:6px}
  .control-dots{display:none}
  .arrow-btn{width:36px;height:36px;background:rgba(0,0,0,.55);border-color:rgba(255,255,255,.2);color:#fff}
  .arrow-btn svg{width:24px !important;height:24px !important;min-width:24px;min-height:24px}
  .bottom-nav{padding:14px 18px;padding-bottom:calc(14px + env(safe-area-inset-bottom, 0px))}
  .feature-grid{grid-template-columns:1fr 1fr}
  .bottom-nav-row a,.bottom-copy{font-size:11px}
  .page-border{display:none}
  .slide-cta-btn{bottom:52px;bottom:calc(52px + env(safe-area-inset-bottom, 0px))}
  .body-text{font-size:15px}
  .bottom-nav-row{display:none}
  .bottom-copy{font-size:10px;text-align:center}
  .s4-toggle .toggle-btn{color:rgba(255,255,255,.65)}
  .s4-toggle .main-detail{color:rgba(255,255,255,.55)}
  .subtitle-stream-frame{display:none}
  .feature-grid{display:none}
}

/* ── 400px: Small phone ── */
@media(max-width:400px){
  .phone-base{width:150px;height:320px}
  .slide{padding:70px 46px 60px 10px;padding-bottom:calc(60px + env(safe-area-inset-bottom, 0px))}
  .topbar{top:6px;left:6px;right:6px;height:42px;padding:0 8px 0 10px;border-radius:10px}
  .headline{font-size:clamp(26px,7vw,36px)}
  .body-text{font-size:13px}
  .feature-grid{grid-template-columns:1fr;gap:10px}
}

/* ── Reduced motion ── */
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;scroll-behavior:auto !important}
  .noise-overlay,.stream-indicator,.bg-xf-a,.bg-xf-b{display:none !important}
  .phone-base{opacity:1 !important;transform:none !important;animation:none !important}
  .slide{transition:none !important;transform:none !important}
  .slide:not(.active){opacity:0 !important}
  .slide.active{opacity:1 !important;transform:none !important}
  .slide .text-side,.slide .media-side{transition:none !important;transform:none !important;opacity:1 !important}
  .feature-chip{opacity:1 !important;transform:none !important}
  .subtitle-line{opacity:1 !important;transform:none !important;filter:none !important}
  .accent-bar{opacity:1 !important;transform:none !important}
  .control-dots .dot.active{animation:none !important}
}
```

---

## PART 2: HTML STRUCTURE (semantic outline)

```
<html lang="it" data-theme="dark">          ← dark-only theme

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#050810">
    <title>Sottotitoli — Traduzione e comprensione in tempo reale</title>

    Fonts (Google Fonts CDN):
      - Inter: 300, 400, 500, 600
      - Manrope: 400, 500, 600, 700, 800
      - JetBrains Mono: 400, 500

    External CSS (decorative only, not structural):
      - css/theme-2.css   ← shared theme (navbar, panels, CSS vars) — NOT used by landing layout
      - Font Awesome 6.5.0 (CDN) — icon fonts

    ALL STRUCTURAL CSS is in the inline <style> block above.

  <body>

    <!-- BACKGROUND LAYERS (decorative, pointer-events:none) -->
    <div class="bg-xf-a">         ← crossfading background image A
    <div class="bg-xf-b">         ← crossfading background image B (14s cycle)
    <div class="bg-overlay">      ← vignette gradient
    <div class="page-border">     ← inset frame border (desktop only, hidden ≤640px)
    <div class="noise-overlay">   ← SVG fractal grain texture (2.8% opacity)

    <!-- AUTH TOAST -->
    <div id="authToast" class="auth-toast">🔐 Accedi per continuare</div>

    <!-- TOP BAR -->
    <header class="topbar">
      <a href="index.html" class="topbar-brand">sottotitoli</a>
      <span>.pro</span>                          ← accent-colored (cyan)
      <div class="topbar-right">
        <a class="topbar-login">🔐 Accedi</a>   ← Google OAuth login
      </div>
    </header>

    <!-- SLIDE SYSTEM (full-viewport carousel) -->
    <main class="stage-root">
      <div class="stage-track">

        <!-- SLIDE 1 — Hero (centered text, no media side) -->
        <section class="slide slide-hero active">
          <div class="container">
            <div class="text-side">
              <span class="eyebrow">Sottotitoli pensati per capire</span>
              <h1 class="headline">Tutto chiaro.<br>Davvero subito.</h1>
              <p class="body-text">Progettato per capire l'inglese al volo...</p>
              <a class="continua-btn">Scopri di più →</a>
            </div>
          </div>
        </section>

        <!-- SLIDE 2 — Translation showcase (text + phone mockup with subtitle stream) -->
        <section class="slide flow-slide">
          <div class="container">
            <div class="text-side">
              <span class="eyebrow">Traduzione e vocabolario in tempo reale</span>
              <h2 class="headline">Ogni momento,<br>le sue parole.</h2>
              <p class="body-text">Ogni parola, il suo momento...</p>
            </div>
            <div class="media-side">
              <div class="subtitle-stream-frame">       ← HIDDEN on mobile (≤640px)
                <div class="subtitle-line">              ← 3 animated lines
                  <div class="accent-bar">               ← cyan vertical bar
                  <div class="line-content">
                    <span class="lang-it">IT text</span>  ← Manrope 18px
                    <span class="lang-en">EN text</span>  ← Inter 13px, 42% opacity
                  </div>
                </div>
                ... ×3 lines ...
                <div class="stream-indicator">           ← 3 pulsing dots
              </div>
            </div>
          </div>
          <a class="slide-cta-btn">Scopri di più →</a>   ← absolute bottom CTA
        </section>

        <!-- SLIDE 3 — Features (text + 2×2 grid of feature chips) -->
        <section class="slide features-slide">
          <div class="container">
            <div class="text-side">
              <span class="eyebrow">Tutto in un solo spazio</span>
              <h2 class="headline">Il concetto è semplice.</h2>
              <p class="body-text">Puoi usarlo in autonomia...</p>
            </div>
            <div class="media-side">
              <div class="feature-grid">                 ← HIDDEN on mobile (≤640px)
                <div class="feature-chip">               ← macOS-window-style card
                  <div class="feature-chip-dots">        ← r/y/g window dots
                  <div class="feature-icon"><svg/></div>
                  <h3>Sottotitoli in diretta</h3>
                  <p>Trascrizione in tempo reale...</p>
                </div>
                ... ×4 chips (Captions, Vocabulary, Duo, Analytics) ...
              </div>
            </div>
          </div>
          <a class="slide-cta-btn">Continua →</a>
        </section>

        <!-- SLIDE 4 — Pricing (text + comparison table / mobile card toggle) -->
        <section class="slide pricing-slide">
          <div class="container" style="flex-direction:column;text-align:center">
            <span class="eyebrow">Il piano giusto per te</span>
            <h2 class="headline">Un piano per iniziare,<br>altri per crescere.</h2>
            <p class="body-text">Un punto di partenza semplice...</p>
            <div class="s4-pricing">
              <!-- DESKTOP: 4-column comparison table (≥600px) -->
              <div class="s4-table">
                <div class="s4-table-inner">
                  rows with: row → .cell (flex columns)
                  Head row: Gratis | Starter | Standard | Premium
                  Price row, Features rows with ✓/— markers
                </div>
              </div>
              <!-- MOBILE: single-card toggle (≤599px) -->
              <div class="s4-toggle">
                toggle-row: 4 tier buttons (Gratis/Starter/Standard/Premium)
                main-card:  tier name + big price + detail
                dots:       4 dot indicators
              </div>
            </div>
          </div>
          <a class="slide-cta-btn">Inizia gratis →</a>
        </section>

      </div>
    </main>

    <!-- SLIDE NAVIGATION (fixed) -->
    <nav class="controls">
      <button class="arrow-btn" id="prevBtn">    ← previous slide
        <svg viewBox="0 0 24 24"><path d="M20 20L8 12L20 4"/></svg>
      </button>
      <div class="control-dots">                  ← dot indicators (JS-populated, hidden on mobile)
      <button class="arrow-btn" id="nextBtn">    ← next slide
        <svg viewBox="0 0 24 24"><path d="M4 20L16 12L4 4"/></svg>
      </button>
    </nav>

    <!-- FOOTER -->
    <footer class="bottom-nav">
      © Sottotitoli 2026 · Privacy · Termini
    </footer>

    <!-- SCRIPTS (not design-relevant) -->
    supabase-js, config.js, auth.js, i18n.js, theme.js, notifications.js
    + inline slide carousel JS (~200 lines)
```

---

## PART 3: DESIGN TOKENS QUICK REFERENCE

```
Theme:           Dark-only (#050810 background)
Accent:          #22d3ee (cyan) with glow rgba(34,211,238,.35)
Text:            #f8fafc (near-white), opacity scale from .90→.25
Fonts:           Inter (body/UI), Manrope (headings), JetBrains Mono (eyebrow/mono)
Pill radius:     999px (fully rounded)
Card radius:     14–18px
Transitions:     180ms micro, 280ms springy lift, 500ms surface
Viewport:        100dvh with safe-area-inset-bottom for iOS Safari
Glass:           backdrop-filter:blur(8-16px) on frosted elements
Grain:           SVG fractal noise at 2.8% opacity
Background:      Crossfading bg images (14s cycle) + vignette overlay
Focus:           2px solid cyan outline, 3px offset

Slide transition:  1100ms fade + 1200ms scale (1.015→1)
Text entrance:     900ms translateY + 800ms opacity (150ms delay)
Media entrance:    1000ms translateY + 900ms opacity (200ms delay)

Desktop nav:       center-bottom — ← ●●●● →
Mobile nav:        right-edge vertical stack — ↑ ↓ (dots hidden, dark bg arrows)

Breakpoints:       >980px desktop, ≤980px tablet, ≤640px phone, ≤400px small phone
```

---

## PART 4: COMPONENT SUMMARY

| Component | Class | Desktop | Mobile |
|-----------|-------|---------|--------|
| Topbar | `.topbar` | 72px, 20px margins, transparent | 50px, 10px margins, rounded 12px |
| Slide | `.slide` | 100dvh, padding 100/40/80 | auto height, padding 80/52/72/18 |
| Headline | `.headline` | clamp(38-68px) | clamp(26-36px) at ≤400px |
| Body text | `.body-text` | 16px, 78% opacity | 15px, 13px at ≤400px |
| Pill CTA | `.continua-btn` / `.slide-cta-btn` | 48px tall, 999px radius, translucent bg | same, bottom CTA at 52px+inset |
| Phone mockup | `.phone-base` | 250×520px | 210×440 (≤980), 150×320 (≤400), hidden ≤640 |
| Subtitle frame | `.subtitle-stream-frame` | 480px max, 32px padding, glass blur | hidden ≤640px |
| Feature grid | `.feature-grid` | 2×2 grid, 16px gap, 460px max | hidden ≤640px |
| Pricing table | `.s4-table` | 4-column flex, ≥600px | hidden, replaced by `.s4-toggle` card |
| Pricing toggle | `.s4-toggle` | hidden ≥600px | single-card with tier buttons + dots |
| Nav arrows | `.arrow-btn` | 44×44px, translucent, center-bottom | 36×36px, dark bg, right-edge vertical |
| Nav dots | `.control-dots` | 10px circles, visible | hidden ≤640px |
| Footer | `.bottom-nav` | absolute bottom, links visible | copyright only, centered |
| Page border | `.page-border` | inset frame, 22px radius, 11px margin | hidden ≤640px |
```

