// server/firebase-admin.js
import admin from 'firebase-admin';

let firebaseAdmin = null;
let adminDb = null;
let adminAuth = null;

try {
  if (!admin.apps.length) {
    let serviceAccount;
    
    // Try environment variable first (for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log('Using Firebase service account from environment variable');
    } 
    // Try file path (for local development)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const { readFileSync } = await import('fs');
      serviceAccount = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
      console.log('Using Firebase service account from file');
    }
    else {
      console.log('No Firebase service account configured');
      throw new Error('No Firebase credentials found');
    }
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'vfiedv3'
    });
    
    adminDb = admin.firestore();
    adminAuth = admin.auth();
    
    console.log('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

export { adminDb, adminAuth };
export default firebaseAdmin;