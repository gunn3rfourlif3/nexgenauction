import axios from 'axios';

const isDevEnv = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const devPorts = new Set(['3001', '3010', '3011', '5173']);
const shouldUseRelativeApi = isDevEnv && devPorts.has(window.location.port || '');
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultBackendPort = '5006';

export const checkApiStatus = async () => {
  const absoluteDevApi = `http://${hostname}:${defaultBackendPort}`;
  const envApi = (process.env.REACT_APP_API_URL || '').trim();
  const isEnvRelative = envApi.startsWith('/');
  // Determine base path: relative in dev proxy; otherwise absolute env or dev default
  const baseUrl = (shouldUseRelativeApi || isEnvRelative) ? '' : (envApi || absoluteDevApi);
  const cleanBase = baseUrl.replace(/\/$/, '');
  // Avoid double /api when envApi already includes it
  const url = cleanBase
    ? (cleanBase.endsWith('/api') ? `${cleanBase}/status` : `${cleanBase}/api/status`)
    : '/api/status';
  
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('API status check failed:', error);
    return { 
      success: false, 
      error: error.response?.data || error.message || 'Network Error' 
    };
  }
};
