/*
 * init.js  –  Post-module initialisation.
 *             Runs after ALL JS modules have loaded
 *             (Login, Registration, Posts, PostDetail, Chat).
 */

// Trigger the initial post load for logged-in users
// (showPage in app.js called loadPosts before modules were ready)
if (sessionStorage.getItem('user')) loadPosts();

// Health-check — show the server-error overlay immediately if the
// backend cannot be reached within 4 seconds.
(async () => {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 4000);
    await fetch('/api/posts', { signal: ctrl.signal });
  } catch {
    showServerError();
  }
})();
