// src/firebase.js
// Firebase configuration for VFIED V5 - Fixed version with Node.js compatibility
import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Environment detection
const isServer = typeof window === 'undefined';
const isVite = typeof import.meta !== 'undefined' && import.meta.env;

// Get environment variables based on runtime
function getEnvVar(name) {
  if (isServer) {
    // Node.js environment - use process.env
    return process.env[name] || process.env[name.replace('VITE_', '')];
  } else if (isVite) {
    // Vite environment - use import.meta.env
    return import.meta.env[name];
  }
  return undefined;
}

// Debug logging - remove after fixing
if (!isServer) {
  console.log('Environment variables check:', {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY') ? 'Present' : 'Missing',
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    isServer: isServer,
    isVite: isVite
  });
}

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
};

// Validate configuration
const requiredVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN', 
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(varName => !getEnvVar(varName));

if (missingVars.length > 0) {
  console.error('Firebase configuration missing. Please check your .env file.');
  console.error('Missing variables:', missingVars);
  throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Only initialize analytics in browser production
export const analytics = !isServer && typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
  ? getAnalytics(app) 
  : null;

// Enhanced collections for restaurant system
export const COLLECTIONS = {
  // Existing collections
  USERS: 'users',
  DECISIONS: 'decisions',
  FOOD_CHOICES: 'foodChoices',
  USER_PREFERENCES: 'userPreferences',
  APP_STATS: 'appStats',
  INTERACTIONS: 'interactions',
  USER_PATTERNS: 'user_patterns',
  FEEDBACK: 'feedback',
  
  // New restaurant system collections
  RESTAURANTS: 'restaurants',
  MENU_ITEMS: 'menu_items',
  EVENTS: 'events',
  RESTAURANT_OWNERS: 'restaurant_owners',
  RESTAURANT_REVIEWS: 'restaurant_reviews',
  ADMIN_USERS: 'admin_users',
  MODERATORS: 'moderators'
};

// Only run browser-specific code in browser
if (!isServer) {
  // Connection status tracking
  let isOnline = navigator.onLine;
  let isAuthenticated = false;
  let authPromise = null;

  // Authentication status tracking
  onAuthStateChanged(auth, (user) => {
    isAuthenticated = !!user;
    console.log('Firebase auth state changed:', isAuthenticated ? 'authenticated' : 'unauthenticated');
    
    // Dispatch custom event for dashboard to listen to
    window.dispatchEvent(new CustomEvent('firebaseAuthChanged', { 
      detail: { isAuthenticated, user } 
    }));
  });

  // Dashboard authentication function
  const authenticateForDashboard = async () => {
    if (authPromise) return authPromise;
    
    authPromise = (async () => {
      try {
        if (!isAuthenticated) {
          console.log('Authenticating for dashboard access...');
          const userCredential = await signInAnonymously(auth);
          console.log('Dashboard authenticated successfully');
          return userCredential.user;
        }
        return auth.currentUser;
      } catch (error) {
        console.error('Dashboard authentication failed:', error);
        throw error;
      }
    })();
    
    return authPromise;
  };

  // Enhanced network status handling
  const handleOnline = async () => {
    isOnline = true;
    try {
      await enableNetwork(db);
      console.log('Firebase: Back online');
      
      // Re-authenticate if needed
      if (!isAuthenticated) {
        await authenticateForDashboard();
      }
      
      // Dispatch event for dashboard
      window.dispatchEvent(new CustomEvent('firebaseNetworkChanged', { 
        detail: { isOnline: true } 
      }));
    } catch (error) {
      console.error('Firebase network enable error:', error);
    }
  };

  const handleOffline = async () => {
    isOnline = false;
    try {
      await disableNetwork(db);
      console.log('Firebase: Offline mode');
      
      // Dispatch event for dashboard
      window.dispatchEvent(new CustomEvent('firebaseNetworkChanged', { 
        detail: { isOnline: false } 
      }));
    } catch (error) {
      console.error('Firebase network disable error:', error);
    }
  };

  // Handle online/offline status
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Helper functions
  window.isFirebaseOnline = () => isOnline;
  window.isFirebaseAuthenticated = () => isAuthenticated;

  // Dashboard status check function
  const getFirebaseStatus = async () => {
    try {
      if (!isOnline) {
        return { status: 'offline', message: 'No network connection' };
      }
      
      if (!isAuthenticated) {
        await authenticateForDashboard();
      }
      
      // Simple connectivity test
      const startTime = Date.now();
      await import('firebase/firestore').then(({ serverTimestamp, doc, setDoc }) => 
        setDoc(doc(db, '_health', 'dashboard_test'), { 
          timestamp: serverTimestamp(),
          test: true 
        }, { merge: true })
      );
      const responseTime = Date.now() - startTime;
      
      return { 
        status: responseTime < 1000 ? 'operational' : 'degraded', 
        responseTime,
        message: `Connected (${responseTime}ms)`
      };
    } catch (error) {
      console.error('Firebase status check failed:', error);
      return { 
        status: 'error', 
        message: error.message,
        error: error.code || 'unknown_error'
      };
    }
  };

  // Auto-authenticate for dashboard if on dashboard page
  if (window.location.pathname.includes('dashboard')) {
    // Wait for Firebase to initialize, then authenticate
    setTimeout(() => {
      authenticateForDashboard().catch(error => {
        console.warn('Auto-authentication failed:', error);
      });
    }, 1000);
  }

  // Export browser-only functions
  window.authenticateForDashboard = authenticateForDashboard;
  window.getFirebaseStatus = getFirebaseStatus;
}

// Initialize with success message
console.log(`Firebase initialized successfully with project: ${firebaseConfig.projectId}`);

export default app;