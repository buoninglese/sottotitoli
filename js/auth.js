// js/auth.js

// 1) Initialize Supabase with session persistence
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

// Redirect target — change this if deploying to a different domain
// IMPORTANT: This must be whitelisted in Supabase Auth settings
function getAuthRedirectUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/studio.html';
}
function getPostLogoutUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/studio.html';
}

window.sottotitoliSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,   // lets Supabase read #access_token on studio.html
      autoRefreshToken: true,
    },
  }
);

// 2) Sign-in function used by the button
async function signInWithGoogle() {
  // Remember where the user was so we can bring them back after login
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage !== 'app.html' && currentPage !== 'index.html') {
    localStorage.setItem('sottotitoli_return_page', currentPage);
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
    document.querySelectorAll('.wallet-link').forEach(function(el){ el.style.display = 'none'; });
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
          <div class="ud-section">
            <div class="ud-label">Crediti</div>
            <div class="ud-credits">
              <span class="amount" id="udCreditBal">—</span>
              <span class="unit">token AI</span>
            </div>
          </div>
          <div class="ud-section">
            <a href="wallet.html" class="ud-link">💳 Wallet e pagamenti</a>
          </div>
          <hr class="ud-divider">
          <a href="account.html" class="ud-link">⚙️ Impostazioni account</a>
          <button class="ud-link danger" id="udLogoutBtn">🚪 Esci</button>
        </div>
      </div>
    `;
    
    // Fetch credit balance
    (async function(){
      try {
        var _ref = await window.sottotitoliSupabase.auth.getSession();
        var userId = _ref.data.session?.user?.id;
        if (userId) {
          var _r = await window.sottotitoliSupabase.from('user_tokens').select('balance').eq('user_id', userId).maybeSingle();
          var bal = _r.data?.balance;
          var balEl = document.getElementById('udCreditBal');
          if (balEl && bal !== undefined && bal !== null) {
            balEl.textContent = bal;
            balEl.title = bal + ' token disponibili';
          }
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
        window.location.href = getPostLogoutUrl();
      });
    }
    
    // Show wallet links
    document.querySelectorAll('.wallet-link').forEach(function(el){ el.style.display = ''; });
  }

  console.log('auth.js: calling getSession...');
  const { data, error } = await window.sottotitoliSupabase.auth.getSession();
  console.log('auth.js: getSession result', { data, error });

  const session = data?.session;

  if (error || !session) {
    console.log('auth.js: no active session, rendering signed out');
    renderSignedOut();
  } else {
    console.log('auth.js: session found, rendering signed in');
    // Dispatch auth event for other scripts
    window.dispatchEvent(new CustomEvent('sottotitoli-auth', {detail:{user:session.user}}));
    // If user came from another page (e.g. studio), redirect back immediately
    var returnPage = localStorage.getItem('sottotitoli_return_page');
    if (returnPage && window.location.pathname.indexOf(returnPage) === -1) {
      localStorage.removeItem('sottotitoli_return_page');
      var search = window.location.search || '';
      window.location.replace(returnPage + search);
      return;
    }
    renderSignedIn(session?.user);
  }
});