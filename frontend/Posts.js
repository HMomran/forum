const createPostForm     = document.getElementById('create-post-form');
const postTitleInput     = document.getElementById('post-title');
const postContentInput   = document.getElementById('post-content');
const postTitleError     = document.getElementById('post-title-error');
const postCategoryError  = document.getElementById('post-category-error');
const postContentError   = document.getElementById('post-content-error');
const createPostError    = document.getElementById('create-post-error');
const postsFeed          = document.getElementById('posts-feed');
const postsFeedEmpty     = document.getElementById('posts-feed-empty');
const specialFilterBtns  = document.querySelectorAll('.filter-btn[data-filter]');
const categoryFilterBtns = document.querySelectorAll('.filter-btn[data-category]');

let activeSpecialFilter = 'all';
let activeCategories    = new Set();

postContentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    createPostForm.dispatchEvent(new Event('submit'));
  }
});

function getSelectedCategories() {
  return [...document.querySelectorAll('#post-categories-options input:checked')]
    .map(el => el.value);
}

async function loadPosts() {
  postsFeed.innerHTML   = '';
  postsFeedEmpty.hidden = true;

  let url = '/api/posts';
  if (activeSpecialFilter === 'mine' || activeSpecialFilter === 'liked') {
    url += `?filter=${activeSpecialFilter}`;
  } else if (activeCategories.size > 0) {
    url += `?categories=${[...activeCategories].join(',')}`;
  }

  try {
    const res  = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      postsFeed.innerHTML = `<p class="feed-error">${data.error || 'Failed to load posts.'}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      postsFeedEmpty.hidden = false;
      return;
    }

    data.forEach(post => postsFeed.appendChild(buildPostCard(post)));

  } catch {
    postsFeed.innerHTML = '<p class="feed-error">Network error. Could not load posts.</p>';
  }
}

function buildCategoryBadges(categoryStr) {
  if (!categoryStr) return '';
  return categoryStr.split(',')
    .map(c => `<span class="post-card__category">${escapeHTML(c.trim())}</span>`)
    .join('');
}

function buildPostCard(post) {
  const article = document.createElement('article');
  article.className  = 'post-card';
  article.dataset.postId = post.id;

  const upActive   = post.user_vote ===  1 ? 'vote-btn--active' : '';
  const downActive = post.user_vote === -1 ? 'vote-btn--active' : '';

  article.innerHTML = `
    <div class="post-card__header">
      <span class="post-card__author">@${escapeHTML(post.nickname)}</span>
      <div class="post-card__categories">${buildCategoryBadges(post.category)}</div>
      <span class="post-card__date">${formatDate(post.created_at)}</span>
    </div>
    <div class="post-card__body">
      <h3 class="post-card__title">${escapeHTML(post.title)}</h3>
      <p class="post-card__content">${escapeHTML(post.content)}</p>
    </div>
    <div class="post-card__footer">
      <button class="vote-btn vote-btn--up ${upActive}" data-value="1">
        👍 <span class="vote-count">${post.upvotes}</span>
      </button>
      <button class="vote-btn vote-btn--down ${downActive}" data-value="-1">
        👎 <span class="vote-count">${post.downvotes}</span>
      </button>
      <span class="post-card__comments-hint">💬 click to read & comment</span>
    </div>`;

  article.addEventListener('click', (e) => {
    if (!e.target.closest('.vote-btn')) {
      openPostDetail(post);
    }
  });

  const upBtn   = article.querySelector('.vote-btn--up');
  const downBtn = article.querySelector('.vote-btn--down');

  [upBtn, downBtn].forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const result = await submitVote(post.id, parseInt(btn.dataset.value));
      if (!result) return;
      post.upvotes   = result.upvotes;
      post.downvotes = result.downvotes;
      post.user_vote = result.user_vote;
      upBtn.querySelector('.vote-count').textContent   = result.upvotes;
      downBtn.querySelector('.vote-count').textContent = result.downvotes;
      upBtn.classList.toggle('vote-btn--active',   result.user_vote ===  1);
      downBtn.classList.toggle('vote-btn--active', result.user_vote === -1);
    });
  });

  return article;
}

async function submitVote(postID, value) {
  try {
    const res  = await fetch('/api/votes', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ post_id: postID, value }),
    });
    const data = await res.json();
    return res.ok ? data : null;
  } catch {
    return null;
  }
}

createPostForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  postTitleError.textContent    = '';
  postCategoryError.textContent = '';
  postContentError.textContent  = '';
  createPostError.textContent   = '';

  const categories = getSelectedCategories();
  let valid = true;

  if (!postTitleInput.value.trim()) {
    postTitleError.textContent = 'Title is required.'; valid = false;
  }
  if (categories.length === 0) {
    postCategoryError.textContent = 'Select at least one category.'; valid = false;
  }
  if (!postContentInput.value.trim()) {
    postContentError.textContent = 'Content is required.'; valid = false;
  }
  if (!valid) return;

  try {
    const res = await fetch('/api/posts', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        title     : postTitleInput.value.trim(),
        categories: categories,
        content   : postContentInput.value.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      createPostError.textContent = data.error || 'Failed to create post.';
      return;
    }
    postsFeed.prepend(buildPostCard(data));
    postsFeedEmpty.hidden = true;
    createPostForm.reset();
  } catch {
    createPostError.textContent = 'Network error. Please try again.';
  }
});

specialFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.filter;
    if (f === 'all') {
      activeSpecialFilter = 'all';
      activeCategories.clear();
      categoryFilterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    } else {
      activeSpecialFilter = (activeSpecialFilter === f) ? 'all' : f;
      activeCategories.clear();
      categoryFilterBtns.forEach(b => b.classList.remove('filter-btn--active'));
    }
    syncFilterUI();
    loadPosts();
  });
});

categoryFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.category;
    activeSpecialFilter = 'all';
    if (activeCategories.has(cat)) {
      activeCategories.delete(cat);
      btn.classList.remove('filter-btn--active');
    } else {
      activeCategories.add(cat);
      btn.classList.add('filter-btn--active');
    }
    syncFilterUI();
    loadPosts();
  });
});

function syncFilterUI() {
  specialFilterBtns.forEach(btn => {
    const f = btn.dataset.filter;
    btn.classList.toggle('filter-btn--active',
      f === 'all'
        ? activeSpecialFilter === 'all' && activeCategories.size === 0
        : activeSpecialFilter === f
    );
  });
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
