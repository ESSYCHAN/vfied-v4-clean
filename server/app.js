// app.js - Main entry point with Firebase integration

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import fs from 'fs';
import multer from 'multer';
import { randomUUID } from 'crypto';
import { menuManager } from './menu_manager.js';

// Import route modules
import { setupFoodRoutes } from './routes/food.js';
import { setupEventsRoutes } from './routes/events.js';
import { setupTravelRoutes } from './routes/travel.js';
import { setupUtilityRoutes } from './routes/utility.js';
import { setupRestaurantRoutes } from './routes/restaurants.js';

// Import Firebase admin
let adminDb = null;
let adminAuth = null;
try {
  const firebaseAdmin = await import('./firebase-admin.js');
  adminDb = firebaseAdmin.adminDb;
  adminAuth = firebaseAdmin.adminAuth;
} catch (error) {
  console.log('Firebase Admin SDK not available:', error.message);
}

// Environment variables
const PORT = process.env.PORT || process.env.MCP_PORT || 3048;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
fs.promises.mkdir(dataDir, { recursive: true }).catch(console.error);
const app = express();

// Middleware
app.set('trust proxy', 1);

// Updated CORS configuration for mobile app support
app.use(cors({
  origin(origin, cb) {
    console.log('CORS check for origin:', origin);
    
    // Always allow requests with no origin (mobile apps, server-to-server, Postman)
    if (!origin) {
      console.log('✅ No origin - allowing (mobile app or direct request)');
      return cb(null, true);
    }
    
    // Allow Capacitor origins (mobile apps)
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
      console.log('✅ Capacitor/Ionic origin - allowing mobile app');
      return cb(null, true);
    }
    
    // Allow localhost development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      console.log('✅ Local development origin - allowing');
      return cb(null, true);
    }
    
    // Allow production domains
    if (origin.includes('vercel.app') || origin.includes('onrender.com')) {
      console.log('✅ Production domain - allowing');
      return cb(null, true);
    }
    
    // Allow all for now (you can restrict this later for security)
    console.log('✅ Other origin - allowing (permissive mode)');
    return cb(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-ID']
}));

// Handle preflight requests
app.options('*', cors());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      connectSrc: [
        "'self'",
        "api.openai.com",
        "api.openweathermap.org",
        "localhost:*",
        "127.0.0.1:*",
        "https://*.vercel.app",
        "https://*.onrender.com",
        "https://vfied-v4-clean.onrender.com",
        "https://firestore.googleapis.com",
        "https://firebase.googleapis.com"
      ],
      imgSrc: ["'self'", "data:", "blob:"]
    }
  }
}));

app.use(rateLimit({ windowMs: 60_000, max: 300 }));
app.use(express.json({ limit: '1mb' }));

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Static files
app.use('/src', express.static(path.resolve(__dirname, '../src')));
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));
app.use(express.static(path.resolve(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.resolve(__dirname, '../dist')));
app.use(express.static(path.resolve(__dirname, '../app')));

// Basic routes
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, '../public/index.html')));
app.get('/app', (req, res) => res.sendFile(path.resolve(__dirname, '../index.html')));
app.get('/docs', (req, res) => res.sendFile(path.resolve(__dirname, '../app/docs.html')));
app.get('/demo', (req, res) => res.sendFile(path.resolve(__dirname, '../app/demo.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, '../app/dashboard.html')));
app.get('/submit-event', (req, res) => res.sendFile(path.resolve(__dirname, '../app/submit-event.html')));
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, '../admin.html')));
app.get('/signup', (req, res) => res.sendFile(path.resolve(__dirname, '../app/signup.html')));
app.get('/signup.html', (req, res) => res.sendFile(path.resolve(__dirname, '../app/signup.html')));

app.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type','application/json');
  res.send(fs.readFileSync(path.resolve(__dirname, './openapi.json'), 'utf8'));
});

// Enhanced health endpoint with Firebase status
app.get('/health', async (req, res) => {
  const services = {
    gpt: process.env.USE_GPT && process.env.OPENAI_API_KEY ? 'operational' : 'disabled',
    weather: process.env.OPENWEATHER_API_KEY ? 'operational' : 'disabled',
    menu_manager: 'operational',
    firebase: 'checking'
  };
  
  // Check Firebase connection
  try {
    if (adminDb) {
      // Simple Firebase connectivity test
      await adminDb.collection('restaurants').limit(1).get();
      services.firebase = 'operational';
    } else {
      services.firebase = 'unavailable';
    }
  } catch (error) {
    services.firebase = 'degraded';
    console.error('Firebase health check failed:', error.message);
  }
  
  const headers = req.headers;
  const origin = headers.origin || 'none';
  const userAgent = headers['user-agent'] || 'unknown';
  
  // Determine overall status
  let overallStatus = 'healthy';
  if (services.firebase === 'unavailable' || services.firebase === 'degraded') {
    overallStatus = 'degraded';
  }
  if (!services.gpt || services.menu_manager !== 'operational') {
    overallStatus = 'degraded';
  }
  
  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: '4.0.0-firebase',
    services,
    request_info: {
      origin: origin,
      is_mobile: userAgent.toLowerCase().includes('mobile'),
      is_capacitor: origin.startsWith('capacitor://'),
      user_agent: userAgent.substring(0, 100)
    },
    cors_status: 'enabled_permissive',
    firebase_project: adminDb ? 'vfiedv3' : 'not_configured'
  });
});

// Firebase-enhanced endpoints
app.get('/v1/admin/summary', async (req, res) => {
  try {
    const localStats = menuManager.getStats();
    let firebaseStats = null;
    
    if (adminDb) {
      try {
        const restaurantsSnapshot = await adminDb.collection('restaurants').get();
        const menuItemsSnapshot = await adminDb.collection('menu_items').get();
        const eventsSnapshot = await adminDb.collection('events').get();
        
        firebaseStats = {
          total_restaurants: restaurantsSnapshot.size,
          total_menu_items: menuItemsSnapshot.size,
          total_events: eventsSnapshot.size,
          pending_events: 0
        };
        
        // Count pending events
        eventsSnapshot.forEach((doc) => {
          const event = doc.data();
          if (event.moderation?.status === 'pending') {
            firebaseStats.pending_events++;
          }
        });
      } catch (error) {
        console.error('Firebase stats error:', error);
      }
    }
    
    res.json({
      vendor_id: 'vfied_system',
      menu_items: firebaseStats ? firebaseStats.total_menu_items : localStats.total_items,
      restaurants: firebaseStats ? firebaseStats.total_restaurants : localStats.total_restaurants,
      menu_version: '4.0_firebase_hybrid',
      data_sources: {
        firebase_enabled: Boolean(adminDb),
        firebase_stats: firebaseStats,
        local_stats: localStats
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Enhanced restaurant menu endpoint with Firebase integration
app.post('/v1/restaurant/menu', async (req, res) => {
  try {
    const {
      restaurant_name,
      location,
      menu_items,
      delivery_platforms,
      opening_hours,
      metadata,
      data_source = 'hybrid'
    } = req.body;

    // Validate required fields
    if (!restaurant_name || !location || !location.city || !location.country_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: restaurant_name, location.city, location.country_code'
      });
    }

    // Generate restaurant ID if not provided
    const restaurant_id = req.body.restaurant_id || 
      `${restaurant_name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const restaurantData = {
      restaurant_id,
      restaurant_name,
      location,
      menu_items: menu_items || [],
      delivery_platforms: delivery_platforms || {},
      opening_hours: opening_hours || {},
      metadata: {
        ...metadata,
        api_source: data_source,
        created_via: 'api'
      }
    };

    let results = [];

    // Try Firebase first if available and requested
    if (adminDb && (data_source === 'firebase' || data_source === 'hybrid')) {
      try {
        const batch = adminDb.batch();
        
        // Create restaurant document
        const restaurantRef = adminDb.collection('restaurants').doc(restaurant_id);
        batch.set(restaurantRef, {
          ...restaurantData,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Create menu items
        if (menu_items && menu_items.length > 0) {
          for (const item of menu_items) {
            const itemRef = adminDb.collection('menu_items').doc();
            batch.set(itemRef, {
              ...item,
              menu_item_id: itemRef.id,
              restaurant_id: restaurant_id,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
        }

        await batch.commit();
        results.push('firebase');
        console.log(`Firebase: Added restaurant ${restaurant_name} with ${menu_items?.length || 0} items`);
      } catch (error) {
        console.error('Firebase add failed:', error);
        if (data_source === 'firebase') {
          return res.status(500).json({
            success: false,
            error: 'Firebase operation failed: ' + error.message
          });
        }
      }
    }

    // Add to local storage if hybrid mode or Firebase failed
    if (data_source === 'local' || data_source === 'hybrid') {
      try {
        await menuManager.addRestaurantMenu(restaurantData);
        results.push('local');
        console.log(`Local: Added restaurant ${restaurant_name}`);
      } catch (error) {
        console.error('Local storage failed:', error);
        if (results.length === 0) {
          return res.status(500).json({
            success: false,
            error: 'Both Firebase and local storage failed'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Restaurant ${restaurant_name} added successfully`,
      restaurant_id: restaurant_id,
      items_added: menu_items?.length || 0,
      data_sources: results
    });

  } catch (error) {
    console.error('Restaurant menu add error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add restaurant menu'
    });
  }
});

// Enhanced menu listing with Firebase integration
app.get('/v1/menus', async (req, res) => {
  try {
    const { 
      limit = 50, 
      data_source = 'hybrid',
      restaurant_id 
    } = req.query;

    let menuItems = [];

    // Get from Firebase if available
    if (adminDb && (data_source === 'firebase' || data_source === 'hybrid')) {
      try {
        let query = adminDb.collection('menu_items');
        
        if (restaurant_id) {
          query = query.where('restaurant_id', '==', restaurant_id);
        }
        
        query = query.limit(parseInt(limit));
        const snapshot = await query.get();
        
        for (const doc of snapshot.docs) {
          const item = { id: doc.id, ...doc.data(), data_source: 'firebase' };
          
          // Get restaurant info
          if (item.restaurant_id) {
            try {
              const restaurantDoc = await adminDb.collection('restaurants').doc(item.restaurant_id).get();
              if (restaurantDoc.exists) {
                const restaurantData = restaurantDoc.data();
                item.restaurant_name = restaurantData.restaurant_name || restaurantData.basic_info?.name;
              }
            } catch (error) {
              console.error('Error fetching restaurant data:', error);
            }
          }
          
          menuItems.push(item);
        }
      } catch (error) {
        console.error('Firebase menu fetch failed:', error);
      }
    }

    // Get from local storage if needed
    if ((data_source === 'local' || data_source === 'hybrid') && 
        (menuItems.length === 0 || data_source === 'local')) {
      try {
        const localItems = menuManager.getAllMenuItems();
        const localItemsWithSource = localItems.map(item => ({
          ...item,
          data_source: 'local'
        }));
        
        if (data_source === 'local') {
          menuItems = localItemsWithSource.slice(0, parseInt(limit));
        } else {
          // Hybrid mode - add local items if we have space
          const remaining = parseInt(limit) - menuItems.length;
          if (remaining > 0) {
            menuItems = menuItems.concat(localItemsWithSource.slice(0, remaining));
          }
        }
      } catch (error) {
        console.error('Local menu fetch failed:', error);
      }
    }

    res.json({
      success: true,
      items: menuItems,
      total_found: menuItems.length,
      data_source_used: data_source,
      firebase_available: Boolean(adminDb)
    });

  } catch (error) {
    console.error('Menu listing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu items'
    });
  }
});

// Debug endpoint for mobile troubleshooting
app.get('/v1/debug/mobile', (req, res) => {
  const headers = req.headers;
  res.json({
    success: true,
    debug_info: {
      origin: headers.origin || 'none',
      user_agent: headers['user-agent'] || 'unknown',
      referer: headers.referer || 'none',
      host: headers.host || 'unknown',
      x_forwarded_for: headers['x-forwarded-for'] || 'none',
      all_headers: headers
    },
    server_time: new Date().toISOString(),
    firebase_status: adminDb ? 'available' : 'unavailable',
    message: 'Mobile debug endpoint working'
  });
});

app.get('/support', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>VFIED Support</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .contact { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>VFIED Support</h1>
      <p>Need help with VFIED? We're here to assist you.</p>
      
      <div class="contact">
        <h3>Contact Information</h3>
        <p><strong>Email:</strong> support@vfied.io</p>
        <p><strong>Response Time:</strong> Within 24 hours</p>
      </div>
      
      <h3>Common Questions</h3>
      <p><strong>How do I change my location?</strong><br>
      Tap "Change" next to your current location at the top of the app.</p>
      
      <p><strong>Why aren't I getting recommendations?</strong><br>
      Check your internet connection and ensure location services are enabled.</p>
      
      <p><strong>Can I suggest a restaurant?</strong><br>
      Yes! Email us with restaurant details and we'll consider adding it.</p>
    </body>
    </html>
  `);
});

// Setup route modules
setupEventsRoutes(app, upload);
setupTravelRoutes(app);
setupUtilityRoutes(app);
setupRestaurantRoutes(app);
setupFoodRoutes(app, upload);

// Enhanced error handler with mobile-specific logging
app.use((err, req, res, _next) => {
  const origin = req.headers.origin || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  console.error('Server error:', {
    error: err.message,
    origin: origin,
    is_mobile: userAgent.toLowerCase().includes('mobile'),
    is_capacitor: origin.startsWith('capacitor://'),
    stack: err.stack
  });
  
  res.status(500).json({ 
    success: false,
    error: 'Internal server error', 
    message: err.message,
    debug: {
      origin: origin,
      timestamp: new Date().toISOString()
    }
  });
});

// Force reload sample data if database is empty
setTimeout(async () => {
  const stats = menuManager.getStats();
  console.log(`📊 Startup check: ${stats.total_restaurants} restaurants, ${stats.total_items} items`);
  
  if (stats.total_restaurants === 0) {
    console.log('🔄 Database empty on startup, loading samples...');
    const { addSampleRestaurants } = await import('./menu_manager.js');
    await addSampleRestaurants();
    console.log('✅ Sample data loaded');
  }
}, 3000);

// Start server
app.listen(PORT, () => {
  console.log(`🌦️ VFIED Complete API Server running on port ${PORT}`);
  console.log(`📖 OpenAPI docs available at http://localhost:${PORT}/openapi.json`);
  console.log(`🔧 Features: ${process.env.USE_GPT && process.env.OPENAI_API_KEY ? '✅ GPT' : '❌ GPT'} | ${process.env.OPENWEATHER_API_KEY ? '✅ Weather' : '❌ Weather'} | ${adminDb ? '✅ Firebase' : '❌ Firebase'}`);
  console.log(`📱 CORS: Enabled for mobile apps (Capacitor/Ionic)`);
  console.log(`🔍 Debug endpoint: /v1/debug/mobile`);
  console.log(`🔥 Firebase: ${adminDb ? 'Connected to vfiedv3' : 'Not configured'}`);
});

export default app;