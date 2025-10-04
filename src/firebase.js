// src/firebase.js
// Firebase configuration for VFIED V3 - Secure version using environment variables

import { initializeApp } from 'firebase/app';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

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
if (!firebaseConfig.apiKey) {
  console.error('Firebase configuration missing. Please check your .env file.');
  console.error('Required environment variables:');
  console.error('- VITE_FIREBASE_API_KEY');
  console.error('- VITE_FIREBASE_AUTH_DOMAIN');
  console.error('- VITE_FIREBASE_PROJECT_ID');
  console.error('- VITE_FIREBASE_STORAGE_BUCKET');
  console.error('- VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.error('- VITE_FIREBASE_APP_ID');
  console.error('- VITE_FIREBASE_MEASUREMENT_ID');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

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
  RESTAURANT_REVIEWS: 'restaurant_reviews'
};

// Connection status
let isOnline = navigator.onLine;

// Handle online/offline status
window.addEventListener('online', async () => {
  isOnline = true;
  try {
    await enableNetwork(db);
    console.log('Firebase: Back online');
  } catch (error) {
    console.error('Firebase network enable error:', error);
  }
});

window.addEventListener('offline', async () => {
  isOnline = false;
  try {
    await disableNetwork(db);
    console.log('Firebase: Offline mode');
  } catch (error) {
    console.error('Firebase network disable error:', error);
  }
});

// Helper functions
export const isFirebaseOnline = () => isOnline;

// Initialize with success message
try {
  console.log('Firebase initialized successfully with project:', firebaseConfig.projectId);
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export default app;