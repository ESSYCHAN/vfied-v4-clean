// Enhanced config.js for mobile
const isDevelopment = (window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1') &&
                     window.location.protocol !== 'capacitor:';

// Debug logging
console.log('🔍 Config Debug:', {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  isDevelopment: isDevelopment,
  will_use: isDevelopment ? 'localhost:3048' : 'https://vfied-v4-clean.onrender.com'
});

const API_PORT = 3048;
export const CONFIG = {
  API_BASE: 'https://vfied-v4-clean.onrender.com', // Force production
  TIMEOUT: 10000,
  ENABLE_AI: true,
  ENABLE_WEATHER: true,
  DEFAULT_LOCATION: { city: 'London', country_code: 'GB' },
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 300000
};