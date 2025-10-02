// app.js - Main entry point

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
        "https://vfied-v4-clean.onrender.com"
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

// Health endpoint with enhanced mobile diagnostics
app.get('/health', async (req, res) => {
  const services = {
    gpt: process.env.USE_GPT && process.env.OPENAI_API_KEY ? 'on' : 'off',
    weather: process.env.OPENWEATHER_API_KEY ? 'on' : 'off',
    menu_manager: 'on'
  };
  
  const headers = req.headers;
  const origin = headers.origin || 'none';
  const userAgent = headers['user-agent'] || 'unknown';
  
  res.json({
    status: services.gpt === 'on' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.3.0',
    services,
    request_info: {
      origin: origin,
      is_mobile: userAgent.toLowerCase().includes('mobile'),
      is_capacitor: origin.startsWith('capacitor://'),
      user_agent: userAgent.substring(0, 100)
    },
    cors_status: 'enabled_permissive'
  });
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
    message: 'Mobile debug endpoint working'
  });
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
  console.log(`🔧 Features: ${process.env.USE_GPT && process.env.OPENAI_API_KEY ? '✅ GPT' : '❌ GPT'} | ${process.env.OPENWEATHER_API_KEY ? '✅ Weather' : '❌ Weather'}`);
  console.log(`📱 CORS: Enabled for mobile apps (Capacitor/Ionic)`);
  console.log(`🔍 Debug endpoint: /v1/debug/mobile`);
});

export default app;