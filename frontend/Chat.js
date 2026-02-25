const chatPanel           = document.getElementById('chat-panel');
const chatPlaceholder     = document.getElementById('chat-placeholder');
const chatConversation    = document.getElementById('chat-conversation');
const chatPartnerName     = document.getElementById('chat-partner-name');
const chatPartnerStatus   = document.getElementById('chat-partner-status');
const chatMessagesArea    = document.getElementById('chat-messages-area');
const chatNoMore          = document.getElementById('chat-no-more-messages');
const chatInputForm       = document.getElementById('chat-input-form');
const chatInput           = document.getElementById('chat-input');
const chatBackBtn         = document.getElementById('chat-back-btn');
const onlineUsersList     = document.getElementById('online-users-list');
const navMessagesBtn      = document.getElementById('nav-messages-btn');
const navMessagesBadge    = document.getElementById('nav-messages-badge');
const navHome             = document.getElementById('nav-home');
const sidebar             = document.getElementById('online-users-sidebar');

let ws             = null;
let activePartner  = null;
let msgOffset      = 0;
let loadingMore    = false;
let noMoreMsgs     = false;
let unread         = {};
let userMap        = {};
let chatInitialized = false;

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

  ws = new WebSocket(`ws://${location.host}/ws`);

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
      case 'force_logout': {
        const dying = ws;   // capture before nulling
        ws = null;          // stop the reconnect loop
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
  chatMessagesArea.innerHTML     = '';
  chatNoMore.hidden              = true;

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

  try {
    const res  = await fetch(`/api/messages?with=${encodeURIComponent(partnerID)}&offset=${offset}`);
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) return;

    if (data.length < 10) {
      noMoreMsgs        = true;
      chatNoMore.hidden = false;
    }

    const me         = JSON.parse(sessionStorage.getItem('user'));
    const prevHeight = chatMessagesArea.scrollHeight;

    if (initial) {
      chatMessagesArea.innerHTML = '';
      data.forEach(m => chatMessagesArea.appendChild(buildMessage(m, me.id)));
      chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    } else {
      data.reverse().forEach(m => {
        chatMessagesArea.insertBefore(buildMessage(m, me.id), chatMessagesArea.firstChild);
      });
      chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight - prevHeight;
    }

    msgOffset = offset + data.length;

  } catch (err) {
    console.error('[Chat] loadMessages error:', err);
  } finally {
    loadingMore = false;
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

  const text = document.createElement('p');
  text.className   = 'chat-msg__text';
  text.textContent = m.content;
  div.appendChild(text);

  const time = document.createElement('time');
  time.className   = 'chat-msg__date';
  time.textContent = formatDate(m.created_at);
  div.appendChild(time);

  return div;
}

function handleIncomingMessage(msg) {
  const me = JSON.parse(sessionStorage.getItem('user') || '{}');

  if (
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
  if (!text || !activePartner || !ws || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type   : 'send_message',
    payload: { receiver_id: activePartner.id, content: text },
  }));

  chatInput.value        = '';
  chatInput.style.height = '';
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

chatMessagesArea.addEventListener('scroll', throttle(() => {
  if (chatMessagesArea.scrollTop < 60 && !loadingMore && !noMoreMsgs && activePartner) {
    loadMessages(activePartner.id, msgOffset, false);
  }
}, 300));

chatBackBtn.addEventListener('click', () => {
  chatConversation.style.display = 'none';
  chatPlaceholder.style.display  = '';
  activePartner = null;
  document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
  showAppSection('posts');
});

navHome.addEventListener('click', (e) => {
  e.preventDefault();
  showAppSection('posts');
  if (typeof loadPosts === 'function') loadPosts('all');
});

// update the badge on the icon button
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

// Wire the sidebar toggle button once at load time —
// both elements are always present in the DOM regardless of login state.
if (navMessagesBtn && sidebar) {
  navMessagesBtn.addEventListener('click', () => {
    const collapsed = sidebar.classList.toggle('sidebar--collapsed');
    navMessagesBtn.classList.toggle('active', !collapsed);
  });

  // Close sidebar when clicking the dim backdrop (outside the panel)
  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('sidebar--collapsed') &&
        !sidebar.contains(e.target) &&
        !navMessagesBtn.contains(e.target)) {
      sidebar.classList.add('sidebar--collapsed');
      navMessagesBtn.classList.remove('active');
    }
  });
}

if (sessionStorage.getItem('user')) {
  connectWS();
}
