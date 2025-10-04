// Utility functions for ID normalization used across watchlist logic
export const normalizeIds = (arr: any[]): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((w: any) => {
      if (typeof w === 'string') return w;
      if (w && typeof w === 'object' && w._id) return w._id.toString();
      return '';
    })
    .filter(Boolean);
};