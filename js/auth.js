// js/auth.js

// 1) Initialize Supabase with session persistence
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

// Redirect target — change this if deploying to a different domain
// IMPORTANT: This must be whitelisted in Supabase Auth settings
function getAuthRedirectUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/panoramica.html';
}
function getPostLogoutUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/panoramica.html';
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

// 1.5) Auth guard — redirect to index if not signed in (skip for index.html)
(function(){
  var path = window.location.pathname.replace(/\/$/,'').split('/').pop() || 'index.html';
  // Pages that are publicly accessible (no auth required)
  if(path==='index.html'||path===''||path==='404.html'||path==='panoramica.html'||path==='studio-caption.html'||path==='studio-sotto.html'||path==='studio-sotto-mockup.html'||path==='studio-traduzione.html'||path.indexOf('overlay')===0)return;
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
        window.location.replace('index.html');
      }
      else {
        // Dispatch user info for hamburger menus
        var user = r.data.session.user;
        var name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        var avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        var preset = localStorage.getItem('sottotitoli-avatar-preset') || '';
        window.dispatchEvent(new CustomEvent('sottotitoli-user-ready', {detail:{name:name,email:user.email,avatar:avatar,preset:preset}}));
        // Initialize credits for new users (15 min free)
        initUserCredits(r.data.session.user.id);
        // Skip profiles table query — columns not yet created in Supabase
        // TODO: add columns (avatar_url, full_name, native_lang, location, learning_profile) to profiles table
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
              <div class="ud-name">${firstName || 'Utente'}</div>
              <div class="ud-email">${user?.email || ''}</div>
            </div>
          </div>
          <a href="index.html" class="ud-link">Home</a>
          <a href="start.html" class="ud-link">Start</a>
          <a href="account.html" class="ud-link">Profilo</a>
          <a href="analysis.html" class="ud-link">Report AI</a>
          <hr class="ud-divider">
          <div class="ud-credits-section">
            <div class="ud-credit-row"><span>Minuti</span><span id="udMinutes">—</span></div>
            <div class="ud-credit-row"><span>Crediti report</span><span id="udTokens">—</span></div>
          </div>
          <hr class="ud-divider">
          <a href="purchase.html" class="ud-link">Acquista crediti</a>
          <hr class="ud-divider">
          <a href="account.html#cs-profile" class="ud-link">Impostazioni</a>
          <button class="ud-link danger" id="udLogoutBtn">Esci</button>
        </div>
      </div>
    `;
    
    // Fetch credit balances
    (async function(){
      try {
        var _ref = await window.sottotitoliSupabase.auth.getSession();
        var userId = _ref.data.session?.user?.id;
        if (userId) {
          // Minutes pool (caption 0.5× & translation 1× share this)
          var _c = await window.sottotitoliSupabase.from('user_credits').select('balance_minutes').eq('user_id', userId).maybeSingle();
          var minEl = document.getElementById('udMinutes');
          if (minEl) minEl.textContent = (_c.data?.balance_minutes || 0) + ' min';

          // Credits (reports only)
          var _r = await window.sottotitoliSupabase.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
          var tokEl = document.getElementById('udTokens');
          if (tokEl) tokEl.textContent = (_r.data?.balance || 0);

          // Load avatar from profiles if column exists (skip for now — columns not yet created)
          // TODO: add avatar_url, full_name columns to profiles table
        }
      } catch(e) {}
    })();
    
    // Toggle dropdown
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
  }
});

// ═══ Credit initialization — 15 min free for new users, weekly top-up ═══
function initUserCredits(userId) {
  if (!userId) return;
  var sb = window.sottotitoliSupabase;
  if (!sb) return;
  sb.from('user_credits').select('balance_seconds, last_weekly_topup').eq('user_id', userId).maybeSingle().then(function(r){
    if (r.error) { console.warn('Credit check failed:', r.error.message); return; }
    var now = new Date();
    if (!r.data) {
      // New user — create credit row with 15 min free
      sb.from('user_credits').insert({
        user_id: userId,
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
        var newBalance = (r.data.balance_seconds || 0) + 900;
        sb.from('user_credits').update({
          balance_seconds: newBalance,
          last_weekly_topup: now.toISOString(),
          updated_at: now.toISOString()
        }).eq('user_id', userId).then(function(upd){
          if (!upd.error) console.log('🔄 Weekly top-up: +15 min (balance: ' + Math.floor(newBalance/60) + ' min)');
        });
      }
    }
  });
}