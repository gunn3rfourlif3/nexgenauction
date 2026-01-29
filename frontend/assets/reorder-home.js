(() => {
  const FEATURED = ['Featured Auctions'];
  const WHY = ['Why Choose Nexus Auctions?', 'Why Choose NexGenAuction?'];
  function norm(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function match(el, targets) {
    const t = norm(el?.textContent);
    return targets.some(x => t.includes(norm(x)));
  }
  function findBlock(h) {
    if (!h) return null;
    let n = h;
    while (n && n.parentElement) {
      if (n.tagName === 'SECTION') return n;
      const cls = String(n.className || '');
      if (n.tagName === 'DIV' && /\b(py-|bg-|max-w-|container|grid)\b/.test(cls)) return n;
      n = n.parentElement;
    }
    return null;
  }
  function reorder(root) {
    const hs = root.querySelectorAll('h1,h2,h3');
    let fh = null, wh = null;
    hs.forEach(h => {
      if (!fh && match(h, FEATURED)) fh = h;
      if (!wh && match(h, WHY)) wh = h;
    });
    const fb = findBlock(fh), wb = findBlock(wh);
    if (!fb || !wb || !wb.parentElement) return false;
    const parent = wb.parentElement;
    if (fb !== wb && fb.nextSibling !== wb) parent.insertBefore(fb, wb);
    fb.style.marginBottom = '4rem';
    return true;
  }
  function init() {
    const root = document.getElementById('root') || document.body;
    if (!root) return;
    if (reorder(root)) return;
    const obs = new MutationObserver(() => { if (reorder(root)) obs.disconnect(); });
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(() => { reorder(root); }, 1500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
