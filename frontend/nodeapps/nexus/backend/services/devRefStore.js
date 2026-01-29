const store = new Map();

function upsert(ref, data) {
  const existing = store.get(ref) || {};
  const next = { ...existing, ...data, reference: ref };
  store.set(ref, next);
  return next;
}

function get(ref) {
  return store.get(ref) || null;
}

function listByAuction(auctionId) {
  const out = [];
  for (const v of store.values()) {
    if (String(v.auctionId) === String(auctionId)) out.push(v);
  }
  return out;
}

module.exports = { upsert, get, listByAuction };