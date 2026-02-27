const chatPanel           = document.getElementById('chat-panel');
const chatPlaceholder     = document.getElementById('chat-placeholder');
const chatConversation    = document.getElementById('chat-conversation');
const chatPartnerName     = document.getElementById('chat-partner-name');
const chatPartnerStatus   = document.getElementById('chat-partner-status');
const chatMessagesArea    = document.getElementById('chat-messages-area');
const chatNoMore          = document.getElementById('chat-no-more-messages');
const chatLoadSpinner     = document.getElementById('chat-load-more-spinner');
const chatInputForm       = document.getElementById('chat-input-form');
const chatInput           = document.getElementById('chat-input');
const chatBackBtn         = document.getElementById('chat-back-btn');
const onlineUsersList     = document.getElementById('online-users-list');
const navMessagesBtn      = document.getElementById('nav-messages-btn');
const navMessagesBadge    = document.getElementById('nav-messages-badge');
const navHome             = document.getElementById('nav-home');
const sidebar             = document.getElementById('online-users-sidebar');
const chatImageBtn        = document.getElementById('chat-image-btn');
const chatImageInput      = document.getElementById('chat-image-input');
const chatImagePreview    = document.getElementById('chat-image-preview');
const chatImagePreviewImg = document.getElementById('chat-image-preview-img');
const chatImageRemoveBtn  = document.getElementById('chat-image-remove-btn');

let ws             = null;
let activePartner  = null;
let msgOffset      = 0;
let loadingMore    = false;
let noMoreMsgs     = false;
let unread         = {};
let userMap        = {};
let chatInitialized = false;
let pendingImageURL = null;
let topSentinelObserver = null;

function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// Watch the sentinel at the top of the message list.
// Only fires when the user has actually scrolled up (scrollHeight > clientHeight).
function setupTopObserver() {
  if (topSentinelObserver) topSentinelObserver.disconnect();
  const sentinel = document.getElementById('chat-load-more-trigger');
  topSentinelObserver = new IntersectionObserver((entries) => {
    // Guard: only trigger if there is actually a scrollbar
    // (prevents auto-fire when messages don't fill the container)
    if (
      entries[0].isIntersecting &&
      !loadingMore &&
      !noMoreMsgs &&
      activePartner &&
      chatMessagesArea.scrollHeight > chatMessagesArea.clientHeight
    ) {
      loadMessages(activePartner.id, msgOffset, false);
    }
  }, { root: chatMessagesArea, threshold: 0 });

  // Double rAF: wait for layout AND paint (including scroll-to-bottom)
  // before we start watching — prevents immediate false-positive fire.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => topSentinelObserver.observe(sentinel));
  });
}

function showAppSection(section) {
  const posts  = document.getElementById('posts-page');
  const detail = document.getElementById('post-detail-page');

  posts.style.display  = section === 'posts'  ? '' : 'none';
  detail.style.display = section === 'detail' ? '' : 'none';

  if (section === 'chat') {
    chatPanel.style.display = 'flex';
  } else {
    chatPanel.style.display = 'none';
  }
}

function connectWS() {
  if (ws && ws.readyState < 2) return;

  const token = sessionStorage.getItem('token') || '';
  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${wsProto}://${location.host}/ws?token=${encodeURIComponent(token)}`);

  ws.onopen = () => {
    console.log('[WS] connected');
  };

  ws.onmessage = (e) => {
    let envelope;
    try { envelope = JSON.parse(e.data); } catch { return; }

    switch (envelope.type) {
      case 'user_list':
        renderUserList(envelope.payload);
        break;
      case 'new_message':
        handleIncomingMessage(envelope.payload);
        break;
      case 'new_post':
        handleNewPost(envelope.payload);
        break;
      case 'vote_update':
        handleVoteUpdate(envelope.payload);
        break;
      case 'force_logout': {
        const dying = ws;
        ws = null;
        chatInitialized = false;
        sessionStorage.removeItem('user');
        if (dying) dying.close();
        showPage('login');
        break;
      }
    }
  };

  ws.onclose = () => {
    console.log('[WS] disconnected — reconnecting in 3s');
    setTimeout(() => {
      if (ws !== null && sessionStorage.getItem('user')) connectWS();
    }, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function renderUserList(users) {
  if (!Array.isArray(users)) return;

  users.sort((a, b) => {
    const ta = a.last_msg || '';
    const tb = b.last_msg || '';
    if (ta !== tb) return tb.localeCompare(ta);
    return a.nickname.localeCompare(b.nickname);
  });

  users.forEach(u => { userMap[u.id] = u; });

  onlineUsersList.innerHTML = '';

  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'user-item' + (activePartner && activePartner.id === u.id ? ' active' : '');
    li.dataset.userId = u.id;

    const dot = document.createElement('span');
    dot.className = 'status-dot ' + (u.online ? 'status-dot--online' : 'status-dot--offline');

    const name = document.createElement('span');
    name.className = 'user-item__name';
    name.textContent = u.nickname;

    li.appendChild(dot);
    li.appendChild(name);

    const badge = unread[u.id] || 0;
    if (badge > 0) {
      const badgeEl = document.createElement('span');
      badgeEl.className = 'user-item__badge';
      badgeEl.textContent = badge > 99 ? '99+' : badge;
      li.appendChild(badgeEl);
    }

    li.addEventListener('click', () => openChat(u));
    onlineUsersList.appendChild(li);
  });

  if (activePartner && userMap[activePartner.id]) {
    const updated = userMap[activePartner.id];
    chatPartnerStatus.className = 'status-dot ' + (updated.online ? 'status-dot--online' : 'status-dot--offline');
  }
}

async function openChat(user) {
  activePartner  = user;
  msgOffset      = 0;
  loadingMore    = false;
  noMoreMsgs     = false;

  unread[user.id] = 0;
  updateNavBadge();
  chatPartnerName.textContent    = user.nickname;
  chatPartnerStatus.className    = 'status-dot ' + (user.online ? 'status-dot--online' : 'status-dot--offline');
  chatPlaceholder.style.display  = 'none';
  chatConversation.style.display = 'flex';
  // Remove only message bubbles — preserve the sentinel, spinner and nomore elements
  chatMessagesArea.querySelectorAll('.chat-msg').forEach(el => el.remove());
  chatNoMore.hidden      = true;
  chatLoadSpinner.hidden = true;

  
  clearChatImagePreview();

  showAppSection('chat');

  document.querySelectorAll('.user-item').forEach(el => {
    el.classList.toggle('active', el.dataset.userId === user.id);
    if (el.dataset.userId === user.id) {
      const b = el.querySelector('.user-item__badge');
      if (b) b.remove();
    }
  });

  await loadMessages(user.id, 0, true);
}

async function loadMessages(partnerID, offset, initial = false) {
  if (loadingMore) return;
  loadingMore = true;

  // Show spinner immediately so the user knows something is happening
  if (!initial) chatLoadSpinner.hidden = false;

  try {
    const res  = await authFetch(`/api/messages?with=${encodeURIComponent(partnerID)}&offset=${offset}`);
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) return;

    if (data.length < 10) {
      noMoreMsgs        = true;
      chatNoMore.hidden = false;
    }

    const me         = JSON.parse(sessionStorage.getItem('user'));
    const prevHeight = chatMessagesArea.scrollHeight;

    if (initial) {
      chatMessagesArea.querySelectorAll('.chat-msg').forEach(el => el.remove());
      data.forEach(m => chatMessagesArea.appendChild(buildMessage(m, me.id)));
      chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
      // Start observing once messages are in the DOM
      setupTopObserver();
    } else {
      // Hide spinner before inserting so it doesn't shift position measurement
      chatLoadSpinner.hidden = true;
      const firstMsg = chatMessagesArea.querySelector('.chat-msg');
      data.reverse().forEach(m => {
        chatMessagesArea.insertBefore(buildMessage(m, me.id), firstMsg);
      });
      chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight - prevHeight;
    }

    msgOffset = offset + data.length;

  } catch (err) {
    console.error('[Chat] loadMessages error:', err);
  } finally {
    loadingMore = false;
    chatLoadSpinner.hidden = true;
  }
}

function buildMessage(m, myID) {
  const mine = String(m.sender_id) === String(myID);
  const div  = document.createElement('div');
  div.className    = 'chat-msg ' + (mine ? 'chat-msg--mine' : 'chat-msg--theirs');
  div.dataset.msgId = m.id;

  if (!mine) {
    const author = document.createElement('span');
    author.className   = 'chat-msg__author';
    author.textContent = m.sender_name || '';
    div.appendChild(author);
  }

  
  if (m.image_url) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'chat-msg__img-wrap';
    const img = document.createElement('img');
    img.src = m.image_url;
    img.className = 'chat-msg__img';
    img.alt = 'image';
    img.loading = 'lazy';
    img.addEventListener('click', () => openLightbox(m.image_url));
    imgWrap.appendChild(img);
    div.appendChild(imgWrap);
  }

  
  if (m.content) {
    const text = document.createElement('p');
    text.className   = 'chat-msg__text';
    text.textContent = m.content;
    div.appendChild(text);
  }

  const time = document.createElement('time');
  time.className   = 'chat-msg__date';
  time.textContent = formatDate(m.created_at);
  div.appendChild(time);

  return div;
}


function openLightbox(src) {
  let lb = document.getElementById('img-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'img-lightbox';
    lb.className = 'lightbox';
    lb.innerHTML = `
      <div class="lightbox__backdrop"></div>
      <div class="lightbox__content">
        <button class="lightbox__close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <img class="lightbox__img" src="" alt="full size image"/>
      </div>`;
    document.body.appendChild(lb);
    lb.querySelector('.lightbox__backdrop').addEventListener('click', closeLightbox);
    lb.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  }
  lb.querySelector('.lightbox__img').src = src;
  lb.classList.add('lightbox--open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('img-lightbox');
  if (lb) lb.classList.remove('lightbox--open');
  document.body.style.overflow = '';
}


chatImageBtn.addEventListener('click', () => {
  chatImageInput.value = '';
  chatImageInput.click();
});

chatImageInput.addEventListener('change', async () => {
  const file = chatImageInput.files[0];
  if (!file) return;

  chatImageBtn.disabled = true;
  chatImageBtn.classList.add('uploading');

  try {
    const url = await uploadImage(file);
    if (!url) return;
    pendingImageURL = url;
    chatImagePreviewImg.src = url;
    chatImagePreview.hidden = false;
  } finally {
    chatImageBtn.disabled = false;
    chatImageBtn.classList.remove('uploading');
  }
});

chatImageRemoveBtn.addEventListener('click', clearChatImagePreview);

function clearChatImagePreview() {
  pendingImageURL = null;
  chatImagePreview.hidden = true;
  chatImagePreviewImg.src = '';
  chatImageInput.value = '';
}

async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  try {
    const res = await authFetch('/api/upload', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Upload failed');
      return null;
    }
    return data.url;
  } catch {
    alert('Upload failed. Please try again.');
    return null;
  }
}

function handleNewPost(post) {
  const postsPage = document.getElementById('posts-page');
  if (!postsPage || postsPage.style.display === 'none') return;

  const me = JSON.parse(sessionStorage.getItem('user') || '{}');
  if (String(post.user_id) === String(me.id)) return;
  if (activeSpecialFilter !== 'all' || activeCategories.size > 0) return;

  const feed = document.getElementById('posts-feed');
  const empty = document.getElementById('posts-feed-empty');
  if (!feed) return;

  const card = buildPostCard(post);
  feed.prepend(card);
  if (empty) empty.hidden = true;
}

function handleVoteUpdate(data) {
  const card = document.querySelector(`.post-card[data-post-id="${data.post_id}"]`);
  if (!card) return;

  const upBtn   = card.querySelector('.vote-btn--up');
  const downBtn = card.querySelector('.vote-btn--down');
  if (upBtn)   upBtn.querySelector('.vote-count').textContent   = data.upvotes;
  if (downBtn) downBtn.querySelector('.vote-count').textContent = data.downvotes;
}

function handleIncomingMessage(msg) {
  const me = JSON.parse(sessionStorage.getItem('user') || '{}');
  const chatVisible = chatPanel.style.display === 'flex';

  if (
    chatVisible &&
    activePartner &&
    (String(msg.sender_id) === String(activePartner.id) ||
     String(msg.receiver_id) === String(activePartner.id))
  ) {
    chatMessagesArea.appendChild(buildMessage(msg, me.id));
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
  } else if (String(msg.sender_id) !== String(me.id)) {
    const sid = String(msg.sender_id);
    unread[sid] = (unread[sid] || 0) + 1;
    updateBadge(sid);
    updateNavBadge();
  }
}

function updateBadge(userID) {
  const li = onlineUsersList.querySelector(`[data-user-id="${userID}"]`);
  if (!li) return;

  let badge = li.querySelector('.user-item__badge');
  const count = unread[userID] || 0;

  if (count === 0) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'user-item__badge';
    li.appendChild(badge);
  }

  badge.textContent = count > 99 ? '99+' : count;
}

chatInputForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text && !pendingImageURL) return;
  if (!activePartner || !ws || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type   : 'send_message',
    payload: {
      receiver_id: activePartner.id,
      content    : text,
      image_url  : pendingImageURL || '',
    },
  }));

  chatInput.value        = '';
  chatInput.style.height = '';
  clearChatImagePreview();
});

chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatInputForm.dispatchEvent(new Event('submit'));
  }
});

chatBackBtn.addEventListener('click', () => {
  if (topSentinelObserver) topSentinelObserver.disconnect();
  chatConversation.style.display = 'none';
  chatPlaceholder.style.display  = '';
  activePartner = null;
  clearChatImagePreview();
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  showAppSection('posts');
});

navHome.addEventListener('click', (e) => {
  e.preventDefault();
  activePartner = null;
  chatConversation.style.display = 'none';
  chatPlaceholder.style.display  = '';
  clearChatImagePreview();
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  showAppSection('posts');
  if (typeof loadPosts === 'function') loadPosts('all');
});

function updateNavBadge() {
  const total = Object.values(unread).reduce((s, n) => s + n, 0);
  if (total > 0) {
    navMessagesBadge.textContent = total > 99 ? '99+' : total;
    navMessagesBadge.hidden = false;
  } else {
    navMessagesBadge.hidden = true;
  }
}

function initChat() {
  if (chatInitialized) return;
  chatInitialized = true;
  connectWS();
}

if (navMessagesBtn && sidebar) {
  // Sidebar starts collapsed — button is not active by default
  navMessagesBtn.classList.toggle('active', !sidebar.classList.contains('sidebar--collapsed'));

  // Toggle button collapses / expands the sidebar
  navMessagesBtn.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('sidebar--collapsed');
    navMessagesBtn.classList.toggle('active', !collapsed);
  });
}

if (sessionStorage.getItem('user')) {
  connectWS();
}