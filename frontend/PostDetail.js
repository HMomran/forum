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

  postDetailContent.innerHTML = `
    <div class="post-detail__header">
      <span class="post-card__author">@${escapeHTML(post.nickname)}</span>
      <div class="post-card__categories">${buildCategoryBadges(post.category)}</div>
      <span class="post-card__date">${formatDate(post.created_at)}</span>
    </div>
    <h2 class="post-detail__title">${escapeHTML(post.title)}</h2>
    <p class="post-detail__body">${escapeHTML(post.content)}</p>`;

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
    const res  = await fetch(`/api/comments?post_id=${encodeURIComponent(postID)}`);
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
    const res = await fetch('/api/comments', {
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
