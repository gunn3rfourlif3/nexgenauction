import axios from 'axios';

const isDevEnv = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const devPorts = new Set(['3000', '3001', '3010', '3011', '5173']);
const shouldUseRelativeApi = isDevEnv && devPorts.has(window.location.port || '');
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultBackendPort = '5005';

export const checkApiStatus = async () => {
  const absoluteDevApi = `http://${hostname}:${defaultBackendPort}`;
  const baseUrl = shouldUseRelativeApi ? '' : (process.env.REACT_APP_API_URL || absoluteDevApi);
  const url = `${baseUrl}/api/status`;
  
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