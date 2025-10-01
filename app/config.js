// Enhanced config.js for mobile
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.protocol === 'capacitor:'; // Add this for Capacitor

const API_PORT = 3048;

export const CONFIG = {
  API_BASE: isDevelopment 
    ? `http://localhost:${API_PORT}` 
    : 'https://vfied-v4-clean.onrender.com',
  
  TIMEOUT: 10000, // Increase to 10s for mobile networks
  ENABLE_AI: true,
  ENABLE_WEATHER: true,
  DEFAULT_LOCATION: { city: 'London', country_code: 'GB' },
  
  // Add mobile-specific settings
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 300000 // 5 minutes
};