const loginForm         = document.getElementById('login-form');
const identifierInput   = document.getElementById('login-identifier');
const loginPasswordInput= document.getElementById('login-password');
const identifierError   = document.getElementById('login-identifier-error');
const loginPasswordError= document.getElementById('login-password-error');
const loginFormError    = document.getElementById('login-form-error');
const goToRegisterLink  = document.getElementById('go-to-register');
const logoutBtn         = document.getElementById('logout-btn');

function clearLoginErrors() {
  identifierError.textContent    = '';
  loginPasswordError.textContent = '';
  loginFormError.textContent     = '';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearLoginErrors();

  let valid = true;

  if (!identifierInput.value.trim()) {
    identifierError.textContent = 'Nickname or e-mail is required.';
    valid = false;
  }
  if (!loginPasswordInput.value) {
    loginPasswordError.textContent = 'Password is required.';
    valid = false;
  }
  if (!valid) return;

  const payload = {
    identifier: identifierInput.value.trim(),
    password  : loginPasswordInput.value,
  };

  try {
    const res = await fetch('/api/login', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      loginFormError.textContent = data.error || 'Invalid credentials. Please try again.';
      return;
    }

    sessionStorage.setItem('user', JSON.stringify(data.user));
    document.getElementById('navbar-username').textContent = data.user.nickname;
    showPage('app');

  } catch (err) {
    console.error('Login error:', err);
    loginFormError.textContent = 'Network error. Please try again.';
  }
});

goToRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  showPage('register');
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch { /* ignore */ }

  sessionStorage.removeItem('user');
  document.getElementById('navbar-username').textContent = '';
  showPage('login');
});
