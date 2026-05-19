// js/auth.js

// 1) Initialize Supabase
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) Sign-in function used by the button
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://buoninglese.github.io/sottotitoli/studio.html'
    }
  });
  if (error) {
    console.error('Google sign-in error:', error.message);
    alert('Could not sign in with Google: ' + error.message);
  }
}

// 3) Very simple header: sign in or sign out
document.addEventListener('DOMContentLoaded', () => {
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
        await supabase.auth.signOut();
        // Simple: reload the page after logout
        window.location.href = 'https://buoninglese.github.io/sottotitoli/studio.html';
      });
    }
  }

  // Super simple: if URL has #access_token, assume logged in
  if (window.location.hash.includes('access_token=')) {
    renderSignedIn();
  } else {
    renderSignedOut();
  }
});