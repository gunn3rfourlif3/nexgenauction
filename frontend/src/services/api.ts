import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
    if (error.response?.status === 401) {
      // Token expired or invalid
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
    addToWatchlist: (id: string) => api.post(`/auctions/${id}/watchlist`),
    removeFromWatchlist: (id: string) => api.delete(`/auctions/${id}/watchlist`),
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
};

export default api;