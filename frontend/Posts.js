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
const postImageBtn       = document.getElementById('post-image-btn');
const postImageInput     = document.getElementById('post-image-input');
const postImagePreview   = document.getElementById('post-image-preview');
const postImagePreviewImg= document.getElementById('post-image-preview-img');
const postImageRemoveBtn = document.getElementById('post-image-remove-btn');

let activeSpecialFilter = 'all';
let activeCategories    = new Set();
let pendingPostImageURL = null;


postImageBtn.addEventListener('click', () => {
  postImageInput.value = '';
  postImageInput.click();
});

postImageInput.addEventListener('change', async () => {
  const file = postImageInput.files[0];
  if (!file) return;

  postImageBtn.disabled = true;
  postImageBtn.classList.add('uploading');

  try {
    const url = await uploadImage(file);
    if (!url) return;
    pendingPostImageURL = url;
    postImagePreviewImg.src = url;
    postImagePreview.hidden = false;
  } finally {
    postImageBtn.disabled = false;
    postImageBtn.classList.remove('uploading');
  }
});

postImageRemoveBtn.addEventListener('click', clearPostImagePreview);

function clearPostImagePreview() {
  pendingPostImageURL = null;
  postImagePreview.hidden = true;
  postImagePreviewImg.src = '';
  postImageInput.value = '';
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
    const res  = await authFetch(url);
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

  const imgHTML = post.image_url
    ? `<div class="post-card__img-wrap">
         <img src="${escapeHTML(post.image_url)}" class="post-card__img" alt="post image" loading="lazy"/>
       </div>`
    : '';

  article.innerHTML = `
    <div class="post-card__header">
      <span class="post-card__author">@${escapeHTML(post.nickname)}</span>
      <div class="post-card__categories">${buildCategoryBadges(post.category)}</div>
      <span class="post-card__date">${formatDate(post.created_at)}</span>
    </div>
    <div class="post-card__body">
      <h3 class="post-card__title">${escapeHTML(post.title)}</h3>
      ${post.content ? `<p class="post-card__content">${escapeHTML(post.content)}</p>` : ''}
      ${imgHTML}
    </div>
    <div class="post-card__footer">
      <button class="vote-btn vote-btn--up ${upActive}" data-value="1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        <span class="vote-count">${post.upvotes}</span>
      </button>
      <button class="vote-btn vote-btn--down ${downActive}" data-value="-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        <span class="vote-count">${post.downvotes}</span>
      </button>
      <span class="post-card__comments-hint">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        click to comment
      </span>
    </div>`;

  
  const imgEl = article.querySelector('.post-card__img');
  if (imgEl) {
    imgEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(post.image_url);
    });
  }

  article.addEventListener('click', (e) => {
    if (!e.target.closest('.vote-btn') && !e.target.closest('.post-card__img-wrap')) {
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
    const res  = await authFetch('/api/votes', {
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
  if (!postContentInput.value.trim() && !pendingPostImageURL) {
    postContentError.textContent = 'Add content or an image.'; valid = false;
  }
  if (!valid) return;

  try {
    const res = await authFetch('/api/posts', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        title     : postTitleInput.value.trim(),
        categories: categories,
        content   : postContentInput.value.trim(),
        image_url : pendingPostImageURL || '',
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
    clearPostImagePreview();
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