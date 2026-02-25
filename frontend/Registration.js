const registerForm     = document.getElementById('register-form');
const nicknameInput    = document.getElementById('register-nickname');
const firstNameInput   = document.getElementById('register-firstname');
const lastNameInput    = document.getElementById('register-lastname');
const emailInput       = document.getElementById('register-email');
const ageInput         = document.getElementById('register-age');
const passwordInput    = document.getElementById('register-password');
const confirmInput     = document.getElementById('register-confirm-password');
const formError        = document.getElementById('register-form-error');
const goToLoginLink    = document.getElementById('go-to-login');

const errors = {
  nickname : document.getElementById('register-nickname-error'),
  firstname: document.getElementById('register-firstname-error'),
  lastname : document.getElementById('register-lastname-error'),
  email    : document.getElementById('register-email-error'),
  age      : document.getElementById('register-age-error'),
  gender   : document.getElementById('register-gender-error'),
  password : document.getElementById('register-password-error'),
  confirm  : document.getElementById('register-confirm-password-error'),
};

function clearErrors() {
  Object.values(errors).forEach(el => el.textContent = '');
  formError.textContent = '';
}

function getGender() {
  const checked = document.querySelector('input[name="gender"]:checked');
  return checked ? checked.value : '';
}

function validate() {
  let valid = true;

  if (!nicknameInput.value.trim()) {
    errors.nickname.textContent = 'Nickname is required.';
    valid = false;
  }
  if (!firstNameInput.value.trim()) {
    errors.firstname.textContent = 'First name is required.';
    valid = false;
  }
  if (!lastNameInput.value.trim()) {
    errors.lastname.textContent = 'Last name is required.';
    valid = false;
  }
  if (!emailInput.value.trim()) {
    errors.email.textContent = 'E-mail is required.';
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
    errors.email.textContent = 'Enter a valid e-mail address.';
    valid = false;
  }
  const age = parseInt(ageInput.value, 10);
  if (!ageInput.value) {
    errors.age.textContent = 'Age is required.';
    valid = false;
  } else if (isNaN(age) || age < 13 || age > 120) {
    errors.age.textContent = 'Age must be between 13 and 120.';
    valid = false;
  }
  if (!getGender()) {
    errors.gender.textContent = 'Please select a gender.';
    valid = false;
  }
  if (passwordInput.value.length < 8) {
    errors.password.textContent = 'Password must be at least 8 characters.';
    valid = false;
  }
  if (confirmInput.value !== passwordInput.value) {
    errors.confirm.textContent = 'Passwords do not match.';
    valid = false;
  }

  return valid;
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  if (!validate()) return;

  const payload = {
    nickname : nicknameInput.value.trim(),
    firstname: firstNameInput.value.trim(),
    lastname : lastNameInput.value.trim(),
    email    : emailInput.value.trim(),
    age      : parseInt(ageInput.value, 10),
    gender   : getGender(),
    password : passwordInput.value,
  };

  try {
    const res = await fetch('/api/register', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      formError.textContent = data.error || 'Registration failed. Please try again.';
      return;
    }

    showPage('login');

  } catch {
    formError.textContent = 'Network error. Please try again.';
  }
});

goToLoginLink.addEventListener('click', (e) => {
  e.preventDefault();
  showPage('login');
});
