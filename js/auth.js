// js/auth.js

// 1) Initialize Supabase with session persistence
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

// Redirect target — change this if deploying to a different domain
// IMPORTANT: This must be whitelisted in Supabase Auth settings
function getAuthRedirectUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://www.sottotitoli.pro/panoramica.html';
}
function getPostLogoutUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://www.sottotitoli.pro/index.html';
}

window.sottotitoliSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,   // lets Supabase read #access_token on start.html
      autoRefreshToken: true,
    },
  }
);

// 1.5) Auth bypass — for development/testing without Supabase OAuth
// Activate via URL: ?bypass_auth=1  or  window.SOTTOTITOLI_BYPASS_AUTH = true
(function(){
  var bypass = window.SOTTOTITOLI_BYPASS_AUTH || (window.location.search.indexOf('bypass_auth=1') !== -1);
  console.log('🔧 Auth bypass check:', { bypass, search: window.location.search, flag: window.SOTTOTITOLI_BYPASS_AUTH });
  if (!bypass) return;
  window.SOTTOTITOLI_BYPASS_AUTH = true;
  var MOCK_USER = {
    id: '00000000-0000-0000-0000-00000000test',
    email: 'test@localhost.local',
    user_metadata: { full_name: 'Test User', avatar_url: '' }
  };
  var MOCK_SESSION = { user: MOCK_USER, access_token: 'mock-token', expires_at: 9999999999 };
  var originalGetSession = window.sottotitoliSupabase.auth.getSession.bind(window.sottotitoliSupabase.auth);
  window.sottotitoliSupabase.auth.getSession = function() {
    console.log('🔧 Bypass getSession called — returning mock user');
    return Promise.resolve({ data: { session: MOCK_SESSION }, error: null });
  };
  window.sottotitoliSupabase.auth.getUser = function() {
    return Promise.resolve({ data: { user: MOCK_USER }, error: null });
  };
  console.log('🔧 Auth bypass active — mock user:', MOCK_USER.id);
})();
(function(){
  var path = window.location.pathname.replace(/\/$/,'').split('/').pop() || 'index.html';
  // Pages that are publicly accessible (no auth required)
  if(path==='index.html'||path===''||path==='404.html'||path==='duo-s8t.html'||path==='traduzione-s8t.html'||path==='panoramica.html'||path.indexOf('overlay')===0||path.indexOf('mockup')>=0)return;
  // Allow ?mock=1 on any page for testing without auth
  if(window.location.search.indexOf('mock=1')!==-1)return;
  // Multispeaker speaker-join mode doesn't require auth (guests join via invite link)
  if(path==='multispeaker.html' && window.location.search.indexOf('speaker=1')!==-1)return;
  // Wait for session, redirect if missing
  function check(){
    var sb = window.sottotitoliSupabase;
    if(!sb){setTimeout(check,200);return;}
    // Only use getSession() — onAuthStateChange INITIAL_SESSION fires before
    // Supabase restores the session from localStorage, causing false redirects.
    sb.auth.getSession().then(function(r){
      if(!r.data?.session){
        localStorage.setItem('sottotitoli_return_page', window.location.pathname + window.location.search);
        window.location.replace('index.html?auth=required');
      }
      else {
        // Dispatch user info for hamburger menus
        var user = r.data.session.user;
        var name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        var avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        var preset = localStorage.getItem('sottotitoli-avatar-preset') || '';
        window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', {detail:{name:name,email:user.email,avatar:avatar,preset:preset}}));
        // Initialize credits for new users (15 min free + 3 tokens)
        initUserCredits(r.data.session.user.id);
        initUserTokens(r.data.session.user.id);

        // ── Onboarding gate ──
        // New users who haven't completed onboarding are redirected.
        // Skip only on index (landing page) and onboarding itself.
        if (path !== 'onboarding.html' && path !== 'index.html') {
          var onboardingDone = localStorage.getItem('sottotitoli_onboarding_done');
          if (onboardingDone !== 'true') {
            // Check Supabase for onboarding status
            sb.from('onboarding_responses')
              .select('onboarding_completed')
              .eq('user_id', user.id)
              .maybeSingle()
              .then(function(_r) {
                if (_r.error) return; // Table might not exist — skip silently
                // Only redirect if explicitly NOT completed.
                // A missing row (_r.data === null) means nothing was saved —
                // don't redirect in that case (the save might have failed).
                if (_r.data && _r.data.onboarding_completed === true) {
                  localStorage.setItem('sottotitoli_onboarding_done', 'true');
                } else if (_r.data && _r.data.onboarding_completed === false) {
                  window.location.replace('onboarding.html');
                }
                // If _r.data is null (no row), don't redirect
              });
          }
        }
      }
    });
  }
  check();
})();

// 2) Sign-in function used by the button
async function signInWithGoogle() {
  // Remember where the user was so we can bring them back after login
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'panoramica.html' && currentPage !== 'index.html') {
    localStorage.setItem('sottotitoli_return_page', currentPage);
  }
  // Preserve referral param through OAuth redirect
  var ref = new URLSearchParams(window.location.search).get('ref');
  if (ref && ref.length > 8) {
    localStorage.setItem('sottotitoli_referrer', ref);
  }
  const { error } = await window.sottotitoliSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
    },
  });
  if (error) {
    console.error('Google sign-in error:', error.message);
    alert('Could not sign in with Google: ' + error.message);
  }
}

// 3) Render header based on real Supabase session (NOT URL hash)
document.addEventListener('DOMContentLoaded', async () => {
  const authSection = document.getElementById('authSection');
  if (!authSection) return;

  function renderSignedOut() {
    authSection.innerHTML = `
      <button id="googleLoginBtn" style="font-family:inherit;font-size:12px;font-weight:600;padding:8px 16px;border-radius:100px;border:1.5px solid var(--accent-purple);background:transparent;color:var(--accent-purple);cursor:pointer;transition:all .15s;white-space:nowrap" type="button"
        onmouseover="this.style.background='var(--accent-purple)';this.style.color='#fff'"
        onmouseout="this.style.background='transparent';this.style.color='var(--accent-purple)'">
        Sign in
      </button>
    `;
    const btn = document.getElementById('googleLoginBtn');
    if (btn) {
      btn.addEventListener('click', signInWithGoogle);
    }
    document.querySelectorAll('.purchase-link').forEach(function(el){ el.style.display = 'none'; });
  }

  function renderSignedIn(user) {
    var firstName = '';
    if (user) {
      var fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      firstName = fullName.split(' ')[0];
      // Capitalize
      firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
    }
    var initial = firstName ? firstName.charAt(0).toUpperCase() : '?';
    
    // Detect greeting language
    var lang = (navigator.language || 'it').split('-')[0];
    var greetings = {it:'Ciao', en:'Hello', fr:'Bonjour', es:'Hola', de:'Hallo', pt:'Ola', nl:'Hallo', pl:'Czesc'};
    var greeting = greetings[lang] || 'Ciao';
    
    authSection.innerHTML = `
      <div class="user-menu" id="userMenu">
        <span class="user-greeting">${greeting} ${firstName}</span>
        <button class="user-avatar" id="userAvatar" title="Menu utente">${initial}</button>
        <div class="user-dropdown" id="userDropdown">
          <div class="ud-header">
            <div class="ud-avatar">${initial}</div>
            <div>
              <div class="ud-name" id="udName">${firstName || 'Utente'}</div>
              <div class="ud-email">${user?.email || ''}</div>
            </div>
          </div>
          <a href="index.html" class="ud-link" data-i18n="home"><i class="fa-solid fa-house" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Home</a>
          <a href="panoramica.html" class="ud-link" data-i18n="panoramica"><i class="fa-solid fa-table-cells" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Panoramica</a>
          <a href="start.html" class="ud-link" data-i18n="start"><i class="fa-solid fa-microphone" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Start</a>
          <a href="account.html" class="ud-link" data-i18n="profilo"><i class="fa-solid fa-user" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Profilo</a>
          <a href="analysis.html" class="ud-link" data-i18n="report_ai"><i class="fa-solid fa-star" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Report AI</a>
          <hr class="ud-divider">
          <div class="ud-credits-section">
            <div class="ud-credit-row"><span data-i18n="minutes">Minuti</span><span id="udMinutes">—</span></div>
            <div class="ud-credit-row"><span data-i18n="credits_report">Crediti report</span><span id="udTokens">—</span></div>
          </div>
          <hr class="ud-divider">
          <a href="purchase.html" class="ud-link" data-i18n="buy_credits" style="color:var(--blue);font-weight:600"><i class="fa-solid fa-gift" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Acquista crediti</a>
          <hr class="ud-divider">
          <a href="account.html#cs-profile" class="ud-link" data-i18n="settings">Impostazioni</a>
          <a href="panoramica.html#aiuto" class="ud-link" data-i18n="aiuto">Aiuto</a>
          <button class="ud-link danger" id="udLogoutBtn" data-i18n="logout">Esci</button>
        </div>
      </div>
    `;
    
    // Fetch credit balances — reusable so we can refresh on dropdown open
    async function refreshUserCredits() {
      try {
        var _ref = await window.sottotitoliSupabase.auth.getSession();
        var userId = _ref.data.session?.user?.id;
        if (!userId) return;
        // Minutes pool
        var _c = await window.sottotitoliSupabase.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
        var minEl = document.getElementById('udMinutes');
        if (minEl) minEl.textContent = (_c.data?.balance_minutes || 0) + ' min';
        // Credits (reports)
        var _r = await window.sottotitoliSupabase.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
        var tokEl = document.getElementById('udTokens');
        if (tokEl) tokEl.textContent = (_r.data?.balance || 0);
        // Display name from profiles (may differ from Google name)
        var _p = await window.sottotitoliSupabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
        if (_p.data?.display_name) {
          var nameEl = document.getElementById('udName');
          if (nameEl) nameEl.textContent = _p.data.display_name;
          var avEl = document.getElementById('userAvatar');
          if (avEl) avEl.textContent = _p.data.display_name.charAt(0).toUpperCase();
          var greEl = document.querySelector('.user-greeting');
          if (greEl) {
            var parts = _p.data.display_name.split(' ');
            var lang = (navigator.language || 'it').split('-')[0];
            var greetings = {it:'Ciao', en:'Hello', fr:'Bonjour', es:'Hola', de:'Hallo', pt:'Ola', nl:'Hallo', pl:'Czesc'};
            greEl.textContent = (greetings[lang] || 'Ciao') + ' ' + parts[0];
          }
        }
      } catch(e) {}
    }
    // Initial fetch
    refreshUserCredits();
    
    // Toggle dropdown — refresh credits on every open
    var avatar = document.getElementById('userAvatar');
    var dropdown = document.getElementById('userDropdown');
    var overlay = document.getElementById('udOverlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ud-overlay';
      overlay.id = 'udOverlay';
      document.body.appendChild(overlay);
    }
    
    function openDropdown(){
      dropdown.classList.add('open');
      overlay.classList.add('active');
      refreshUserCredits(); // refresh balances + name on every open
    }
    function closeDropdown(){
      dropdown.classList.remove('open');
      overlay.classList.remove('active');
    }
    
    avatar.addEventListener('click', function(e){
      e.stopPropagation();
      dropdown.classList.contains('open') ? closeDropdown() : openDropdown();
    });
    overlay.addEventListener('click', closeDropdown);
    
    // Logout
    var logoutBtn = document.getElementById('udLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function(){
        await window.sottotitoliSupabase.auth.signOut();
        // Clear any stored state
        try { localStorage.removeItem('sottotitoli_return_page'); } catch(e) {}
        try { localStorage.removeItem('sottotitoli_referrer'); } catch(e) {}
        window.location.href = getPostLogoutUrl();
      });
    }
    
    // Show purchase links
    document.querySelectorAll('.purchase-link').forEach(function(el){ el.style.display = ''; });
  }

  console.log('auth.js: calling getSession...');
  const { data, error } = await window.sottotitoliSupabase.auth.getSession();
  console.log('auth.js: getSession result', { data, error });

  const session = data?.session;

  // ═══ Referral capture ═══
  // Save ?ref= param on any page load
  (function(){
    var ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.length > 8) {
      localStorage.setItem('sottotitoli_referrer', ref);
    }
  })();

  // Record referral after sign-in (one-time, idempotent)
  if (session?.user) {
    var savedRef = localStorage.getItem('sottotitoli_referrer');
    if (savedRef && session.user.id !== savedRef) {
      try {
        var { error: refErr } = await window.sottotitoliSupabase.from('referrals').upsert({
          referrer_id: savedRef,
          referred_user_id: session.user.id,
          status: 'signed_up',
          created_at: new Date().toISOString()
        }, { onConflict: 'referred_user_id', ignoreDuplicates: true });
        if (!refErr) localStorage.removeItem('sottotitoli_referrer');
      } catch(e) { console.log('Referral record skipped:', e.message); }
    }
  }

  if (error || !session) {
    console.log('auth.js: no active session, rendering signed out');
    renderSignedOut();
  } else {
    console.log('auth.js: session found, rendering signed in');
    // Dispatch auth event for other scripts
    window.dispatchEvent(new CustomEvent('sottotitoli-auth', {detail:{user:session.user}}));
    // Only redirect back if user just completed OAuth login (has #access_token in URL)
    if (window.location.hash.indexOf('access_token') !== -1) {
      var returnPage = localStorage.getItem('sottotitoli_return_page');
      if (returnPage && window.location.pathname.indexOf(returnPage) === -1) {
        localStorage.removeItem('sottotitoli_return_page');
        window.location.replace(returnPage);
        return;
      }
    }
    renderSignedIn(session?.user);
    // Also populate Panoramica-style dropdown — retry after delay for session readiness
    populatePanoramicaDropdown(session.user);
    setTimeout(function(){ populatePanoramicaDropdown(session.user); }, 2000);
  }
});

// ═══ Populate Panoramica-style dropdown (pages without #authSection) ═══
async function populatePanoramicaDropdown(user) {
  if (!user) return;
  var userId = user.id;
  var firstName = (user.user_metadata?.full_name || user.email?.split('@')[0] || '').split(' ')[0];
  firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  // ddName
  var ddName = document.getElementById('ddName');
  if (ddName) ddName.textContent = firstName || user.email?.split('@')[0] || 'Utente';
  // ddEmail
  var ddEmail = document.getElementById('ddEmail');
  if (ddEmail) ddEmail.textContent = user.email || '';

  // Fetch balances
  try {
    var sb = window.sottotitoliSupabase;
    if (!sb) return;
    var _c = await sb.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
    var ddMin = document.getElementById('ddMinutes');
    if (ddMin) ddMin.textContent = (_c.data?.balance_minutes || 0) + ' min';

    var _r = await sb.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
    var ddTok = document.getElementById('ddTokens');
    if (ddTok) ddTok.textContent = _r.data?.balance || 0;
  } catch(e) {}
}

// ═══ Top-level: populate Panoramica dropdown on every page ═══
(function(){
  if (document.getElementById('authSection')) return; // already handled by DOMContentLoaded
  window.sottotitoliSupabase.auth.getSession().then(function(r){
    if (r.data?.session?.user) {
      var user = r.data.session.user;
      populatePanoramicaDropdown(user);
      initUserCredits(user.id);
      initUserTokens(user.id);
      // Retry after delay for slow session restore
      setTimeout(function(){ populatePanoramicaDropdown(user); }, 2000);
    }
  });
})();

// ═══ Credit initialization — 15 min free for new users, weekly top-up ═══
function initUserCredits(userId) {
  if (!userId) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('user_credits').select('balance_minutes, last_weekly_topup').eq('user_id', userId).maybeSingle().then(function(r){
    if (r.error) { console.warn('Credit check failed:', r.error.message); return; }
    var now = new Date();
    if (!r.data) {
      // New user — create credit row with 15 min free
      sb.from('user_credits').insert({
        user_id: userId,
        balance_minutes: 15,
        balance_seconds: 900,
        lifetime_seconds: 0,
        last_weekly_topup: now.toISOString(),
        updated_at: now.toISOString()
      }).then(function(ins){
        if (!ins.error) console.log('🎁 New user: 15 min free credits granted');
      });
    } else {
      // Existing user — check weekly top-up (7 days since last)
      var lastTopup = r.data.last_weekly_topup ? new Date(r.data.last_weekly_topup) : null;
      var needsTopup = !lastTopup || (now - lastTopup > 7 * 24 * 60 * 60 * 1000);
      if (needsTopup) {
        var newBalance = (r.data.balance_minutes || 0) + 15;
        sb.from('user_credits').update({
          balance_minutes: newBalance,
          balance_seconds: newBalance * 60,
          last_weekly_topup: now.toISOString(),
          updated_at: now.toISOString()
        }).eq('user_id', userId).then(function(upd){
          if (!upd.error) console.log('🔄 Weekly top-up: +15 min (balance: ' + newBalance + ' min)');
        });
      }
    }
  });
}

// ═══ Token initialization — 3 free tokens for new users ═══
function initUserTokens(userId) {
  if (!userId) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle().then(function(r){
    if (r.error) { console.warn('Token check failed:', r.error.message); return; }
    if (!r.data) {
      sb.from('user_tokens').insert({
        user_id: userId,
        balance: 3,
        lifetime_tokens: 3,
        updated_at: new Date().toISOString()
      }).then(function(ins){
        if (!ins.error) console.log('🎁 New user: 3 free report tokens granted');
      });
    }
  });

// ═══════════════════════════════════════════════════════════
// Global onboarding gate — runs on ALL pages after session is ready
// Redirects to onboarding.html if user hasn't completed onboarding yet.
// ═══════════════════════════════════════════════════════════
(function(){
  var path = (window.location.pathname.replace(/\/$/,'').split('/').pop() || 'index.html');
  // Never redirect FROM these pages
  if (path === 'onboarding.html' || path === 'index.html' || path === '' || path === '404.html' || path.indexOf('overlay') === 0 || path.indexOf('mockup') >= 0) return;

  function checkOnboarding(){
    var sb = window.sottotitoliSupabase;
    if (!sb) { setTimeout(checkOnboarding, 300); return; }
    sb.auth.getSession().then(function(r){
      if (!r.data?.session) return; // Not signed in — let the auth guard handle it
      var user = r.data.session.user;
      // Check local cache first
      if (localStorage.getItem('sottotitoli_onboarding_done') === 'true') return;
      // Check Supabase
      sb.from('onboarding_responses')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(function(_r){
          if (_r.error) return; // Table might not exist yet — skip silently
          // Only redirect if explicitly NOT completed.
          // A missing row means nothing was saved — don't redirect.
          if (_r.data && _r.data.onboarding_completed === true) {
            localStorage.setItem('sottotitoli_onboarding_done', 'true');
          } else if (_r.data && _r.data.onboarding_completed === false) {
            console.log('🆕 Onboarding not completed — redirecting');
            window.location.replace('onboarding.html');
          }
          // If _r.data is null (no row), don't redirect
        });
    });
  }

  // Run after a short delay so Supabase has time to process OAuth hash
  setTimeout(checkOnboarding, 1500);
})();
}