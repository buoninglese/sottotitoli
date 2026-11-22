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

// 1.5) Auth bypass — for localhost development without Supabase OAuth
// Activate via URL: ?bypass_auth=1  or  window.SOTTOTITOLI_BYPASS_AUTH = true
(function(){
  var bypass = window.SOTTOTITOLI_BYPASS_AUTH || (window.location.search.indexOf('bypass_auth=1') !== -1);
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

// 1.6) Per-account device state ───────────────────────────────────────────────
// Two bugs came from treating this browser as if it belonged to one account:
//
//   • `sottotitoli_onboarding_done` was a single device-wide flag. Once anyone
//     finished onboarding on this browser, EVERY later account skipped it — a
//     brand-new user landed straight on the dashboard.
//   • Learner progress, the onboarding answer copy, avatar, favourites and recent
//     imports live in localStorage and were never cleared when the signed-in
//     account changed, so a new account appeared to inherit the previous one's
//     data. (The database itself is fine: every user table has RLS and is read
//     with .eq('user_id', …) — this is device cache, not a server leak.)
//
// The flag is keyed by user id now, and switching accounts on a device drops the
// other account's cached data. Preferences (theme, language, font size) stay:
// they describe the device, not the person.
(function(){
  var IDENTITY = 'sottotitoli-identity';
  // Device preferences — never wiped by an account change.
  var KEEP = [
    'sottotitoli-theme', 'sottotitoli-lang', 'sottotitoli-native-lang',
    'sottotitoli-caption-lang', 'sottotitoli-caption-font',
    'sottotitoli-caption-style', 'sottotitoli-caption-var',
    'sottotitoli-font-size', 'sottotitoli-magic-fix',
    'sottotitoli-pause-sensitivity', 'sottotitoli-mic-device',
    'sottotitoli_return_page', 'sottotitoli_referrer'
  ];
  var ACCOUNT_PREFIX = /^(sottotitoli|s8t-|rai-)/;

  // Two different horizons, on purpose:
  //   • DEVICE_FRESH — anything already in this browser predates an account this
  //     new, so it belongs to someone else and should go. Generous (a day) so the
  //     cleanup still happens if the person comes back later.
  //   • GATE_FRESH — how new an account must be before "no onboarding row" is read
  //     as "has not onboarded". Narrow (an hour): rows for older accounts have
  //     been cleared by purges before, and sending an established learner back
  //     into onboarding is worse than letting a new one skip a page.
  var DEVICE_FRESH = 24 * 60 * 60 * 1000;
  var GATE_FRESH = 60 * 60 * 1000;

  function ageOf(user){
    var created = Date.parse((user && user.created_at) || '');
    return created ? Date.now() - created : NaN;
  }

  function flagKey(uid){ return 'sottotitoli_onboarding_done:' + uid; }

  function purgeAccountData(){
    try {
      Object.keys(localStorage).forEach(function(k){
        if (k === IDENTITY || KEEP.indexOf(k) !== -1) return;
        if (ACCOUNT_PREFIX.test(k)) {
          try { localStorage.removeItem(k); } catch(e) {}
        }
      });
    } catch(e) {}
  }

  // Called on every page once the session is known.
  function guard(uid, user){
    if (!uid) return;
    var prev = null;
    try { prev = localStorage.getItem(IDENTITY); } catch(e) {}
    if (prev === uid) return;

    // Legacy device-wide flag from the old build: no longer trusted (it may have
    // been set by a different account), so remove it.
    try { localStorage.removeItem('sottotitoli_onboarding_done'); } catch(e) {}

    if (prev) {
      // A different account is signed in on this device → drop the previous
      // account's cache so it cannot surface under the new identity.
      purgeAccountData();
    } else if (ageOf(user) < DEVICE_FRESH) {
      // No identity recorded yet, and the account was created recently: any data
      // already in this browser was written before this account existed.
      purgeAccountData();
    }
    // No identity yet and an established account: first run of this build. Keep
    // everything so existing users lose nothing — only record who this is.
    try { localStorage.setItem(IDENTITY, uid); } catch(e) {}
  }

  function forget(){
    purgeAccountData();
    try { localStorage.removeItem(IDENTITY); } catch(e) {}
  }

  // 'done' | 'needs' | 'unknown'
  function state(user, cb){
    if (!user || !user.id) return cb('unknown');
    var done = false;
    try {
      done = localStorage.getItem(flagKey(user.id)) === 'true'
          || sessionStorage.getItem('sottotitoli_onboarding_just_done') === '1';
    } catch(e) {}
    if (done) return cb('done');

    var sb = window.sottotitoliSupabase;
    if (!sb) return cb('unknown');
    sb.from('onboarding_responses')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(function(r){
        if (r.error) return cb('unknown');    // never guess on a failed query
        if (r.data && r.data.onboarding_completed === true) {
          try { localStorage.setItem(flagKey(user.id), 'true'); } catch(e) {}
          return cb('done');
        }
        if (r.data && r.data.onboarding_completed === false) return cb('needs');
        // No row at all. A recently created account has simply not onboarded yet.
        // An older one may have had its row cleared by a purge, so say nothing.
        return cb(ageOf(user) < GATE_FRESH ? 'needs' : 'unknown');
      });
  }

  function markDone(uid){
    if (!uid) return;
    try { localStorage.setItem(flagKey(uid), 'true'); } catch(e) {}
  }

  window.SottotitoliIdentity = { guard: guard, forget: forget };
  window.SottotitoliOnboarding = { state: state, markDone: markDone, flagKey: flagKey };
})();

(function(){
  var path = window.location.pathname.replace(/\/$/,'').split('/').pop() || 'index.html';
  // Pages that are publicly accessible (no auth required)
  if(path==='index.html'||path===''||path==='404.html'||path==='duo-s8t.html'||path==='traduzione-s8t.html'||path==='panoramica.html'||path==='dev.html'||path.indexOf('overlay')===0||path.indexOf('mockup')>=0)return;
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
        // Server now grants the 25 min + the ledger row at signup (handle_new_user).
        // These two remain only as an idempotent fallback for an account that somehow
        // has no row yet — they insert nothing when a row already exists.
        initUserCredits(r.data.session.user.id);
        initUserTokens(r.data.session.user.id);

        // ── Onboarding gate ──
        // Per-account now: the old check used one device-wide flag, so a second
        // account on the same browser skipped onboarding entirely.
        // Skip only on index (landing page) and onboarding itself.
        window.SottotitoliIdentity.guard(user.id, user);
        if (path !== 'onboarding.html' && path !== 'index.html') {
          window.SottotitoliOnboarding.state(user, function(s){
            if (s === 'needs') window.location.replace('onboarding.html');
          });
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
      queryParams: {
        prompt: 'select_account',  // force Google account chooser on every sign-in
      },
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
          <a href="panoramica.html" class="ud-link" data-i18n="start"><i class="fa-solid fa-microphone" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Start</a>
          <a href="panoramica.html#profilo" class="ud-link" data-i18n="profilo"><i class="fa-solid fa-user" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Profilo</a>
          <a href="panoramica.html#report-ai" class="ud-link" data-i18n="report_ai"><i class="fa-solid fa-star" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Report AI</a>
          <hr class="ud-divider">
          <div class="ud-credits-section">
            <div class="ud-credit-row"><span data-i18n="minutes">Minuti</span><span id="udMinutes">—</span></div>
            <div class="ud-credit-row"><span data-i18n="credits_report">Crediti report</span><span id="udTokens">—</span></div>
          </div>
          <hr class="ud-divider">
          <a href="purchase.html" class="ud-link" data-i18n="buy_credits" style="color:var(--blue);font-weight:600"><i class="fa-solid fa-gift" style="width:16px;text-align:center;margin-right:8px;font-size:13px"></i> Acquista crediti</a>
          <hr class="ud-divider">
          <a href="panoramica.html#impostazioni" class="ud-link" data-i18n="settings">Impostazioni</a>
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
        // Clear any stored state — including the account-scoped cache and the
        // identity record, so the next person to sign in on this device starts
        // from nothing of this account's.
        if (window.SottotitoliIdentity) window.SottotitoliIdentity.forget();
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
  var sb = window.sottotitoliSupabase;
  if (!sb) return;

  // The dropdown write is a pure DOM update and may run repeatedly. The credit/token
  // readers are once-per-user: both select and only INSERT when no row exists, so a
  // second call costs two queries and can attempt a duplicate insert.
  var metered = {};
  function fill(user){
    if (!user) return;
    populatePanoramicaDropdown(user);
    if (metered[user.id]) return;
    metered[user.id] = true;
    initUserCredits(user.id);
    initUserTokens(user.id);
  }

  sb.auth.getSession().then(function(r){
    var user = r.data?.session?.user;
    if (user) {
      fill(user);
      // Retry after delay for slow session restore
      setTimeout(function(){ populatePanoramicaDropdown(user); }, 2000);
    }
  });

  // WHY THIS EXISTS: the getSession() read above is a ONE-SHOT. On a cold load it can
  // lose the race with session restore and resolve with NO session while one is still
  // being read from storage — and then nothing ever ran the populate again, so a user
  // who signed in on this page kept the static "..." placeholder in #ddName/#ddEmail
  // for the whole visit (the reported "the user dropdown just says ....").
  //
  // NOTE: this does NOT contradict the rule near the top of the file ("Only use
  // getSession() — onAuthStateChange INITIAL_SESSION fires before Supabase restores the
  // session, causing false redirects"). That trap is about treating a premature NULL
  // INITIAL_SESSION as "logged out". We do the opposite: a null session is ignored, and
  // we only fill on a NON-NULL one, so the early event can never be mistaken for a
  // sign-out. The later SIGNED_IN / TOKEN_REFRESHED that carries the restored session is
  // exactly what fills the dropdown.
  sb.auth.onAuthStateChange(function(_event, session){
    if (session && session.user) fill(session.user);
  });
})();

// ═══ Credit initialization — 25 min free, ONE TIME (no recurring top-up) ═══
// Granted server-side by public.handle_new_user() since migration
// 20260925270000_signup_bonus_server_side. This function is now only a fallback.
//
// The free allowance is granted once, at first sign-in. There is deliberately no
// recurring weekly top-up: it used to add +15 min every 7 days unconditionally
// and it stacked. On iOS, transcription is billed per minute (Whisper), so a
// permanent weekly grant was an unbounded recurring cost (~€4.35/yr per active
// free user). 25 min ≈ €0.14, once.
function initUserCredits(userId) {
  if (!userId) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle().then(function(r){
    if (r.error) { console.warn('Credit check failed:', r.error.message); return; }
    var now = new Date();
    if (!r.data) {
      // Should be unreachable: public.handle_new_user() grants this row and its
      // credit_transactions 'signup_bonus' entry in the same transaction that creates
      // the account. Kept as a fallback, and it reports its own failure — the old
      // version logged ONLY on success, so a user with 0 minutes looked like a
      // user who simply had not earned any.
      sb.from('user_credits').insert({
        user_id: userId,
        balance_minutes: 25,
        balance_seconds: 1500,
        lifetime_seconds: 0,
        last_weekly_topup: now.toISOString(),
        updated_at: now.toISOString()
      }).then(function(ins){
        if (ins.error) console.error('Credit fallback FAILED — user may have no minutes:', ins.error.message);
        else console.log('🎁 Fallback granted 25 min (no credits row existed)');
      });
    }
    // Existing users receive nothing further — the weekly top-up was removed.
  });
}

// ═══ Report credits — 2 free, ONE TIME, granted server-side at signup ═══
// public.handle_new_user() -> public.grant_signup_bonus() creates this row and its
// token_transactions 'signup_bonus' entry in the same transaction as the account.
// This function is now only a fallback for an account with no row, and it must agree
// with the server: it used to grant 3 here while get_token_balance() also granted 3
// with a different lifetime_tokens, which is how the amount drifted per user.
function initUserTokens(userId) {
  if (!userId) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle().then(function(r){
    if (r.error) { console.warn('Token check failed:', r.error.message); return; }
    if (!r.data) {
      sb.from('user_tokens').insert({
        user_id: userId,
        balance: 2,
        lifetime_tokens: 2,
        updated_at: new Date().toISOString()
      }).then(function(ins){
        if (ins.error) console.error('Token fallback FAILED — user may have no report credits:', ins.error.message);
        else console.log('🎁 Fallback granted 2 report credits (no row existed)');
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
      // Same per-account guards as the main auth check — this gate is the one
      // that runs on panoramica, which the first gate skips.
      window.SottotitoliIdentity.guard(user.id, user);
      window.SottotitoliOnboarding.state(user, function(s){
        if (s === 'needs') {
          console.log('🆕 Onboarding not completed — redirecting');
          window.location.replace('onboarding.html');
        }
      });
    });
  }

  // Run after a short delay so Supabase has time to process OAuth hash
  setTimeout(checkOnboarding, 1500);
})();
}
