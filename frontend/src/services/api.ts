import axios from 'axios';

// Prefer relative base URL in development to use CRA proxy
const isDevEnv = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
// Development ports that are expected to proxy API requests
// Exclude lightweight preview ports to force absolute backend URL
const devPorts = new Set(['3000', '3001', '3002', '3003', '5173']);
const shouldUseRelativeApi = isDevEnv && devPorts.has(window.location.port || '');

const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultBackendPort = '5006';
const absoluteDevApi = `http://${hostname}:${defaultBackendPort}/api`;

const API_BASE_URL = (() => {
  const envUrl = process.env.REACT_APP_API_URL;
  // In dev on known ports, always prefer proxy relative path
  if (shouldUseRelativeApi) return '/api';
  // Otherwise respect explicit absolute env URL if provided
  if (envUrl && /^https?:\/\//.test(envUrl)) return envUrl;
  return envUrl || absoluteDevApi;
})();

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Be conservative: only force logout on 401s that are clearly auth-related
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const hadAuthHeader = !!error.config?.headers?.Authorization;
    const isAuthRoute = /\/auth\/(login|register|forgot-password|reset-password)/.test(requestUrl);
    const message = error.response?.data?.message || '';
    const isTokenError = /Token expired|Invalid token|Access denied\. No token provided|User not found|Account is deactivated/i.test(message);

    if (status === 401 && !isAuthRoute && (hadAuthHeader || isTokenError)) {
      // Token expired/invalid or protected endpoint without valid auth
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const apiEndpoints = {
  // Health check
  health: () => api.get('/health'),
  status: () => api.get('/status'),

  // Auth endpoints
  auth: {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    profile: () => api.get('/auth/profile'),
    updateProfile: (data: any) => api.put('/auth/profile', data),
    changePassword: (data: any) => api.put('/auth/change-password', data),
  },

  // Auction endpoints
  auctions: {
    getAll: (params?: any) => api.get('/auctions', { params }),
    getById: (id: string) => api.get(`/auctions/${id}`),
    create: (data: any) => api.post('/auctions', data),
    update: (id: string, data: any) => api.put(`/auctions/${id}`, data),
    delete: (id: string) => api.delete(`/auctions/${id}`),
    placeBid: (id: string, data: any) => api.post(`/bids/${id}/place`, data),
    getUserAuctions: () => api.get('/auctions/my/selling'),
    getUserBids: () => api.get('/auctions/my/bidding'),
    getUserWatchlist: (params?: any) => api.get('/auctions/my/watchlist', { params }),
    addToWatchlist: (id: string) => api.post(`/auctions/${id}/watchlist`),
    removeFromWatchlist: (id: string) => api.delete(`/auctions/${id}/watchlist`),
    getUserHistory: (params?: { page?: number; limit?: number }) => 
      api.get('/auctions/my/history', { params }),
    // Moderation helpers
    updateStatus: (id: string, status: 'active' | 'paused') => 
      api.patch(`/auctions/${id}/status`, { status }),
    extend: (id: string, payload: { extensionMinutes?: number; extensionMs?: number; newEndTime?: string }) => 
      api.post(`/auctions/${id}/extend`, payload),
    cancel: (id: string, payload?: { reason?: string }) => 
      api.post(`/auctions/${id}/cancel`, payload || {}),
  },

  // Category endpoints
  categories: {
    getAll: () => api.get('/categories'),
    getById: (id: string) => api.get(`/categories/${id}`),
    create: (data: any) => api.post('/categories', data),
    update: (id: string, data: any) => api.put(`/categories/${id}`, data),
    delete: (id: string) => api.delete(`/categories/${id}`),
    getTree: () => api.get('/categories/tree'),
  },

  // Account management endpoints
  account: {
    getBalance: () => api.get('/account/balance'),
    getTransactions: (params?: { page?: number; limit?: number; type?: string; status?: string }) => 
      api.get('/account/transactions', { params }),
    getTransactionDetails: (transactionId: string) => api.get(`/account/transactions/${transactionId}`),
    topUp: (data: { amount: number; paymentMethod?: string; currency?: string }) => 
      api.post('/account/topup', data),
    withdraw: (data: { amount: number; withdrawalMethod?: string }) => 
      api.post('/account/withdraw', data),
    getStats: () => api.get('/account/stats'),
  },

  // Bids endpoints
  bids: {
    getCurrent: (id: string) => api.get(`/bids/${id}/current`),
    getHistory: (id: string, params?: { limit?: number; page?: number }) => 
      api.get(`/bids/${id}/history`, { params }),
    setAutoBid: (id: string, data: any) => api.post(`/bids/${id}/auto-bid`, data),
  },

  // Payments endpoints
  payments: {
    getById: (paymentId: string) => api.get(`/payments/${paymentId}`),
    getHistory: (params?: { page?: number; limit?: number; status?: string }) => 
      api.get('/payments', { params }),
    getEscrowStatus: (paymentId: string) => api.get(`/payments/${paymentId}/escrow-status`),
    openDispute: (paymentId: string, data: { reason?: string }) => 
      api.post(`/payments/${paymentId}/disputes`, data),
    getDispute: (paymentId: string) => api.get(`/payments/${paymentId}/disputes`),
    resolveDispute: (paymentId: string, data: { status?: string; resolution?: string }) => 
      api.post(`/payments/${paymentId}/disputes/resolve`, data),
  },
};

export default api;