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

// Import route modules
import { setupFoodRoutes } from './routes/food.js';
import { setupEventsRoutes } from './routes/events.js';
import { setupTravelRoutes } from './routes/travel.js';
import { setupUtilityRoutes } from './routes/utility.js';
import { setupRestaurantRoutes } from './routes/restaurants.js';
// Environment variables
const PORT =  process.env.PORT || process.env.MCP_PORT || 3048;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../data');
fs.promises.mkdir(dataDir, { recursive: true }).catch(console.error);
const app = express();

// Middleware
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5168',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3049', 
    'http://localhost:3922',
    /^http:\/\/10\.\d+\.\d+\.\d+:5168$/,
    /^http:\/\/192\.168\.\d+\.\d+:5168$/,
    'https://vfied.vercel.app',
    'https://vfied-v3.vercel.app',
    'https://vfied-v3-frontend.onrender.com',
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
        "https://*.vercel.app",
        "https://*.onrender.com",
        "https://vfied-v3.onrender.com"
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
// app.use('/src', express.static(path.resolve(__dirname, '../src')));
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

// Health endpoint
app.get('/health', async (req, res) => {
  const services = {
    gpt: process.env.USE_GPT && process.env.OPENAI_API_KEY ? 'on' : 'off',
    weather: process.env.OPENWEATHER_API_KEY ? 'on' : 'off',
    menu_manager: 'on'
  };
  
  res.json({
    status: services.gpt === 'on' ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '2.3.0',
    services
  });
});

// Setup route modules

setupEventsRoutes(app, upload);
setupTravelRoutes(app);
setupUtilityRoutes(app);
setupRestaurantRoutes(app);
setupFoodRoutes(app, upload);

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌦️ VFIED Complete API Server running on port ${PORT}`);
  console.log(`📖 OpenAPI docs available at http://localhost:${PORT}/openapi.json`);
  console.log(`🔧 Features: ${process.env.USE_GPT && process.env.OPENAI_API_KEY ? '✅ GPT' : '❌ GPT'} | ${process.env.OPENWEATHER_API_KEY ? '✅ Weather' : '❌ Weather'}`);
});

export default app;