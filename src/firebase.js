// src/firebase.js
// Firebase configuration for VFIED V5 - Fixed version with dashboard authentication
import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Debug logging - remove after fixing
console.log('Environment variables check:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'Present' : 'Missing',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  allEnvVars: import.meta.env
});

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
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

const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

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

// Only initialize analytics in production
export const analytics = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
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
export const authenticateForDashboard = async () => {
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
export const isFirebaseOnline = () => isOnline;
export const isFirebaseAuthenticated = () => isAuthenticated;

// Dashboard status check function
export const getFirebaseStatus = async () => {
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
if (typeof window !== 'undefined' && window.location.pathname.includes('dashboard')) {
  // Wait for Firebase to initialize, then authenticate
  setTimeout(() => {
    authenticateForDashboard().catch(error => {
      console.warn('Auto-authentication failed:', error);
    });
  }, 1000);
}

// Initialize with success message
console.log(`Firebase initialized successfully with project: ${firebaseConfig.projectId}`);

export default app;