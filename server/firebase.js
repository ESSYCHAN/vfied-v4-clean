// server/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Validate configuration
const requiredVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN', 
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('Firebase configuration missing for server. Missing variables:', missingVars);
  throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const COLLECTIONS = {
  USERS: 'users',
  DECISIONS: 'decisions',
  FOOD_CHOICES: 'foodChoices',
  USER_PREFERENCES: 'userPreferences',
  APP_STATS: 'appStats',
  INTERACTIONS: 'interactions',
  USER_PATTERNS: 'user_patterns',
  FEEDBACK: 'feedback',
  RESTAURANTS: 'restaurants',
  MENU_ITEMS: 'menu_items',
  EVENTS: 'events',
  RESTAURANT_OWNERS: 'restaurant_owners',
  RESTAURANT_REVIEWS: 'restaurant_reviews',
  ADMIN_USERS: 'admin_users',
  MODERATORS: 'moderators'
};

console.log(`Server Firebase initialized with project: ${firebaseConfig.projectId}`);