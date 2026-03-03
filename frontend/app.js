/* ════════════════════════════════════════════════════
   0. BACKEND BASE URL  (Render deployment)
════════════════════════════════════════════════════ */
const API_BASE = 'https://forum-backend.onrender.com';

/*
 * app.js  –  Injects content into the structural containers defined in
 *            index.html, then defines global utilities used by all modules.
 *
 *  index.html provides the skeleton (empty named elements).
 *  This file fills each one with its inner HTML.
 *
 *  Load order:
 *    1. app.js          ← injects HTML + defines globals
 *    2. Login.js
 *    3. Registration.js
 *    4. Posts.js
 *    5. PostDetail.js
 *    6. Chat.js
 *    7. init.js         ← post-module init (loadPosts + health-check)
 */


/* ════════════════════════════════════════════════════
   1. INJECT HTML INTO EACH STRUCTURAL CONTAINER
════════════════════════════════════════════════════ */

document.getElementById('main-navbar').innerHTML = `
  <div id="navbar-brand">Real-Time Forum</div>
  <ul id="navbar-links">
    <li><a href="#" id="nav-home">Home</a></li>
  </ul>
  <button type="button" id="nav-messages-btn" title="Messages" aria-label="Messages">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <span id="nav-messages-badge" hidden></span>
  </button>
  <span id="nav-online-count" title="Users online" hidden></span>
  <div id="navbar-user">
    <span id="navbar-username"></span>
    <button type="button" id="logout-btn">Log Out</button>
  </div>
`;

document.getElementById('login-page').innerHTML = `
  <div id="login-card">
    <h1 id="login-title">Welcome Back</h1>
    <p id="login-subtitle">Sign in to your account</p>
    <form id="login-form" novalidate>
      <div class="form-group">
        <label for="login-identifier">Nickname or E-mail</label>
        <input type="text" id="login-identifier" name="identifier"
               placeholder="your_nickname or you@example.com" autocomplete="username"/>
        <span class="field-error" id="login-identifier-error"></span>
      </div>
      <div class="form-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" name="password"
               placeholder="Your password" autocomplete="current-password"/>
        <span class="field-error" id="login-password-error"></span>
      </div>
      <span class="form-error" id="login-form-error"></span>
      <button type="submit" id="login-submit-btn">Sign In</button>
    </form>
    <p id="login-footer">Don't have an account? <a href="#" id="go-to-register">Create one</a></p>
  </div>
`;

document.getElementById('register-page').innerHTML = `
  <div id="register-card">
    <h1 id="register-title">Create Account</h1>
    <p id="register-subtitle">Join the community today</p>
    <form id="register-form" novalidate>
      <div class="form-group">
        <label for="register-nickname">Nickname</label>
        <input type="text" id="register-nickname" name="nickname"
               placeholder="your_nickname" autocomplete="username"/>
        <span class="field-error" id="register-nickname-error"></span>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="register-firstname">First Name</label>
          <input type="text" id="register-firstname" name="firstname"
                 placeholder="John" autocomplete="given-name"/>
          <span class="field-error" id="register-firstname-error"></span>
        </div>
        <div class="form-group">
          <label for="register-lastname">Last Name</label>
          <input type="text" id="register-lastname" name="lastname"
                 placeholder="Doe" autocomplete="family-name"/>
          <span class="field-error" id="register-lastname-error"></span>
        </div>
      </div>
      <div class="form-group">
        <label for="register-email">E-mail</label>
        <input type="email" id="register-email" name="email"
               placeholder="you@example.com" autocomplete="email"/>
        <span class="field-error" id="register-email-error"></span>
      </div>
      <div class="form-group">
        <label for="register-age">Age</label>
        <input type="number" id="register-age" name="age"
               placeholder="18" min="13" max="120"/>
        <span class="field-error" id="register-age-error"></span>
      </div>
      <div class="form-group">
        <label>Gender</label>
        <div id="register-gender-options">
          <label class="radio-label"><input type="radio" name="gender" value="male"/>   Male</label>
          <label class="radio-label"><input type="radio" name="gender" value="female"/> Female</label>
          <label class="radio-label"><input type="radio" name="gender" value="other"/>  Other</label>
        </div>
        <span class="field-error" id="register-gender-error"></span>
      </div>
      <div class="form-group">
        <label for="register-password">Password</label>
        <input type="password" id="register-password" name="password"
               placeholder="Min 8 characters" autocomplete="new-password"/>
        <span class="field-error" id="register-password-error"></span>
      </div>
      <div class="form-group">
        <label for="register-confirm-password">Confirm Password</label>
        <input type="password" id="register-confirm-password" name="confirm-password"
               placeholder="Repeat your password" autocomplete="new-password"/>
        <span class="field-error" id="register-confirm-password-error"></span>
      </div>
      <span class="form-error" id="register-form-error"></span>
      <button type="submit" id="register-submit-btn">Create Account</button>
    </form>
    <p id="register-footer">Already have an account? <a href="#" id="go-to-login">Sign in</a></p>
  </div>
`;

document.getElementById('online-users-sidebar').innerHTML = `
  <div id="online-users-header">
    <h2 id="online-users-title">Users</h2>
    <button type="button" id="sidebar-toggle-btn" title="Collapse sidebar" aria-label="Toggle sidebar">
      <svg id="sidebar-toggle-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
  </div>
  <ul id="online-users-list"></ul>
`;

document.getElementById('posts-page').innerHTML = `
  <div id="create-post-panel">
    <h2 id="create-post-heading">Create a Post</h2>
    <form id="create-post-form" novalidate onsubmit="event.preventDefault()">
      <div class="form-group">
        <label for="post-title">Title</label>
        <input type="text" id="post-title" name="title"
               placeholder="Give your post a title..." maxlength="100"/>
        <span class="field-error" id="post-title-error"></span>
      </div>
      <div class="form-group">
        <label>Categories</label>
        <div id="post-categories-options" class="category-checkboxes">
          <label class="check-label"><input type="checkbox" name="postcategory" value="general"/>    General</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="technology"/> Technology</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="sports"/>     Sports</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="gaming"/>     Gaming</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="music"/>      Music</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="art"/>        Art</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="food"/>       Food</label>
          <label class="check-label"><input type="checkbox" name="postcategory" value="travel"/>     Travel</label>
        </div>
        <span class="field-error" id="post-category-error"></span>
      </div>
      <div class="form-group">
        <label for="post-content">Content</label>
        <textarea id="post-content" name="content"
                  placeholder="What's on your mind?" rows="4" maxlength="2000"></textarea>
        <span class="field-error" id="post-content-error"></span>
      </div>
      <div class="attach-row">
        <input type="file" id="post-image-input" accept="image/jpeg,image/png,image/gif,image/webp" hidden/>
        <button type="button" id="post-image-btn" class="attach-btn" title="Attach image">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Add photo</span>
        </button>
      </div>
      <div id="post-image-preview" class="img-preview-wrap" hidden>
        <img id="post-image-preview-img" src="" alt="preview" class="img-preview"/>
        <button type="button" id="post-image-remove-btn" class="img-preview-remove"
                title="Remove image" aria-label="Remove image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <span class="form-error" id="create-post-error"></span>
      <button type="submit" id="create-post-submit" class="btn btn--primary">Publish Post</button>
    </form>
  </div>

  <nav id="posts-filter-bar" aria-label="Filter posts">
    <button class="filter-btn filter-btn--active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="mine">My Posts</button>
    <button class="filter-btn" data-filter="liked">Liked</button>
    <span class="filter-sep"></span>
    <button class="filter-btn" data-category="general">General</button>
    <button class="filter-btn" data-category="technology">Technology</button>
    <button class="filter-btn" data-category="sports">Sports</button>
    <button class="filter-btn" data-category="gaming">Gaming</button>
    <button class="filter-btn" data-category="music">Music</button>
    <button class="filter-btn" data-category="art">Art</button>
    <button class="filter-btn" data-category="food">Food</button>
    <button class="filter-btn" data-category="travel">Travel</button>
  </nav>

  <div id="posts-feed">
    <p id="posts-feed-empty" hidden>No posts yet — be the first!</p>
  </div>
`;

document.getElementById('post-detail-page').innerHTML = `
  <button type="button" id="back-to-posts-btn">&larr; Back to Posts</button>
  <article id="post-detail-content"></article>
  <section id="comments-section">
    <h3 id="comments-heading">Comments</h3>
    <form id="add-comment-form" novalidate onsubmit="event.preventDefault()">
      <div class="form-group">
        <label for="comment-input">Write a comment</label>
        <textarea id="comment-input" name="comment"
                  placeholder="Share your thoughts..." rows="3"></textarea>
        <span class="field-error" id="comment-input-error"></span>
      </div>
      <button type="submit" class="comment-submit-btn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Post Comment
      </button>
    </form>
    <div id="comments-list">
      <p id="comments-empty" hidden>No comments yet — start the conversation!</p>
    </div>
  </section>
`;

document.getElementById('chat-panel').innerHTML = `
  <div id="chat-placeholder">
    <span id="chat-placeholder-icon">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </span>
    <p>Select a user from the sidebar to start chatting</p>
  </div>

  <div id="chat-conversation">
    <header id="chat-conversation-header">
      <button type="button" id="chat-back-btn">&larr;</button>
      <span id="chat-partner-status" class="status-dot"></span>
      <strong id="chat-partner-name"></strong>
    </header>

    <div id="chat-messages-area">
      <div id="chat-load-more-trigger"></div>
      <div id="chat-load-more-spinner" hidden>
        <span class="chat-spinner"></span>
        <span class="chat-spinner__label">Loading messages&#8230;</span>
      </div>
      <p id="chat-no-more-messages" hidden>Beginning of conversation</p>
    </div>

    <form id="chat-input-form" novalidate onsubmit="event.preventDefault()">
      <input type="file" id="chat-image-input"
             accept="image/jpeg,image/png,image/gif,image/webp" hidden/>
      <button type="button" id="chat-image-btn" class="chat-attach-btn"
              title="Attach image" aria-label="Attach image">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>
      <div class="chat-input-col">
        <div id="chat-image-preview" class="chat-img-preview-wrap" hidden>
          <img id="chat-image-preview-img" src="" alt="preview" class="chat-img-preview"/>
          <button type="button" id="chat-image-remove-btn" class="chat-img-remove"
                  title="Remove" aria-label="Remove image">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <textarea id="chat-input" name="message"
                  placeholder="Type a message&#8230;" rows="1" maxlength="500"></textarea>
      </div>
      <button type="submit" id="chat-send-btn" aria-label="Send message">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </form>
  </div>
`;

document.getElementById('server-error-overlay').innerHTML = `
  <div id="server-error-box">
    <div id="server-error-icon">
      <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h2 id="server-error-title">Server Unavailable</h2>
    <p id="server-error-msg">Could not connect to the backend server.
       Make sure the server is running on port 5500, then click Retry.</p>
    <button id="server-error-retry">Retry Connection</button>
  </div>
`;

document.getElementById('http-error-overlay').innerHTML = `
  <div id="http-error-box">
    <div id="http-error-icon"></div>
    <h2 id="http-error-title"></h2>
    <p  id="http-error-msg"></p>
    <button id="http-error-action"></button>
  </div>
`;


/* ════════════════════════════════════════════════════
   2. SERVER-UNAVAILABLE OVERLAY
════════════════════════════════════════════════════ */
function showServerError(msg) {
  const overlay = document.getElementById('server-error-overlay');
  if (msg) document.getElementById('server-error-msg').textContent = msg;
  overlay.removeAttribute('hidden');
}

document.getElementById('server-error-retry').addEventListener('click', () => {
  window.location.reload();
});


/* ════════════════════════════════════════════════════
   3. HTTP ERROR OVERLAY  (401 / 403 / 404 / 5xx)
════════════════════════════════════════════════════ */
const HTTP_ERROR_DEFS = {
  401: {
    icon  : '<svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    title : 'Session Expired',
    msg   : 'Your session has expired. Please log in again to continue.',
    action: 'Log In Again',
    onAction() {
      sessionStorage.clear();
      document.getElementById('http-error-overlay').setAttribute('hidden', '');
      showPage('login');
    },
  },
  403: {
    icon  : '<svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    title : 'Access Denied',
    msg   : "You don't have permission to access this resource.",
    action: 'Go Home',
    onAction() {
      document.getElementById('http-error-overlay').setAttribute('hidden', '');
    },
  },
  404: {
    icon  : '<svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>',
    title : 'Not Found',
    msg   : 'The resource you were looking for could not be found.',
    action: 'Go Home',
    onAction() {
      document.getElementById('http-error-overlay').setAttribute('hidden', '');
    },
  },
};

function showHttpError(code) {
  const def = HTTP_ERROR_DEFS[code] || {
    icon  : '<svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    title : `Error ${code}`,
    msg   : 'An unexpected error occurred. Please try again.',
    action: 'Retry',
    onAction() { window.location.reload(); },
  };
  const overlay = document.getElementById('http-error-overlay');
  overlay.setAttribute('data-code', String(code));
  document.getElementById('http-error-icon').innerHTML    = def.icon;
  document.getElementById('http-error-title').textContent = def.title;
  document.getElementById('http-error-msg').textContent   = def.msg;
  const btn = document.getElementById('http-error-action');
  btn.textContent  = def.action;
  btn._httpHandler = def.onAction;
  overlay.removeAttribute('hidden');
}

document.getElementById('http-error-action').addEventListener('click', function () {
  if (this._httpHandler) this._httpHandler();
});


/* ════════════════════════════════════════════════════
   4. authFetch — attaches session token to every request
════════════════════════════════════════════════════ */
function authFetch(url, opts = {}) {
  const token = sessionStorage.getItem('token');
  opts.headers = Object.assign({}, opts.headers);
  if (token) opts.headers['X-Session-Token'] = token;
  return fetch(url, opts).then(res => {
    if (res.status === 401 && sessionStorage.getItem('user') && !url.includes('logout')) {
      showHttpError(401);
    } else if (res.status >= 500) {
      showHttpError(res.status);
    }
    return res;
  }).catch(err => {
    if (err instanceof TypeError) showServerError();
    throw err;
  });
}


/* ════════════════════════════════════════════════════
   5. Page management
════════════════════════════════════════════════════ */
const pages = {
  login   : document.getElementById('login-page'),
  register: document.getElementById('register-page'),
  app     : document.getElementById('app-page'),
};
const navbar = document.getElementById('main-navbar');

function showPage(name) {
  Object.values(pages).forEach(p => p.style.display = 'none');
  pages[name].style.display = 'flex';
  navbar.style.display      = (name === 'app') ? 'flex' : 'none';
  document.body.style.overflow = (name === 'app') ? 'hidden' : 'auto';
  if (name === 'app') {
    // Always reset to the posts feed — never leave user on a detail/chat page
    const postDetail = document.getElementById('post-detail-page');
    const chatPanel  = document.getElementById('chat-panel');
    if (postDetail) postDetail.style.display = 'none';
    if (chatPanel)  chatPanel.style.display  = 'none';
    const postsPage = document.getElementById('posts-page');
    if (postsPage)  postsPage.style.display  = '';
    if (typeof loadPosts === 'function') loadPosts();
    if (typeof initChat  === 'function') initChat();
  }
}


/* ════════════════════════════════════════════════════
   6. Initial page decision
════════════════════════════════════════════════════ */
const _savedUser = sessionStorage.getItem('user');
if (_savedUser) {
  document.getElementById('navbar-username').textContent = JSON.parse(_savedUser).nickname;
  showPage('app');
} else {
  showPage('login');
}

