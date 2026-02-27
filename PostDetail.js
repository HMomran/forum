const postDetailContent  = document.getElementById('post-detail-content');
const backToPostsBtn     = document.getElementById('back-to-posts-btn');
const addCommentForm     = document.getElementById('add-comment-form');
const commentInput       = document.getElementById('comment-input');
const commentInputError  = document.getElementById('comment-input-error');
const commentsList       = document.getElementById('comments-list');
const commentsEmpty      = document.getElementById('comments-empty');

let activePost = null;

function openPostDetail(post) {
  activePost = post;

  const imgHTML = post.image_url
    ? `<div class="post-detail__img-wrap" onclick="openLightbox('${escapeAttr(post.image_url)}')">
         <img src="${escapeAttr(post.image_url)}" class="post-detail__img" alt="post image" loading="lazy"/>
       </div>`
    : '';

  postDetailContent.innerHTML = `
    <div class="post-detail__header">
      <span class="post-card__author">@${escapeHTML(post.nickname)}</span>
      <div class="post-card__categories">${buildCategoryBadges(post.category)}</div>
      <span class="post-card__date">${formatDate(post.created_at)}</span>
    </div>
    <h2 class="post-detail__title">${escapeHTML(post.title)}</h2>
    ${post.content ? `<p class="post-detail__body">${escapeHTML(post.content)}</p>` : ''}
    ${imgHTML}
    <div class="post-detail__votes">
      <button class="vote-btn vote-btn--up ${post.user_vote === 1 ? 'vote-btn--active' : ''}" data-value="1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
        <span class="vote-count">${post.upvotes}</span>
      </button>
      <button class="vote-btn vote-btn--down ${post.user_vote === -1 ? 'vote-btn--active' : ''}" data-value="-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        <span class="vote-count">${post.downvotes}</span>
      </button>
    </div>`;

  
  const upBtn   = postDetailContent.querySelector('.vote-btn--up');
  const downBtn = postDetailContent.querySelector('.vote-btn--down');

  [upBtn, downBtn].forEach(btn => {
    btn.addEventListener('click', async () => {
      const result = await submitVote(activePost.id, parseInt(btn.dataset.value));
      if (!result) return;
      activePost.upvotes   = result.upvotes;
      activePost.downvotes = result.downvotes;
      activePost.user_vote = result.user_vote;
      upBtn.querySelector('.vote-count').textContent   = result.upvotes;
      downBtn.querySelector('.vote-count').textContent = result.downvotes;
      upBtn.classList.toggle('vote-btn--active',   result.user_vote ===  1);
      downBtn.classList.toggle('vote-btn--active', result.user_vote === -1);
    });
  });

  commentsList.innerHTML = '';
  commentsEmpty.hidden = true;
  commentInput.value = '';
  commentInputError.textContent = '';
  loadComments(post.id);

  document.getElementById('posts-page').style.display    = 'none';
  document.getElementById('post-detail-page').style.display = 'block';
}

async function loadComments(postID) {
  try {
    const res  = await authFetch(`/api/comments?post_id=${encodeURIComponent(postID)}`);
    const data = await res.json();

    if (!res.ok) return;

    commentsList.innerHTML = '';
    if (!data || data.length === 0) {
      commentsEmpty.hidden = false;
      return;
    }

    data.forEach(c => commentsList.appendChild(buildComment(c)));

  } catch { /* silent */ }
}

function buildComment(c) {
  const div = document.createElement('div');
  div.className = 'comment';
  div.dataset.commentId = c.id;
  div.innerHTML = `
    <div class="comment__meta">
      <strong class="comment__author">@${escapeHTML(c.nickname)}</strong>
      <span class="comment__date">${formatDate(c.created_at)}</span>
    </div>
    <p class="comment__text">${escapeHTML(c.content)}</p>`;
  return div;
}

addCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  commentInputError.textContent = '';

  if (!commentInput.value.trim()) {
    commentInputError.textContent = 'Comment cannot be empty.';
    return;
  }
  if (!activePost) return;

  try {
    const res = await authFetch('/api/comments', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        post_id: activePost.id,
        content: commentInput.value.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      commentInputError.textContent = data.error || 'Failed to post comment.';
      return;
    }

    commentsEmpty.hidden = true;
    commentsList.appendChild(buildComment(data));
    commentInput.value = '';

  } catch {
    commentInputError.textContent = 'Network error. Please try again.';
  }
});

commentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    addCommentForm.dispatchEvent(new Event('submit'));
  }
});

backToPostsBtn.addEventListener('click', () => {
  activePost = null;
  document.getElementById('post-detail-page').style.display = 'none';
  document.getElementById('posts-page').style.display       = 'block';
});


function escapeAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}