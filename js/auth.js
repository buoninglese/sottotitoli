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

// 3) Wire the header button once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('googleLoginBtn');
  if (btn) {
    btn.addEventListener('click', signInWithGoogle);
  }

  // OPTIONAL: quick test to see if user is already logged in
  supabase.auth.getUser().then(({ data, error }) => {
    if (error) {
      console.error('getUser error', error);
      return;
    }
    const user = data?.user;
    if (user) {
      console.log('Logged in as', user.email);
      // later: here is where we will call /api/me to get subscription_status
    } else {
      console.log('No Supabase user logged in');
    }
  });
});