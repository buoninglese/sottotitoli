// js/auth.js

// 1) Initialize Supabase
const SUPABASE_URL = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co';  // your project URL
const SUPABASE_ANON_KEY = 'sb_publishable_I-PG1wsO1FMWADK9GVBqoQ_0EtPA2K7';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) Sign-in function used by the button
async function signInWithGoogle() {
  console.log('Sign in with Google clicked');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'https://buoninglese.github.io/sottotitoli/studio.html'
    }
  });
  console.log('signInWithOAuth result', { data, error });
  if (error) {
    console.error('Google sign-in error:', error.message);
    alert('Could not sign in with Google: ' + error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const authSection = document.getElementById('authSection');

  function renderSignedOut() {
    if (!authSection) return;
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

  function renderSignedIn(user) {
    if (!authSection) return;
    const email = user.email || 'Account';
    authSection.innerHTML = `
      <span style="margin-right:12px;">Signed in as <strong>${email}</strong></span>
      <button id="profileBtn" class="btn btn-default navbar-btn" type="button">
        Profile
      </button>
      <button id="logoutBtn" class="btn btn-default navbar-btn" type="button">
        Sign out
      </button>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        renderSignedOut();
      });
    }

    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', () => {
        alert('Profile page is not implemented yet.');
      });
    }
  }

  async function initAuthUI() {
    // Let Supabase hydrate session from URL / storage
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      console.error('getSession error', sessionError);
    } else {
      console.log('Session data', sessionData);
    }

    // Now safely ask for the user
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error('getUser error', error);
      renderSignedOut();
      return;
    }

    const user = data?.user;
    if (user) {
      console.log('Logged in as', user.email);
      renderSignedIn(user);
    } else {
      console.log('No Supabase user logged in');
      renderSignedOut();
    }
  }

  initAuthUI();
});