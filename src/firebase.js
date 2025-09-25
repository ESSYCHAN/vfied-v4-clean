// Firebase configuration for VFIED V3 - Updated with real config
import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase config using environment variables (with your real values as fallback)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Firestore collections (keeping your existing structure + adding new ones for AI)
export const COLLECTIONS = {
  USERS: 'users',
  DECISIONS: 'decisions',
  FOOD_CHOICES: 'foodChoices',
  USER_PREFERENCES: 'userPreferences',
  APP_STATS: 'appStats',
  // New collections for AI features
  INTERACTIONS: 'interactions',
  USER_PATTERNS: 'user_patterns',
  FEEDBACK: 'feedback'
};

// Connection status
let isOnline = navigator.onLine;

// Handle online/offline status
window.addEventListener('online', async () => {
  isOnline = true;
  try {
    await enableNetwork(db);
    console.log('🔥 Firebase: Back online');
  } catch (error) {
    console.error('Firebase network enable error:', error);
  }
});

window.addEventListener('offline', async () => {
  isOnline = false;
  try {
    await disableNetwork(db);
    console.log('🔥 Firebase: Offline mode');
  } catch (error) {
    console.error('Firebase network disable error:', error);
  }
});

// Helper functions
export const isFirebaseOnline = () => isOnline;

// Initialize offline persistence
try {
  // Firestore will automatically handle offline persistence
  console.log('🔥 Firebase initialized successfully with project:', firebaseConfig.projectId);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export default app;