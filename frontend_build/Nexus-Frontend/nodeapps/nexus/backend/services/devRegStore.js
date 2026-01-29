const store = new Map();

function key(auctionId, userId) {
  return `${String(auctionId)}:${String(userId)}`;
}

function get(auctionId, userId) {
  return store.get(key(auctionId, userId)) || null;
}

function upsert(auctionId, userId, data) {
  const existing = get(auctionId, userId) || { auctionId, userId, status: 'registered', createdAt: new Date() };
  const merged = { ...existing, ...data };
  store.set(key(auctionId, userId), merged);
  return merged;
}

module.exports = { get, upsert };