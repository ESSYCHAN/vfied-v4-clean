// Enhanced config.js for mobile and web compatibility

// Detect environment
const isCapacitor = window.location.protocol === 'capacitor:';
const isLocalhost = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
const isDevelopment = isLocalhost && !isCapacitor;

// Debug logging
console.log('🔍 Config Environment Detection:', {
  hostname: window.location.hostname,
  protocol: window.location.protocol,
  isCapacitor: isCapacitor,
  isLocalhost: isLocalhost,
  isDevelopment: isDevelopment,
  will_use_api: isDevelopment ? 'localhost:3048' : 'production'
});

const API_PORT = 3048;

export const CONFIG = {
  // Force production URL for Capacitor (mobile) apps, allow localhost for web development
  API_BASE: isCapacitor 
    ? 'https://vfied-v4-clean.onrender.com'
    : isDevelopment 
      ? `http://localhost:${API_PORT}` 
      : 'https://vfied-v4-clean.onrender.com',
  
  TIMEOUT: 15000, // Increased timeout for mobile networks
  ENABLE_AI: true,
  ENABLE_WEATHER: true,
  DEFAULT_LOCATION: { city: 'London', country_code: 'GB' },
  
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION: 300000,
  
  // Mobile-specific settings
  MOBILE_OPTIMIZATIONS: {
    REDUCED_ANIMATIONS: isCapacitor,
    OFFLINE_SUPPORT: isCapacitor,
    NATIVE_FEATURES: isCapacitor
  },
  
  // Debug settings
  DEBUG: {
    LOG_API_CALLS: true,
    LOG_ERRORS: true,
    ENVIRONMENT: isCapacitor ? 'mobile' : isDevelopment ? 'development' : 'production'
  }
};

// Additional mobile-specific configuration
if (isCapacitor) {
  console.log('📱 Mobile app detected - using production API');
  console.log('🔗 API Base:', CONFIG.API_BASE);
} else if (isDevelopment) {
  console.log('💻 Development mode - using localhost API');
  console.log('🔗 API Base:', CONFIG.API_BASE);
} else {
  console.log('🌐 Production web - using production API');
  console.log('🔗 API Base:', CONFIG.API_BASE);
}

// Export environment info for debugging
export const ENVIRONMENT_INFO = {
  isCapacitor,
  isLocalhost,
  isDevelopment,
  platform: isCapacitor ? 'mobile' : 'web',
  api_target: CONFIG.API_BASE
};