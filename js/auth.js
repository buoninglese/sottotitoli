// js/auth.js

// 1) Initialize Supabase with session persistence
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

// Redirect target — change this if deploying to a different domain
// IMPORTANT: This must be whitelisted in Supabase Auth settings
function getAuthRedirectUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/app.html';
}
function getPostLogoutUrl() {
  return window.SOTTOTITOLI_CONFIG?.AUTH_REDIRECT_URL || 'https://buoninglese.github.io/sottotitoli/app.html';
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
      <button id="googleLoginBtn" class="btn btn-default navbar-btn" type="button">
        Sign in with Google
      </button>
    `;
    const btn = document.getElementById('googleLoginBtn');
    if (btn) {
      btn.addEventListener('click', signInWithGoogle);
    }
    // Hide wallet links for logged-out users
    document.querySelectorAll('.wallet-link').forEach(function(el){ el.style.display = 'none'; });
  }

  function renderSignedIn() {
    authSection.innerHTML = `
      <button id="logoutBtn" class="btn btn-default navbar-btn" type="button">
        Sign out
      </button>
    `;
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await window.sottotitoliSupabase.auth.signOut();
        // After logout, go back to studio page
        window.location.href = getPostLogoutUrl();
      });
    }
    // Show wallet links for logged-in users
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
    // If user came from another page (e.g. studio), redirect back immediately
    var returnPage = localStorage.getItem('sottotitoli_return_page');
    if (returnPage && window.location.pathname.indexOf(returnPage) === -1) {
      localStorage.removeItem('sottotitoli_return_page');
      var search = window.location.search || '';
      window.location.replace(returnPage + search);
      return;
    }
    renderSignedIn();
  }
});