(() => {
  const FEATURED_TEXTS = ['Featured Auctions', 'Featured Auction'];
  const WHY_TEXTS = ['Why Choose NexGenAuction?', 'Why Choose Nexus Auctions?', 'Why Choose Nexus?'];
  function normalize(t) { return String(t || '').trim().replace(/\s+/g, ' '); }
  function isHeadingMatch(el, targets) {
    if (!el) return false;
    const txt = normalize(el.textContent);
    return targets.some(t => {
      const nt = normalize(t).toLowerCase();
      return txt.toLowerCase() === nt || txt.toLowerCase().includes(nt);
    });
  }
  function findBlockForHeading(h) {
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
  function tryReorder(root) {
    const headings = root.querySelectorAll('h1,h2,h3');
    let featuredH = null, whyH = null;
    headings.forEach(h => {
      if (!featuredH && isHeadingMatch(h, FEATURED_TEXTS)) featuredH = h;
      if (!whyH && isHeadingMatch(h, WHY_TEXTS)) whyH = h;
    });
    if (!featuredH || !whyH) return false;
    const featuredBlock = findBlockForHeading(featuredH);
    const whyBlock = findBlockForHeading(whyH);
    if (!featuredBlock || !whyBlock) return false;
    const parent = whyBlock.parentElement;
    if (!parent || featuredBlock === whyBlock) return false;
    if (featuredBlock.nextSibling !== whyBlock) {
      parent.insertBefore(featuredBlock, whyBlock);
    }
    featuredBlock.style.marginBottom = '4rem';
    return true;
  }
  function init() {
    const root = document.getElementById('root') || document.body;
    if (!root) return;
    if (tryReorder(root)) return;
    const obs = new MutationObserver(() => {
      if (tryReorder(root)) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true });
    setTimeout(() => { tryReorder(root); }, 2000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
