// Determine API base URL
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_PORT = 3049; // Your server port

export const CONFIG = {
  API_BASE: isDevelopment 
    ? `http://localhost:${API_PORT}` 
    : 'https://vfied-v3.onrender.com', // Change this line only
  
  TIMEOUT: 5000, // Add this line for mobile
  ENABLE_AI: true,
  ENABLE_WEATHER: true,
  DEFAULT_LOCATION: { city: 'London', country_code: 'GB' }
};
