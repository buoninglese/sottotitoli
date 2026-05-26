// js/auth.js

// 1) Initialize Supabase with session persistence
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

// Redirect target — change this if deploying to a different domain
const AUTH_REDIRECT_TO = 'https://buoninglese.github.io/sottotitoli/studio.html';
const POST_LOGOUT_URL = 'https://buoninglese.github.io/sottotitoli/studio.html';

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
  const { error } = await window.sottotitoliSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT_TO,
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
        window.location.href = POST_LOGOUT_URL;
      });
    }
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
    renderSignedIn();
  }
});