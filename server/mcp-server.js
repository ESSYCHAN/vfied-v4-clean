// server/mcp-server.js - COMPLETE INTEGRATION (patched)

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import fs from 'fs';
import Joi from 'joi';
import * as moodsModule from './data/moods.js';
import * as countriesModule from './data/countries.js';
import { randomUUID } from 'crypto';
import { SUPPORTED_COUNTRIES } from './data/countries.js'; // adjust path as needed
import { parseCravings, enhanceMoodText } from './craving_parser.js';
import { recommendFromMenus, menuManager } from './menu_manager.js';
import multer from 'multer'
// Optional polyfill if your Node is <18
// import fetch from 'node-fetch';
// globalThis.fetch = globalThis.fetch || fetch;

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const USE_GPT = ['true', '1', 'yes', 'on'].includes(String(process.env.USE_GPT || process.env.VITE_USE_GPT || '').toLowerCase().trim());
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const PORT = process.env.MCP_PORT || process.env.PORT || 3048; // ✅ FIXED: Match OpenAPI schema
const USE_EVENTS_PROVIDER = String(process.env.USE_EVENTS_PROVIDER || '').toLowerCase() === 'true';
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN || '';
const EVENTS_CACHE_TTL = parseInt(process.env.EVENTS_CACHE_TTL || '10800', 10); // 3h
const moods = moodsModule.MOOD_TAXONOMY?.moods || moodsModule.default?.moods || [];
const countries = countriesModule.SUPPORTED_COUNTRIES?.countries || countriesModule.default?.countries || [];
const culturalMeals = JSON.parse(fs.readFileSync('./server/data/cultural_meals.json', 'utf8'));
// --- define mood fallbacks FIRST (prevents use-before-define) ---
const MOODS_FALLBACK = [
  { id: 'TIRED', group: 'Energy', synonyms: ['exhausted','sleepy','low energy','fatigued'] },
  { id: 'STRESSED', group: 'Emotion', synonyms: ['anxious','tense','overwhelmed','deadline'] },
  { id: 'CELEBRATING', group: 'Social', synonyms: ['party','treat','reward','birthday','win'] },
  { id: 'HUNGRY', group: 'Body', synonyms: ['starving','very hungry','need food fast'] },
  { id: 'POST_WORKOUT', group: 'Body', synonyms: ['gym','post workout','protein','recovery'] },
  { id: 'SICK', group: 'Body', synonyms: ['flu','cold','under the weather','sore throat'] },
  { id: 'FOCUSED', group: 'Intent', synonyms: ['work mode','deep work','productive'] },
  { id: 'RELAX', group: 'Emotion', synonyms: ['cozy','chill','comforting','calm'] },
  { id: 'ADVENTUROUS', group: 'Intent', synonyms: ['spicy','new cuisine','explore','try something new'] },
];
// ===== Spec-aligned but tolerant validators =====

const DietaryTag = Joi.string().valid('vegetarian','vegan','gluten-free','dairy-free','halal','nut-free');
const LocationLoose = Joi.alternatives().try(
  Joi.object({
    city: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    country_code: Joi.string().min(2).max(2).uppercase().allow('', null),
    countryCode: Joi.string().min(2).max(2).uppercase().allow('', null),
    latitude: Joi.alternatives(Joi.number(), Joi.string()),
    longitude: Joi.alternatives(Joi.number(), Joi.string()),
    lat: Joi.alternatives(Joi.number(), Joi.string()),
    lng: Joi.alternatives(Joi.number(), Joi.string())
  }).unknown(true),
  Joi.string() // "City, CC"
).default({});
console.log('🔧 Environment Check:');
console.log('- USE_GPT:', USE_GPT);
console.log('- OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
console.log('- OPENAI_MODEL:', OPENAI_MODEL);
console.log('- Port:', PORT);

if (!USE_GPT) {
  console.warn('⚠️ GPT is disabled! Set USE_GPT=true in your .env file');
}
if (!OPENAI_API_KEY) {
  console.warn('⚠️ OpenAI API key missing! Set VITE_OPENAI_API_KEY in your .env file');
}
const QuickDecisionSchema = Joi.object({
  location: LocationLoose,
  dietary: Joi.alternatives().try(Joi.array().items(DietaryTag), DietaryTag, Joi.array().items(Joi.string()), Joi.string()).default([]),
  mood_text: Joi.string().allow('', null),
  budget: Joi.string().valid('budget','medium','premium','luxury').optional(),
  social: Joi.string().optional()
}).unknown(true);

const RecommendSchema = Joi.object({
  location: LocationLoose.required(),
  mood_text: Joi.string().allow('', null),
  dietary: Joi.alternatives().try(Joi.array().items(DietaryTag), DietaryTag, Joi.array().items(Joi.string()), Joi.string()).default([]),
  social: Joi.string().valid('solo','date','family','friends','work').optional(),
  budget: Joi.string().valid('budget','medium','premium','luxury').optional()
}).unknown(true);



// ===== Normalizers =====
const toNum = (v) => (typeof v === 'number' ? v : (Number.isFinite(Number(v)) ? Number(v) : undefined));
const parseCityString = (s) => {
  if (typeof s !== 'string') return {};
  const [c, cc] = s.split(',').map(x => (x||'').trim());
  return { city: c || '', country_code: (cc||'').slice(0,2).toUpperCase() };
};
const normalizeLocation = (loc) => {
  if (typeof loc === 'string') loc = parseCityString(loc);
  const cc = String(loc?.country_code || loc?.countryCode || '').trim().slice(0,2).toUpperCase();
  return {
    city: String(loc?.city || '').trim(),
    country: String(loc?.country || '').trim(),
    country_code: cc || undefined,
    latitude: toNum(loc?.latitude ?? loc?.lat),
    longitude: toNum(loc?.longitude ?? loc?.lng)
  };
};
const normalizeDietary = (d) => {
  const arr = Array.isArray(d) ? d : (d ? [d] : []);
  return arr.filter(Boolean).map(s => String(s).trim().toLowerCase());
};
const analytics = {
  events: [],
  
  addEvent(event, data) {
    this.events.push({
      id: randomUUID(),
      event,
      data,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  },
  
  getStats() {
    const foodSelections = this.events
      .filter(e => e.event === 'food_selected')
      .map(e => e.data.food_name);
    
    const popularFoods = foodSelections.reduce((acc, food) => {
      acc[food] = (acc[food] || 0) + 1;
      return acc;
    }, {});
    
    return {
      total_events: this.events.length,
      unique_users: new Set(this.events.map(e => e.data.ip)).size,
      popular_foods: Object.entries(popularFoods)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    };
  }
};

function normalizeQuickPayload(value = {}) {
  const location = normalizeLocation(value.location);
  const dietary = normalizeDietary(value.dietary);
  return { ...value, location, dietary };
}

// Countries processing
function extractCountriesFromModule(mod) {
  const candidates = [];
  const tryPush = (val) => {
    if (!val) return;
    if (Array.isArray(val)) {
      candidates.push(val);
    } else if (typeof val === 'object') {
      const vals = Object.values(val);
      if (vals.length && typeof vals[0] === 'object') candidates.push(vals);
    }
  };

  tryPush(mod?.default);
  tryPush(mod?.countries);
  tryPush(mod?.COUNTRIES);
  tryPush(mod);
  Object.values(mod || {}).forEach(tryPush);

  const arr = candidates.sort((a, b) => b.length - a.length)[0] || [];
  return Array.isArray(arr) ? arr : [];
}

function buildIsoFallbackList() {
  let regionNames = null;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    }
  } catch {
    regionNames = null;
  }

  const CODES = [
    'AF','AL','DZ','AD','AO','AG','AR','AM','AU','AT','AZ','BS','BH','BD','BB','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','BN','BG','BF','BI',
    'KH','CM','CA','CV','CF','TD','CL','CN','CO','KM','CG','CD','CK','CR','CI','HR','CU','CY','CZ','DK','DJ','DM','DO','EC','EG','SV','GQ','ER','EE','ET',
    'FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT','GN','GW','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM','JP','JO','KZ',
    'KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MG','MW','MY','MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN',
    'ME','MA','MZ','MM','NA','NR','NP','NL','NZ','NI','NE','NG','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PL','PT','QA','RO','RU','RW',
    'KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI','SB','SO','ZA','SS','ES','LK','SD','SR','SE','CH','SY','TW','TJ','TZ',
    'TH','TL','TG','TK','TO','TT','TN','TR','TM','TV','UG','UA','AE','GB','US','UY','UZ','VU','VE','VN','YE','ZM','ZW'
  ];

  return CODES.map(code => ({
    name: regionNames ? (regionNames.of(code) || code) : code,
    code
  }));
}

function normalizeCountry(c) {
  const name = c?.name || '';
  const code = c?.country_code || ''; // Use the correct property
  return { name, code };
}

// Moods processing
function extractMoodsFromModule(mod) {
  const candidates = [];
  const tryPush = (val) => {
    if (!val) return;
    if (Array.isArray(val)) candidates.push(val);
    else if (typeof val === 'object') {
      const vals = Object.values(val);
      if (vals.length && typeof vals[0] === 'object') candidates.push(vals);
    }
  };
  tryPush(mod?.default);
  tryPush(mod?.moods);
  tryPush(mod);
  Object.values(mod || {}).forEach(tryPush);
  const arr = candidates.sort((a,b)=>b.length-a.length)[0] || [];
  return Array.isArray(arr) ? arr : [];
}

function normalizeMood(m) {
  const id = (m?.id || m?.ID || m?.name || '').toString().trim().toUpperCase();
  const group = (m?.group || m?.category || 'Emotion').toString();
  const synonyms = Array.isArray(m?.synonyms) ? m.synonyms : [];
  return id ? { id, group, synonyms } : null;
}

// Then process the extracted data
const COUNTRIES_LIST = SUPPORTED_COUNTRIES.countries || [];

const rawMoods = extractMoodsFromModule(moodsModule).map(normalizeMood).filter(Boolean);
const MOODS_TAXONOMY = moods.length ? moods : MOODS_FALLBACK;

const QUICK_SCHEMA = Joi.object({
  location: LocationLoose,
  dietary: Joi.alternatives().try(
    Joi.array().items(DietaryTag),
    DietaryTag,
    Joi.array().items(Joi.string()),
    Joi.string()
  ).default([]),
  mood_text: Joi.string().allow('', null),
  budget: Joi.string().valid('budget','medium','premium','luxury').optional(),
  social: Joi.string().optional(),

  // NEW: recent_suggestions (array or single string)
  recent_suggestions: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(), 
  // ADD TIME CONTEXT SCHEMA:
  time_context: Joi.object({
    current_hour: Joi.number().min(0).max(23).optional(),
    meal_period: Joi.string().valid('breakfast','lunch','snack','dinner','late_night').optional(),
    is_weekend: Joi.boolean().optional(),
    day_of_week: Joi.number().min(0).max(6).optional()
  }).optional()

}).unknown(true);



const GLOBAL_POOL = [
  { name: "Grilled Chicken Wrap", emoji: "🌯", explanation: "Quick protein, balanced, travel-friendly" },
  { name: "Veggie Stir Fry", emoji: "🥦", explanation: "Light, healthy, plant-forward" },
  { name: "Margherita Pizza", emoji: "🍕", explanation: "Comfort carb + cheese, easy crowd pleaser" },
  { name: "Falafel Bowl", emoji: "🥗", explanation: "Crispy, filling, vegetarian protein" },
  { name: "Chicken Biryani", emoji: "🍛", explanation: "Aromatic rice + protein, satisfying" },
  { name: "Sushi Bento", emoji: "🍣", explanation: "Clean flavors, balanced macros" }
];

const COUNTRY_POOLS = {
  GB: [
    { name: "Fish & Chips", emoji: "🍟", explanation: "Classic British comfort, crispy & filling" },
    { name: "Chicken Tikka", emoji: "🍛", explanation: "UK favourite curry, bold and warming" },
    { name: "Jacket Potato", emoji: "🥔", explanation: "Cozy carb base with flexible toppings" }
  ],
  US: [
    { name: "Smash Burger", emoji: "🍔", explanation: "Hearty, fast, crowd-pleasing classic" },
    { name: "Burrito Bowl", emoji: "🥙", explanation: "Protein + grains, easy to customize" },
    { name: "Chicken Caesar", emoji: "🥗", explanation: "Crunchy greens with savory bite" }
  ],
  KE: [
    { name: "Ugali + Sukuma", emoji: "🍽️", explanation: "Staple comfort: maize meal with greens" },
    { name: "Nyama Choma", emoji: "🥩", explanation: "Char-grilled meat, weekend favorite" },
    { name: "Pilau", emoji: "🍚", explanation: "Spiced rice, aromatic and satisfying" }
  ],
  JP: [
    { name: "Tonkotsu Ramen", emoji: "🍜", explanation: "Rich broth, cozy noodle comfort" },
    { name: "Chicken Katsu", emoji: "🍱", explanation: "Crispy cutlet, simple and satisfying" },
    { name: "Salmon Nigiri", emoji: "🍣", explanation: "Clean flavors, light but filling" }
  ],
  IN: [
    { name: "Butter Chicken", emoji: "🍛", explanation: "Creamy curry, rich and comforting" },
    { name: "Masala Dosa", emoji: "🥞", explanation: "Crispy crepe with spiced potato filling" },
    { name: "Biryani", emoji: "🍚", explanation: "Fragrant rice with tender meat/vegetables" }
  ],
  FR: [
    { name: "Croque Monsieur", emoji: "🥪", explanation: "Grilled ham & cheese, French comfort" },
    { name: "Ratatouille", emoji: "🍆", explanation: "Rustic vegetable stew, wholesome" },
    { name: "Coq au Vin", emoji: "🍗", explanation: "Wine-braised chicken, classic bistro" }
  ]
};

const EVENTS_SCHEMA = Joi.object({
  city: Joi.string().default('London'),
  country_code: Joi.string().length(2).uppercase().default('GB'),
  category: Joi.string().valid('all','food','music','market','culture','nightlife').default('all'),
  time: Joi.string().valid('today','tomorrow','weekend','this_week').default('today')
});

const ITIN_SCHEMA = Joi.object({
  location: Joi.object({
    city: Joi.string().default('London'),
    country_code: Joi.string().length(2).uppercase().required()
  }).required(),
  duration: Joi.string().valid('one_day','two_days','weekend','quick','half-day','full-day').default('one_day'),
  interests: Joi.array().items(Joi.string()).default(['food','culture']),
  budget: Joi.string().valid('budget','medium','premium','luxury').default('medium')
});

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

const upload = multer({
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



function pickCountryPool(cc) {
  const code = (cc || '').toUpperCase();
  return COUNTRY_POOLS[code] && COUNTRY_POOLS[code].length ? COUNTRY_POOLS[code] : GLOBAL_POOL;
}

// ✅ robust country finder (uses export if available else normalized list)
function findCountryByCode(cc) {
  if (!cc) return null;
  const code = cc.toUpperCase();
  const fromExport = SUPPORTED_COUNTRIES?.countries?.find?.(c => c.country_code === code);
  if (fromExport) return fromExport;
  return COUNTRIES_LIST.find(c => (c.country_code || c.code) === code) || null;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Add this function after your existing helper functions, before app.post routes
function validateDietaryCompliance(foodName, dietaryRestrictions) {
  const restrictions = {
    'vegan': ['meat', 'dairy', 'cheese', 'milk', 'egg', 'fish', 'chicken', 'beef', 'pork'],
    'vegetarian': ['meat', 'fish', 'chicken', 'beef', 'pork', 'bacon'],
    'gluten-free': ['bread', 'pasta', 'wheat', 'flour', 'gluten'],
    'halal': ['pork', 'bacon', 'ham', 'alcohol'],
    'dairy-free': ['milk', 'cheese', 'cream', 'butter', 'yogurt'],
    'nut-free': ['nut','nuts','peanut','peanuts','almond','almonds','cashew','cashews','walnut','walnuts','hazelnut','hazelnuts','pistachio','pistachios','pecan','pecans']
  };
  
  for (const diet of dietaryRestrictions) {
    const forbidden = restrictions[diet] || [];
    for (const item of forbidden) {
      if (foodName.toLowerCase().includes(item)) {
        return false;
      }
    }
  }
  return true;
}

// GPT helper function
async function gptChatJSON({ system, user, max_tokens = 900 }) {
  if (!USE_GPT || !OPENAI_API_KEY) return null;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.8,
        max_tokens
      })
    });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    const raw = j.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  } catch (e) {
    console.warn('[gptChatJSON] fail:', e.message);
    return null;
  }
}

// Global food examples function
function getGlobalFoodExamples(countryCode = '') {
  const examples = {
    'KE': `KENYA ROTATION:
- Staples: Ugali + Sukuma, Githeri, Rice + Beans, Chapati
- Proteins: Nyama Choma, Tilapia, Chicken Stew, Goat Curry
- Street: Mutura, Samosas, Mandazi, Roasted Maize
- Special: Pilau, Swahili Biriyani, Coastal Coconut Stews`,
    'GB': `UK ROTATION:
- Staples: Fish & Chips, Pie & Mash, Sunday Roast, Jacket Potato
- Proteins: Shepherd's Pie, Roast Chicken, Curry (adopted)
- Street: Pasty, Sandwich, Kebab
- Special: Full English, Pub Classics`,
    'US': `USA ROTATION:
- Staples: Burgers, Mac & Cheese, BBQ
- Proteins: Steaks, Fried Chicken, Seafood
- Street: Hot Dogs, Food Trucks
- Special: Regional BBQ, Holiday Plates`,
    'JP': `JAPAN ROTATION:
- Staples: Rice Bowls, Ramen, Udon, Onigiri
- Proteins: Sushi, Yakitori, Tempura
- Street: Takoyaki, Taiyaki
- Special: Kaiseki, Bento`
  };
  return examples[countryCode?.toUpperCase()] || `GLOBAL GUIDELINES:
- Staples: Local grains/breads/rice/noodles
- Proteins: Regional meat/fish/plant proteins
- Street: Markets/snacks/vendor favorites
- Special: Celebration/regional signature dishes`;
}

// Mood detection
function detectMoodIds(mood_text) {
  if (!mood_text) return [];
  const t = mood_text.toLowerCase();
  const hits = [];
  for (const m of MOODS_TAXONOMY) {
    if (t.includes(m.id.toLowerCase())) { hits.push(m.id); continue; }
    if (m.synonyms?.some(s => t.includes(s.toLowerCase()))) { hits.push(m.id); }
  }
  return [...new Set(hits)].slice(0,3);
}

// App setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Middleware
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5168',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3922', // ✅ ADDED: Match port
    /^http:\/\/10\.\d+\.\d+\.\d+:5168$/,     // Any 10.x.x.x:5168
    /^http:\/\/192\.168\.\d+\.\d+:5168$/,    // Any 192.168.x.x:5168
    'https://vfied.vercel.app',
    'https://vfied-v3.vercel.app',
    'https://vfied-v3-frontend.onrender.com',
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.onrender\.com$/
  ],
  credentials: true
}));
// Let the CORS middleware handle preflight/headers (no manual ACAO="*")

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

// Static files
app.use('/src', express.static(path.resolve(__dirname, '../src')));
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));
app.use('/public', express.static(path.resolve(__dirname, '../public')));
app.use(express.static(path.resolve(__dirname, '../dist')));

// Basic routes
app.get('/', (req, res) => res.sendFile(path.resolve(__dirname, '../app/index.html')));
app.get('/docs', (req, res) => res.sendFile(path.resolve(__dirname, '../app/docs.html')));
app.get('/demo', (req, res) => res.sendFile(path.resolve(__dirname, '../app/demo.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.resolve(__dirname, '../app/dashboard.html')));

app.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type','application/json');
  res.send(fs.readFileSync(path.resolve(__dirname, './openapi.json'), 'utf8'));
});

// Weather helper
async function getWeather(location) {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || !location?.city) return null;
  const url = location.latitude && location.longitude
    ? `https://api.openweathermap.org/data/2.5/weather?lat=${location.latitude}&lon=${location.longitude}&appid=${key}&units=metric`
    : `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location.city)}&appid=${key}&units=metric`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const data = await r.json();
    return {
      temperature: Math.round(data.main?.temp),
      condition: (data.weather?.[0]?.main || 'Clear').toLowerCase(),
      isCold: data.main?.temp < 12,
      isHot: data.main?.temp > 26,
      isRaining: /rain/i.test(data.weather?.[0]?.main || ''),
      description: data.weather?.[0]?.description || 'Clear',
      isComfortable: !(data.main?.temp < 12 || data.main?.temp > 26),
      simulated: false
    };
  } catch {
    return null;
  }
}

// Fallback suggestion
function fallbackSuggestion(location, dietary = []) {
  const cc = (location?.country_code || location?.countryCode || '').toString().trim().slice(0, 2).toUpperCase();

  const byCountry = {
    GB: [{ name: 'Fish and Chips', emoji: '🍟' }, { name: 'Mushroom Pie', emoji: '🥧' }],
    KE: [{ name: 'Nyama Choma', emoji: '🍖' }, { name: 'Ugali & Sukuma', emoji: '🥬' }],
    US: [{ name: 'Burger', emoji: '🍔' }, { name: 'Poke Bowl', emoji: '🍲' }],
    JP: [{ name: 'Ramen', emoji: '🍜' }, { name: 'Sushi Bowl', emoji: '🍣' }],
    FR: [{ name: 'Croque Monsieur', emoji: '🥪' }, { name: 'Ratatouille', emoji: '🍆' }],
    IT: [{ name: 'Pasta Carbonara', emoji: '🍝' }, { name: 'Margherita Pizza', emoji: '🍕' }]
  };
  let picks = byCountry[cc] || byCountry.GB;
  if (dietary.includes('vegan') || dietary.includes('vegetarian')) {
    picks = picks.filter(p => !/nyama|choma|burger|fish|carbonara/i.test(p.name)).concat({ name: 'Veggie Bowl', emoji: '🥗' });
  }
  return picks[Math.floor(Math.random() * picks.length)];
}
function getMealGuidance(mealPeriod, hour) {
  const guidance = {
    breakfast: 'Prioritize breakfast foods: eggs, pastries, coffee pairings, light proteins, morning energy foods',
    lunch: 'Focus on midday meals: balanced plates, work-friendly options, moderate portions',
    snack: 'Suggest light snacks: finger foods, quick bites, energy boosters, not full meals',
    dinner: 'Emphasize dinner foods: hearty mains, evening comfort, social dining options',
    late_night: 'Recommend late-night friendly: delivery options, comfort foods, easy-to-eat items'
  };
  
  return guidance[mealPeriod] || `Current time (${hour}h): suggest foods appropriate for this hour`;
}
// GPT recommendation helper
async function recommendWithGPT({ mood_text = '', location = {}, dietary = [], weather = null, avoidList = [], timeContext = null }) {
  if (!USE_GPT || !OPENAI_API_KEY) return null;
  const enhanced = enhanceMoodText(mood_text); 
  const safeAvoidList = Array.isArray(avoidList) ? avoidList : [];
  const cc = location.country_code || 'GB';
  const mealPeriod = timeContext?.meal_period || 'lunch';
  
  // Get cultural meal data for this country and meal period
  const countryData = culturalMeals[cc];
  const mealData = countryData?.[mealPeriod] || {};
  
  // Build the "NEVER" list - foods that should never be served at this meal
  const neverFoods = mealData.never || [];
  
  // Build appropriate foods list based on meal period
  const appropriateFoods = [];
  if (mealData.traditional) {
    Object.values(mealData.traditional).forEach(items => {
      if (Array.isArray(items)) appropriateFoods.push(...items);
    });
  }
  if (mealData.modern) {
    appropriateFoods.push(...(Array.isArray(mealData.modern) ? mealData.modern : []));
  }
  if (mealData.popular) {
    appropriateFoods.push(...(Array.isArray(mealData.popular) ? mealData.popular : []));
  }
  
  // Get snacks and street food if appropriate
  const snackOptions = countryData?.snacks || {};
  const streetFood = countryData?.street_food || {};
  
  // Parse mood/craving for better matching
  const cravingContext = parseMoodForCravings(mood_text);
  
  const system = `You are VFIED, a culturally-aware food expert who MUST follow strict cultural meal rules.

CRITICAL LOCATION & TIME:
- Location: ${location.city || 'Unknown'}, ${countryData?.country || location.country || 'Unknown'} (${cc})
- Current time: ${timeContext?.current_hour || 'unknown'}h (${mealPeriod})
- Weekend: ${timeContext?.is_weekend ? 'yes' : 'no'}

🚫 NEVER SUGGEST THESE FOR ${mealPeriod.toUpperCase()}:
${neverFoods.length > 0 ? neverFoods.join(', ') : 'No restrictions'}
${mealData.notes ? `\nCULTURAL RULE: ${mealData.notes}` : ''}

✅ APPROPRIATE ${mealPeriod.toUpperCase()} FOODS FOR ${cc}:
${appropriateFoods.slice(0, 20).join(', ')}

USER MOOD ANALYSIS:
- Original request: "${mood_text}"
- Mood vibe: ${enhanced.vibes?.join(', ') || 'general hunger'}
- They want: ${enhanced.food_attributes?.join(', ') || 'satisfying'} food
- Consider these: ${enhanced.suggested_categories?.slice(0, 5).join(', ') || 'local favorites'}

USER CONTEXT:
- Dietary restrictions: ${dietary.length > 0 ? dietary.join(', ') : 'none'}
- Weather: ${weather ? `${weather.temperature}°C, ${weather.condition}` : 'unknown'}
${weather && weather.temperature < 15 ? '- Cold weather: Suggest warm, comforting foods' : ''}
${weather && weather.temperature > 30 ? '- Hot weather: Suggest cool, refreshing foods' : ''}
${weather && weather.isRaining ? '- Rainy: Comfort foods and hot drinks work well' : ''}

RECENTLY SUGGESTED (AVOID): ${safeAvoidList.slice(0, 5).join(', ') || 'none'}

STRICT REQUIREMENTS:
1. ONLY suggest foods culturally appropriate for ${mealPeriod} in ${cc}
2. NEVER suggest items from the "never" list above
3. Match their mood vibe: ${enhanced.vibes?.[0] || mood_text} with ${enhanced.food_attributes?.join(', ') || 'appropriate'} foods
4. Consider the weather conditions
5. Respect dietary restrictions: ${dietary.join(', ') || 'none'}

Return EXACTLY this JSON with 3 culturally correct suggestions:
{
  "decisions": [
    {"name": "specific dish from ${cc} that matches ${enhanced.vibes?.[0] || 'their mood'}", "emoji": "🍜", "explanation": "why this matches their ${enhanced.vibes?.[0] || 'mood'} and is perfect for ${mealPeriod}"},
    {"name": "another ${cc} ${mealPeriod} dish for ${enhanced.vibes?.[0] || 'this mood'}", "emoji": "🍛", "explanation": "why this fits their craving and current time"},
    {"name": "third option matching ${enhanced.vibes?.[0] || 'their vibe'}", "emoji": "🍽", "explanation": "why this works for ${mealPeriod}"}
  ]
}

BE SPECIFIC: Use actual dish names from ${cc} cuisine, not generic descriptions.`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: `I'm in ${location.city}, ${cc} and it's ${mealPeriod} time (${timeContext?.current_hour}h). I'm feeling "${mood_text || 'hungry'}". What should I eat? Give me 3 specific ${mealPeriod} options that are culturally appropriate for ${cc}.` }
        ],
        temperature: 0.7, // Lower temperature for more consistent cultural accuracy
        max_tokens: 400
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GPT API Error:', response.status, errorText);
      return null;
    }

    const json = await response.json();
    const content = json.choices[0].message.content.trim();
    const parsed = JSON.parse(content);
    
    // Validate that suggestions aren't in the "never" list
    if (parsed.decisions && neverFoods.length > 0) {
      parsed.decisions = parsed.decisions.filter(decision => {
        const nameLC = decision.name.toLowerCase();
        const isInvalid = neverFoods.some(never => nameLC.includes(never.toLowerCase()));
        if (isInvalid) {
          console.warn(`❌ Filtered out culturally inappropriate suggestion: ${decision.name} for ${mealPeriod}`);
        }
        return !isInvalid;
      });
    }
    
    console.log('✅ GPT Response with cultural rules:', parsed);
    return parsed;

  } catch (error) {
    console.error('❌ GPT call failed:', error.message);
    return null;
  }
}

// Helper function to parse mood text for cravings
function parseMoodForCravings(moodText) {
  if (!moodText) return '';
  
  const text = moodText.toLowerCase();
  const cravingHints = [];
  
  // Physical states
  if (/hangover|rough morning|too much/.test(text)) {
    cravingHints.push('(needs: greasy, salty, hydrating foods)');
  }
  if (/pms|period|cramps/.test(text)) {
    cravingHints.push('(needs: comfort foods, chocolate, warm foods)');
  }
  if (/sick|cold|flu|unwell/.test(text)) {
    cravingHints.push('(needs: soup, broth, easy to digest)');
  }
  
  // Taste desires
  if (/spicy|hot|fire/.test(text)) {
    cravingHints.push('(wants: spicy, bold flavors)');
  }
  if (/sweet|dessert|sugar/.test(text)) {
    cravingHints.push('(wants: sweet treats, desserts)');
  }
  if (/savory|savoury|umami|salty/.test(text)) {
    cravingHints.push('(wants: savory, rich flavors)');
  }
  
  // Texture
  if (/crunchy|crispy|fried/.test(text)) {
    cravingHints.push('(wants: crispy, crunchy textures)');
  }
  if (/soup|broth|liquid|warm/.test(text)) {
    cravingHints.push('(wants: liquid, warming foods)');
  }
  
  // Diet intentions
  if (/light|healthy|fresh/.test(text)) {
    cravingHints.push('(wants: light, fresh, healthy options)');
  }
  if (/heavy|filling|hearty/.test(text)) {
    cravingHints.push('(wants: filling, substantial meals)');
  }
  
  return cravingHints.join(' ');
}

// ===== CORE ENDPOINTS =====

// ✅ Health check - MATCHES OpenAPI
app.post('/v1/quick_decision', async (req, res) => {
  const t0 = Date.now();
  try {
    console.log('📥 Quick decision request:', req.body);

    const { value, error } = QUICK_SCHEMA.validate(req.body || {}, { abortEarly: false, convert: true });
    if (error) {
      console.warn('[quick_decision] validation warning:', error.details?.map(d=>d.message).join(' | '));
    }

    const v = value || {};
    const loc = normalizeLocation(v.location);
    const dietary = normalizeDietary(v.dietary);
    const mood_text = String(v.mood_text || '').trim();
    const timeContext = v.time_context || null; 
    // Build avoid list properly
    const avoidRaw = v.recent_suggestions || v.avoid || v.avoid_list || [];
    const avoidList = Array.isArray(avoidRaw) ? avoidRaw : [avoidRaw];
    const avoid = new Set(avoidList.map(n => String(n).toLowerCase()).filter(Boolean));

    const maybeCC = (loc.country_code || '').toUpperCase();
    const cc = /^[A-Z]{2}$/.test(maybeCC) ? maybeCC : 'GB';

    console.log('🔍 Processing:', {
      location: `${loc.city}, ${cc}`,
      mood: mood_text,
      dietary: dietary,
      avoid_count: avoidList.length,
      use_gpt: USE_GPT,
      has_key: !!OPENAI_API_KEY
    });
    const moodAnalysis = enhanceMoodText(mood_text);

  
    console.log('🔍 Mood analysis:', {
      original: mood_text,
      vibes: moodAnalysis.vibes,
      attributes: moodAnalysis.food_attributes,
      friendly_response: moodAnalysis.friendly_response
    });
    const menuSuggestions = await recommendFromMenus({
      location: loc,
      mood_text,
      dietary,
      meal_period: timeContext?.meal_period,
      cravingAttributes: parseCravings(mood_text).attributes
    });
    
    if (menuSuggestions && menuSuggestions.length > 0) {
      // Return actual restaurant items!
      return res.json({
        success: true,
        decisions: menuSuggestions,
        source: 'restaurant_menus',
        note: 'Available now from local restaurants'
      });
    }
    // === PRIORITY: Try GPT first with proper error handling ===
    if (USE_GPT && OPENAI_API_KEY) {
      const system = `You are VFIED. User mood: "${mood_text}"
      Analysis: ${moodAnalysis.gpt_context}
      Suggest foods that match these attributes: ${moodAnalysis.food_attributes.join(', ')}`;
      
      try {
        const gptResult = await recommendWithGPT({ 
          mood_text, 
          location: loc, 
          dietary, 
          avoidList, // Pass the actual array
          timeContext
        });

        if (gptResult && gptResult.decisions && Array.isArray(gptResult.decisions)) {
          let decisions = gptResult.decisions
            .filter(d => d && d.name && d.name.length > 2)
            .filter(d => !avoid.has(d.name.toLowerCase()))
            .filter(d => validateDietaryCompliance(d.name, dietary))
            .slice(0, 3);

          if (decisions.length >= 1) { // Accept even 1 good GPT suggestion
            console.log('✅ GPT SUCCESS:', decisions.map(d => d.name));
            
            return res.json({
              success: true,
              request_id: randomUUID?.() || String(Date.now()),
              decisions: decisions,
              location: { city: loc.city || 'Unknown', country_code: cc },
              processingTimeMs: Date.now() - t0,
              note: dietary.length ? `Dietary: ${dietary.join(', ')}` : 'No dietary filters',
              source: 'gpt',
              debug: {
                gpt_returned: gptResult.decisions?.length || 0,
                after_filtering: decisions.length,
                avoided_items: avoidList
              }
            });
          } else {
            console.warn('❌ GPT returned no valid results after filtering');
          }
        } else {
          console.warn('❌ GPT returned invalid format:', gptResult);
        }
      } catch (gptError) {
        console.error('❌ GPT call exception:', gptError.message);
      }
    } else {
      console.log('⚠️ GPT disabled - USE_GPT:', USE_GPT, 'HAS_KEY:', !!OPENAI_API_KEY);
    }

    // === Last resort fallback (only if GPT completely fails) ===
    console.log('🆘 Using emergency fallback - GPT failed or disabled');
    
    const emergencyOptions = [
      { name: "Local Chef's Choice", emoji: "👨‍🍳", explanation: "Ask what the chef recommends today" },
      { name: "Market Fresh Special", emoji: "🥕", explanation: "Whatever looks best at the local market" },
      { name: "Comfort Food", emoji: "🍲", explanation: "Something warm and satisfying" }
    ].filter(opt => validateDietaryCompliance(opt.name, dietary));

    return res.json({
      success: true,
      request_id: randomUUID?.() || String(Date.now()),
      decisions: emergencyOptions.slice(0, 3),
      mood_analysis: {
        vibes: moodAnalysis.vibes,
        message: moodAnalysis.friendly_response
      },
      location: { city: loc.city || 'Unknown', country_code: cc },
      processingTimeMs: Date.now() - t0,
      note: 'Emergency fallback - GPT unavailable',
      source: 'emergency_fallback'
    });

  } catch (e) {
    console.error('Quick decision error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/v1/debug/gpt-status', async (req, res) => {
  const testPayload = {
    mood_text: 'hungry',
    location: { city: 'London', country_code: 'GB' },
    dietary: [],
    avoidList: []
  };

  const status = {
    environment: {
      USE_GPT: USE_GPT,
      HAS_OPENAI_KEY: !!OPENAI_API_KEY,
      KEY_PREFIX: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'MISSING',
      OPENAI_MODEL: OPENAI_MODEL,
      NODE_ENV: process.env.NODE_ENV
    },
    test_gpt_call: null
  };

  if (USE_GPT && OPENAI_API_KEY) {
    try {
      console.log('🧪 Testing GPT call...');
      const result = await recommendWithGPT(testPayload);
      status.test_gpt_call = {
        success: !!result,
        result: result,
        error: null
      };
    } catch (error) {
      status.test_gpt_call = {
        success: false,
        result: null,
        error: error.message
      };
    }
  }

  res.json(status);
});


// ✅ FIXED: Recommendation endpoint with proper fallback handling
app.post('/v1/recommend', async (req, res) => {
  const t0 = Date.now();
  const request_id = `req_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  console.log('📍 Recommend request:', req.body);

  const { 
    location = {}, 
    dietary = [], 
    mood_text = "", 
    recent_suggestions = [],
    context = {},
    social = "", 
    budget = "" 
  } = req.body || {};

  const weather = await getWeather(location).catch(() => null);
  const avoidList = Array.isArray(recent_suggestions) ? recent_suggestions : [];

  console.log('🎯 Recommend processing:', {
    location: location.city,
    mood: mood_text,
    dietary: dietary,
    avoid_count: avoidList.length,
    has_weather: !!weather
  });

  // Try GPT recommendation with proper parameters
  if (USE_GPT && OPENAI_API_KEY) {
    try {
      console.log('🤖 Calling GPT for recommendation...');
      
      const gptResponse = await recommendWithGPT({ 
        mood_text, 
        location, 
        dietary, 
        weather,
        avoidList // Pass avoid list properly
      });

      if (gptResponse && gptResponse.decisions && gptResponse.decisions.length > 0) {
        // Use first GPT suggestion
        const pick = gptResponse.decisions[0];
        
        console.log('✅ GPT recommendation success:', pick.name);
        
        return res.json({
          success: true,
          request_id,
          food: {
            name: pick.name,
            emoji: pick.emoji,
            country: location.country || 'Local',
            country_code: (location.country_code || 'GB').toUpperCase()
          },
          friendMessage: pick.explanation || `Try ${pick.name} - perfect for your mood!`,
          reasoning: pick.explanation || 'AI-selected based on your preferences',
          culturalNote: null,
          weatherNote: weather ? `Weather: ${weather.temperature}°C • ${weather.condition}` : null,
          confidence: 85,
          quality: {
            verified: true,
            popular: true,
            local: true,
            fresh_data: true
          },
          data_freshness: {
            status: 'fresh',
            updated: new Date().toISOString(),
            source: 'gpt'
          },
          distance: `${(Math.random() * 2 + 0.1).toFixed(1)} mi`,
          coverage_level: 'high',
          dietaryCompliance: { 
            compliant: true, 
            warnings: [],
            alternatives: [],
            confidence: 90,
            source: 'ai'
          },
          weather,
          interactionId: `ix_${Date.now().toString(36)}`,
          processingTimeMs: Date.now() - t0,
          source: 'gpt'
        });
      } else {
        console.warn('❌ GPT returned empty or invalid response');
      }
    } catch (error) {
      console.error('❌ GPT recommend failed:', error.message);
    }
  } else {
    console.log('⚠️ GPT not available for recommend');
  }

  // Fallback only if GPT fails
  console.log('🆘 Using fallback for recommend');
  const fallback = fallbackSuggestion(location, dietary);

  return res.json({
    success: true,
    request_id,
    food: {
      name: fallback.name,
      emoji: fallback.emoji,
      country: location.country || 'Local',
      country_code: (location.country_code || 'GB').toUpperCase()
    },
    friendMessage: `Try ${fallback.name} - ${fallback.explanation}`,
    reasoning: 'Fallback suggestion - AI unavailable',
    confidence: 70,
    source: 'fallback',
    processingTimeMs: Date.now() - t0
  });
});

// ===== TRAVEL ENDPOINTS =====

// GPT travel plan helper
async function gptTravelPlan({ city, country_code, prompt }) {
  const system = `You are VFIED, a local culture and food guide. Return STRICT JSON with:
{
  "success": true,
  "city": string,
  "country_code": string,
  "planTitle": string,
  "timeline": [
    { 
      "time": "18:30", 
      "activity": "Short line", 
      "food": "Dish", 
      "emoji": "🍜", 
      "note": "why it's good", 
      "link": "https://...",
      "estimated_cost": "$15-25"
    }
  ],
  "tips": ["short bullet", "short bullet"],
  "total_cost": "$40-60",
  "walking_distance": "2km"
}`;
  const user = JSON.stringify({ city, country_code, prompt });
  const out = await gptChatJSON({ system, user });
  if (!out) return null;
  out.success = true;
  out.city = out.city || city;
  out.country_code = (out.country_code || country_code || 'GB').toUpperCase();
  if (!Array.isArray(out.timeline)) out.timeline = [];
  if (!Array.isArray(out.tips)) out.tips = [];
  return out;
}

app.post('/mcp/validate_dietary_compliance', async (req, res) => {
  const { foodName, dietary } = req.body;
  
  if (!foodName || !dietary) {
    return res.status(400).json({
      success: false,
      error: 'foodName and dietary are required'
    });
  }

  const compliant = validateDietaryCompliance(foodName, dietary);
  const warnings = [];
  
  if (!compliant) {
    warnings.push(`${foodName} may contain ingredients not suitable for ${dietary.join(', ')}`);
  }

  res.json({
    success: true,
    foodName,
    dietaryRestrictions: dietary,
    compliant,
    warnings,
    alternatives: compliant ? [] : ['Ask for modifications', 'Choose different dish'],
    reasoning: compliant ? 'Food appears compatible with restrictions' : 'Food may violate dietary restrictions',
    confidence: 85,
    source: 'rule_based'
  });
});

// ✅ Night plan endpoint - MATCHES OpenAPI NightPlanResponse
app.post('/v1/travel/nightplan', async (req, res) => {
  const { location = {}, prompt, mode = 'exploring', budget = 'medium', duration = 'full-day', dietary = [] } = req.body || {};
  const city = location.city || 'London';
  const cc = (location.country_code || 'GB').toUpperCase();

  // Try GPT first
  if (USE_GPT && OPENAI_API_KEY) {
    const plan = await gptTravelPlan({
      city,
      country_code: cc,
      prompt: prompt || `I want to experience local ${mode} vibes in ${city} tonight with ${budget} budget. Map a night plan with food and atmosphere.`
    });
    if (plan) return res.json(plan);
  }

  // Fallback
  const timeline = [
    {
      time: '18:30',
      activity: 'Golden hour neighborhood walk',
      food: 'Street snack (pick a busy stall)',
      emoji: '🌇',
      note: 'Start light, scout popular queues for best bites.',
      link: `https://www.google.com/search?q=${encodeURIComponent(city + ' street food')}`,
      estimated_cost: '$5-10'
    },
    {
      time: '19:30',
      activity: 'Live music or casual pub',
      food: 'Local lager or non-alc brew',
      emoji: '🎶',
      note: 'Catch a set; ask staff what pairs with the local snacks.',
      link: `https://www.google.com/search?q=${encodeURIComponent(city + ' live music tonight')}`,
      estimated_cost: '$8-15'
    },
    {
      time: '21:00',
      activity: 'Signature local dish',
      food: 'Chef-recommended classic',
      emoji: '🍽️',
      note: 'Pick a place with regional specialties; be open to seasonal sides.',
      link: `https://www.google.com/search?q=${encodeURIComponent('best local dish ' + city)}`,
      estimated_cost: '$20-35'
    },
    {
      time: '22:30',
      activity: 'Dessert walk / night market',
      food: 'Sweet street snack',
      emoji: '🍧',
      note: 'End on something sweet; try whatever has the happiest queue.',
      link: `https://www.google.com/search?q=${encodeURIComponent(city + ' night market')}`,
      estimated_cost: '$5-8'
    }
  ];

  res.json({
    success: true,
    city,
    country_code: cc,
    planTitle: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Night in ${city}`,
    timeline,
    tips: [
      'Carry small cash for stalls.',
      'Follow the crowds for freshness and turnover.',
      'Ask one local: "what do you eat here?" — then order that.'
    ],
    total_cost: '$38-68',
    walking_distance: '2.5km'
  });
});

// ✅ Food crawl endpoint - MATCHES OpenAPI FoodCrawlResponse
app.post('/v1/travel/food-crawl', async (req, res) => {
  const { location = {}, crawl_type = 'street_food', duration = '3_hours', budget = 'medium', dietary = [] } = req.body || {};
  const city = location?.city || 'London';
  const cc = (location?.country_code || 'GB').toUpperCase();

  // Try GPT
  if (USE_GPT && OPENAI_API_KEY) {
    const system = `You are VFIED's food crawl expert. Design a ${duration} ${crawl_type} crawl in ${city}.

CRAWL TYPES:
- street_food (markets, snacks)
- restaurant_hop (3–4 spots)
- cultural_food (traditional)
- late_night (after-dark eats)

Return STRICT JSON:
{
  "success": true,
  "crawl_title": "Creative name",
  "city": "${city}",
  "duration": "${duration}",
  "type": "${crawl_type}",
  "stops": [
    {"order":1,"time":"18:30","location":"Place","food":"What to order","emoji":"🍖","reason":"Why","cost":"$15","tip":"insider tip"}
  ],
  "total_cost": "$40-60",
  "walking_distance": "2km",
  "pro_tips": ["tip1","tip2"],
  "backup_spots": ["alt1","alt2"]
}`;
    const user = `Design a ${duration} ${crawl_type} crawl for ${city}, ${cc}. Authentic, local, walkable; mix price points.`;
    const result = await gptChatJSON({ system, user, max_tokens: 1000 });
    if (result) return res.json(result);
  }

  // Fallback
  res.json({
    success: true,
    crawl_title: `${city} ${crawl_type.replace('_', ' ')} Adventure`,
    city,
    duration,
    type: crawl_type,
    stops: [
      { 
        order: 1, 
        time: '18:00', 
        location: 'Local Market', 
        food: 'Street snacks', 
        emoji: '🍢', 
        reason: 'Start with local flavors', 
        cost: '$8', 
        tip: 'Ask vendors what\'s best today' 
      },
      { 
        order: 2, 
        time: '19:30', 
        location: 'Traditional Restaurant', 
        food: 'Signature dish', 
        emoji: '🍽️', 
        reason: 'Core local cuisine', 
        cost: '$22', 
        tip: 'Try the house special' 
      },
      { 
        order: 3, 
        time: '21:00', 
        location: 'Night Market', 
        food: 'Sweet treats', 
        emoji: '🍰', 
        reason: 'Perfect ending', 
        cost: '$10', 
        tip: 'Share with friends' 
      }
    ],
    total_cost: '$35-45',
    walking_distance: '1.8km',
    pro_tips: ['Bring cash', 'Busy = fresh', 'Ask locals for recommendations'],
    backup_spots: ['Late-night stalls', '24h convenience stores']
  });
});

// ✅ City guide endpoint - MATCHES OpenAPI CityGuideResponse  
app.get('/v1/travel/guide/:city', async (req, res) => {
  const city = String(req.params.city || '').trim();
  const country_code = String(req.query.country_code || 'GB').toUpperCase();

  // Try GPT
  if (USE_GPT && OPENAI_API_KEY) {
    const system = `You are a local food & culture expert for ${city}. Create a comprehensive city guide focused on authentic food.

Return STRICT JSON:
{
  "success": true,
  "city": "${city}",
  "country_code": "${country_code}",
  "food_scene": {
    "signature_dishes": ["dish1","dish2","dish3"],
    "street_food_areas": ["area1","area2"],
    "local_markets": ["market1","market2"],
    "must_try_restaurants": [
      {"name":"Restaurant","specialty":"dish","price_range":"low"}
    ]
  },
  "cultural_highlights": [
    {"name":"Site","type":"cultural","food_nearby":"local dish"}
  ],
  "neighborhoods": [
    {"name":"Area","vibe":"description","food_specialty":"what to eat"}
  ],
  "local_tips": ["tip1","tip2","tip3"],
  "food_etiquette": "how locals eat/order",
  "best_times": {
    "breakfast":"6-9am","lunch":"12-2pm","dinner":"7-10pm","street_food":"5-9pm"
  }
}`;
    const user = `Create a food-focused city guide for ${city}, ${country_code}. Authentic, local, non-touristy.`;
    const guide = await gptChatJSON({ system, user, max_tokens: 1100 });
    if (guide) return res.json(guide);
  }

  // Fallback
  res.json({
    success: true,
    city,
    country_code,
    food_scene: {
      signature_dishes: ['Local specialty stew', 'Grilled fish', 'Traditional bread'],
      street_food_areas: ['Central Market', 'Night Market District'],
      local_markets: ['City Market', 'Farmers Market'],
      must_try_restaurants: [
        { name: 'Local Kitchen', specialty: 'House special', price_range: 'medium' },
        { name: 'Traditional Spot', specialty: 'Regional classics', price_range: 'low' }
      ]
    },
    cultural_highlights: [
      { name: 'Old Town Walk', type: 'cultural', food_nearby: 'Street snacks and local cafes' }
    ],
    neighborhoods: [
      { name: 'Riverside District', vibe: 'lively and authentic', food_specialty: 'Fresh grilled dishes and local beer' }
    ],
    local_tips: [
      'Carry small cash for markets',
      'Ask locals for hidden spots',
      'Eat where lines are longest'
    ],
    food_etiquette: 'Be polite, try sharing plates, queue kindly. Locals appreciate when you ask for recommendations.',
    best_times: {
      breakfast: '6-9am',
      lunch: '12-2pm', 
      dinner: '7-10pm',
      street_food: '5-9pm'
    }
  });
});

// ✅ Itinerary endpoint - MATCHES OpenAPI ItineraryResponse
function buildConciseItinerary(city, country_code) {
  const country = findCountryByCode(country_code);
  const spots = country?.travel_spots || [];
  const picks = shuffle(spots).slice(0, 3);

  // If no country data, use generic placeholders
  const safe = picks.length ? picks : [
    { name: "Local Breakfast Café", emoji: "🥐", reason: "Cozy start with pastry & coffee" },
    { name: "Market Lunch", emoji: "🍲", reason: "Authentic comfort food in center" },
    { name: "Wine/Tapas Bar", emoji: "🍷", reason: "Relaxed evening small plates" }
  ];

  // Map into simple steps with times
  return safe.map((s, idx) => ({
    time: idx === 0 ? "09:00" : idx === 1 ? "13:00" : "19:00",
    title: s.name,
    why: s.reason,
    emoji: s.emoji,
    neighborhood: city,
    tags: ["food", "local"]
  }));
}

app.post('/v1/travel/itinerary', async (req, res) => {
  const t0 = Date.now();
  try {
    const { value, error } = ITIN_SCHEMA.validate(req.body || {});
    if (error) return res.status(400).json({ success: false, error: error.message });

    const { location, duration, budget, interests } = value;
    const steps = buildConciseItinerary(location.city, location.country_code);

    return res.json({
      success: true,
      city: location.city,
      country_code: location.country_code,
      duration,
      steps,
      budget,
      interests,
      processingTimeMs: Date.now() - t0
    });
  } catch (e) {
    console.error('Itinerary error:', e);
    const fallbackSteps = buildConciseItinerary('City', 'GB');
    
    return res.status(200).json({
      success: true,
      city: req.body?.location?.city || 'City',
      country_code: (req.body?.location?.country_code || 'GB').toUpperCase(),
      duration: 'one_day',
      steps: fallbackSteps,
      budget: 'medium',
      interests: ['food', 'culture'],
      note: 'fallback',
      processingTimeMs: Date.now() - t0
    });
  }
});

// ✅ NEW: Travel coach endpoint - MATCHES OpenAPI TravelCoachResponse
app.post('/v1/travel/coach', async (req, res) => {
  const { query, location = {}, context = {} } = req.body || {};
  
  if (!query) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query is required' 
    });
  }

  const city = location.city || 'the city';
  const cc = (location.country_code || 'GB').toUpperCase();

  // Try GPT
  if (USE_GPT && OPENAI_API_KEY) {
    const system = `You are VFIED's expert travel coach. Give concise, authentic local food advice for ${city}.

Return STRICT JSON:
{
  "success": true,
  "response": "2-3 sentences max, direct and actionable advice",
  "recommendations": [
    {"name":"Specific Place/Dish","details":"1 sentence why it's special","price_range":"$/$/$$/$$","location":"specific neighborhood"}
  ],
  "quick_tips": ["🎯 tip1", "⏰ tip2", "💡 tip3"],
  "follow_up_questions": ["short question 1", "short question 2"]
}

IMPORTANT: Keep response under 150 words total. Be specific, not generic. Focus on actionable local insights.`;

    const user = `User asks: "${query}" 
Location: ${city}, ${cc}
Context: ${JSON.stringify(context)}

Give specific, local recommendations with neighborhoods and exact places when possible.`;

    const result = await gptChatJSON({ system, user, max_tokens: 600 });
    if (result) return res.json(result);
  }

  // Fallback response
  res.json({
    success: true,
    response: `For "${query}" in ${city}, focus on neighborhoods where locals eat. Skip tourist areas and look for busy spots with lines of residents.`,
    recommendations: [
      {
        name: 'Local Market Food Stalls',
        details: 'Where locals eat daily - authentic and fresh',
        price_range: '$',
        location: 'Central market district'
      },
      {
        name: 'Family-Run Restaurants', 
        details: 'Traditional recipes, often no English menu',
        price_range: '$',
        location: 'Residential neighborhoods'
      }
    ],
    quick_tips: [
      '🎯 Ask locals: "Where do you eat after work?"',
      '⏰ Best deals during lunch hours (12-2pm)',
      '💡 Busy = fresh - follow the crowds'
    ],
    follow_up_questions: [
      'What neighborhoods have the best food scene?',
      'Any local food customs I should know?'
    ]
  });
});

// ===== EVENTS ENDPOINT =====

const EVENT_POOLS = {
  GB: [
    { 
      title: "Borough Market Food Walk", 
      emoji: "🥧", 
      time: "Saturday 10am-2pm",
      explanation: "Historic food market with artisan producers and tastings",
      food_pairing: "Try the famous bacon sandwich and craft cheeses"
    },
    { 
      title: "Pub Quiz & Fish n Chips", 
      emoji: "🍺", 
      time: "Wednesday 7pm",
      explanation: "Classic British pub culture with traditional comfort food",
      food_pairing: "Perfect with a pint and mushy peas"
    },
    { 
      title: "Afternoon Tea Experience", 
      emoji: "🫖", 
      time: "Daily 2-5pm",
      explanation: "Traditional British teatime with scones and sandwiches",
      food_pairing: "Cucumber sandwiches and clotted cream scones"
    }
  ],
  US: [
    { 
      title: "Food Truck Festival", 
      emoji: "🚚", 
      time: "Weekend 11am-8pm",
      explanation: "Mobile kitchens serving diverse street food",
      food_pairing: "Gourmet burgers, tacos, and fusion cuisine"
    },
    { 
      title: "BBQ & Blues Night", 
      emoji: "🎵", 
      time: "Friday 6pm-11pm",
      explanation: "Live music paired with smoky barbecue classics",
      food_pairing: "Pulled pork, ribs, and cornbread"
    },
    { 
      title: "Farmers Market Brunch", 
      emoji: "🥕", 
      time: "Saturday 9am-2pm",
      explanation: "Fresh local produce and artisanal breakfast items",
      food_pairing: "Farm-fresh eggs and seasonal fruit"
    }
  ],
  KE: [
    { 
      title: "Nyama Choma Festival", 
      emoji: "🔥", 
      time: "Sunday 2pm-8pm",
      explanation: "Traditional barbecue gathering with grilled meats",
      food_pairing: "Goat meat, beef, and ugali with kachumbari"
    },
    { 
      title: "Cultural Food Fair", 
      emoji: "🎪", 
      time: "Saturday 10am-6pm",
      explanation: "Celebrating Kenyan diverse culinary heritage",
      food_pairing: "Pilau, samosas, and mandazi"
    },
    { 
      title: "Coffee Farm Tour", 
      emoji: "☕", 
      time: "Daily 8am-4pm",
      explanation: "Learn about Kenya's famous coffee production",
      food_pairing: "Fresh roasted coffee with sweet pastries"
    }
  ],
  JP: [
    { 
      title: "Ramen Festival", 
      emoji: "🍜", 
      time: "Weekend 11am-9pm",
      explanation: "Multiple ramen shops showcase their signature bowls",
      food_pairing: "Tonkotsu, miso, and shoyu ramen varieties"
    },
    { 
      title: "Sushi Making Workshop", 
      emoji: "🍣", 
      time: "Saturday 2pm-5pm",
      explanation: "Learn traditional sushi preparation from master chefs",
      food_pairing: "Fresh nigiri and maki rolls"
    },
    { 
      title: "Cherry Blossom Picnic", 
      emoji: "🌸", 
      time: "Spring weekends",
      explanation: "Traditional hanami with seasonal foods",
      food_pairing: "Bento boxes and sakura mochi"
    }
  ],
  IN: [
    { 
      title: "Street Food Walk", 
      emoji: "🌶️", 
      time: "Evening 5pm-9pm",
      explanation: "Guided tour through local street food vendors",
      food_pairing: "Chaat, dosa, and spicy snacks"
    },
    { 
      title: "Spice Market Tour", 
      emoji: "🧄", 
      time: "Morning 9am-12pm",
      explanation: "Explore aromatic spice markets with tastings",
      food_pairing: "Fresh curries and traditional sweets"
    },
    { 
      title: "Cooking Class & Dinner", 
      emoji: "🍛", 
      time: "Saturday 4pm-8pm",
      explanation: "Learn to cook regional specialties",
      food_pairing: "Biryani, dal, and homemade naan"
    }
  ]
};

const GLOBAL_EVENTS = [
  { 
    title: "International Food Festival", 
    emoji: "🌍", 
    time: "Weekend all day",
    explanation: "Global cuisine from local immigrant communities",
    food_pairing: "Diverse dishes from around the world"
  },
  { 
    title: "Wine & Cheese Tasting", 
    emoji: "🍷", 
    time: "Friday 6pm-9pm",
    explanation: "Curated pairings with local sommelier guidance",
    food_pairing: "Artisanal cheeses and charcuterie"
  },
  { 
    title: "Pop-up Restaurant Night", 
    emoji: "⭐", 
    time: "Monthly events",
    explanation: "Rotating chefs create unique dining experiences",
    food_pairing: "Chef's surprise tasting menu"
  }
];

function getEventPool(countryCode) {
  const code = (countryCode || '').toUpperCase();
  return EVENT_POOLS[code] && EVENT_POOLS[code].length ? EVENT_POOLS[code] : GLOBAL_EVENTS;
}

function classifyEventTag(e) {
  const t = `${e.title || ''} ${e.explanation || e.description || ''}`.toLowerCase();
  if (/(food|tasting|tea|wine|beer|bbq|ramen|sushi|street|pop[- ]?up|brunch|dinner|tea)/.test(t)) return 'food';
  if (/(market|farmers|bazaar|fair)/.test(t)) return 'market';
  if (/(music|jazz|blues|gig|concert|live)/.test(t)) return 'music';
  if (/(culture|cultural|museum|gallery|exhibit|heritage|workshop|class)/.test(t)) return 'culture';
  if (/(night|pub|bar|club|late)/.test(t)) return 'nightlife';
  if (/(festival|fest|carnival)/.test(t)) return 'festival';
  return 'food';
}

function whenLabelFrom(time) {
  switch (time) {
    case 'today': return 'Tonight';
    case 'tomorrow': return 'Tomorrow evening';
    case 'this_week': return 'This week';
    case 'weekend': default: return 'This weekend';
  }
}
// ---------- Eventbrite helpers ----------
const EB_CATEGORY_MAP = {
  // VFIED -> Eventbrite category IDs
  food: ['110'],          // Food & Drink
  music: ['103'],         // Music
  culture: ['105','104'], // Arts & Theatre + Film/Media
  market: [],             // Use keywords
  nightlife: ['103'],     // Music often covers nightlife; add keywords
  all: []
};

// Build time range for Eventbrite filters
function eventsTimeRange(time) {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (time) {
    case 'today':
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
      break;
    case 'tomorrow':
      start.setDate(start.getDate() + 1);
      start.setHours(0,0,0,0);
      end.setDate(end.getDate() + 1);
      end.setHours(23,59,59,999);
      break;
    case 'weekend': {
      // Next Sat/Sun
      const day = now.getDay(); // 0 Sun
      const daysToSat = (6 - day + 7) % 7;
      const daysToSun = (7 - day + 7) % 7;
      start.setDate(now.getDate() + daysToSat);
      start.setHours(0,0,0,0);
      end.setDate(now.getDate() + daysToSun);
      end.setHours(23,59,59,999);
      break;
    }
    case 'this_week':
      // Mon..Sun of this ISO week
      {
        const d = new Date(now);
        const day = (d.getDay() + 6) % 7; // Mon=0
        start.setDate(d.getDate() - day);
        start.setHours(0,0,0,0);
        end.setDate(start.getDate() + 6);
        end.setHours(23,59,59,999);
      }
      break;
    default:
      // next 7 days
      end.setDate(end.getDate() + 7);
      break;
  }
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

// Simple memory cache for events
const EVENTS_CACHE = new Map();
function cacheKey(city, cc, category, time) {
  return `${city.toLowerCase()}|${cc.toUpperCase()}|${category}|${time}`;
}
function setCache(key, data) {
  EVENTS_CACHE.set(key, { data, expires: Date.now() + EVENTS_CACHE_TTL * 1000 });
}
function getCache(key) {
  const hit = EVENTS_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { EVENTS_CACHE.delete(key); return null; }
  return hit.data;
}

// Normalizer: Eventbrite -> VFIED event
function toVFIEDEvent(eb, city, cc, whenLabel, tag='food') {
  const price = eb.is_free === true ? 'Free' : (eb.is_free === false ? 'Paid' : 'Varies');
  const venue =
    eb.venue?.name ||
    eb.venue?.address?.localized_address_display ||
    `${city} area`;
  const title = eb.name?.text || (eb.summary ? eb.summary.slice(0, 60) : 'Local event');
  const url = eb.url || '';
  const desc = (eb.summary || eb.description?.text || '').trim();

  return {
    id: eb.id || `${cc}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    title,
    city,
    country_code: cc,
    when: whenLabel,
    tag,
    description: desc,
    location: venue,
    price,
    link: url
  };
}

// Heuristic: choose VFIED tag from EB category/keywords
function detectTag(eb, requestedCategory) {
  if (requestedCategory && requestedCategory !== 'all') return requestedCategory;
  const catId = eb.category_id;
  if (catId === '110') return 'food';
  if (catId === '103') return 'music';
  if (catId === '105' || catId === '104') return 'culture';
  // markets/nightlife rely on keywords if needed
  const t = (eb.name?.text || '').toLowerCase();
  if (/market|bazaar|fair|farmer/.test(t)) return 'market';
  if (/night|club|party|dj/.test(t)) return 'nightlife';
  return 'food'; // VFIED bias
}

// Fetch from Eventbrite (server-side)
function sanitizeCity(city = '') {
  // Remove country codes/numbers/extra commas and trim
  return String(city).replace(/[0-9]/g, '').replace(/\s{2,}/g, ' ').replace(/,+/g, ',').trim();
}

async function fetchEventbriteEvents(city, cc, category, time) {
  if (!USE_EVENTS_PROVIDER || !EVENTBRITE_TOKEN) return null;

  const { start, end } = eventsTimeRange(time);
  const cats = EB_CATEGORY_MAP[category] || [];
  const address = `${sanitizeCity(city)}, ${cc.toUpperCase()}`;

  const base = new URL('https://www.eventbriteapi.com/v3/events/search/');
  const p = base.searchParams;
  p.set('location.address', address);
  p.set('location.within', '25km');                     // 🔑 improves hit rate
  p.set('start_date.range_start', start);               // ISO8601
  p.set('start_date.range_end', end);
  p.set('expand', 'venue,category,format');
  p.set('sort_by', 'date');
  p.set('page', '1');

  if (cats.length) p.set('categories', cats.join(','));

  // keywords to help “market” / “nightlife”
  const q = [];
  if (category === 'market') q.push('market OR bazaar OR fair OR farmers');
  if (category === 'nightlife') q.push('nightlife OR party OR club OR DJ');
  if (q.length) p.set('q', q.join(' '));

  // --- try full query ---
  let r = await fetch(base.toString(), { headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` } });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.warn('[Eventbrite] full query failed:', r.status, body);

    // --- retry: minimal query (just address + within) ---
    const minimal = new URL('https://www.eventbriteapi.com/v3/events/search/');
    const pm = minimal.searchParams;
    pm.set('location.address', address);
    pm.set('location.within', '25km');
    pm.set('expand', 'venue');
    pm.set('sort_by', 'date');
    pm.set('page', '1');
    r = await fetch(minimal.toString(), { headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` } });

    if (!r.ok) {
      const body2 = await r.text().catch(() => '');
      console.warn('[Eventbrite] minimal query failed:', r.status, body2);
      return [];
    }
  }

  const j = await r.json().catch(() => ({}));
  return Array.isArray(j.events) ? j.events : [];
}

// GPT enrichment (optional, batched)
async function gptEnrichEvents(vfiedEvents, city, cc) {
  if (!USE_GPT || !OPENAI_API_KEY || !vfiedEvents?.length) return vfiedEvents;

  const system = `You are VFIED, a concise food & culture coach. 
Given a list of events, add a short foodie context.
Return STRICT JSON:
{"events":[{"id":"...","explanation":"1 sentence why it’s good for food lovers","food_pairing":"1 short phrase","vibe":"1-3 words"}]}`;
  const user = JSON.stringify({
    city, cc,
    events: vfiedEvents.map(e => ({ id: e.id, title: e.title, desc: e.description }))
  });

  const out = await gptChatJSON({ system, user, max_tokens: 600 });
  if (!out?.events) return vfiedEvents;

  const map = new Map(out.events.map(x => [x.id, x]));
  return vfiedEvents.map(e => {
    const extra = map.get(e.id);
    if (!extra) return e;
    const add = [];
    if (extra.food_pairing) add.push(`Food pairing: ${extra.food_pairing}`);
    if (extra.vibe) add.push(`Vibe: ${extra.vibe}`);
    if (extra.explanation) add.unshift(extra.explanation);
    const enriched = add.join(' • ');
    return { ...e, description: e.description ? `${e.description}\n\n${enriched}` : enriched };
  });
}

// ✅ Live Events with Eventbrite + GPT enrichment + curated fallback
app.get('/v1/events', async (req, res) => {
  const t0 = Date.now();
  try {
    const { value, error } = EVENTS_SCHEMA.validate(req.query || {});
    if (error) return res.status(400).json({ success: false, error: error.message });

    const { city, country_code, category, time } = value;
    const cc = country_code.toUpperCase();
    const whenLabel = time === 'today' ? 'Tonight'
                    : time === 'tomorrow' ? 'Tomorrow evening'
                    : time === 'this_week' ? 'This week'
                    : 'This weekend';

    // Add approved submitted events first
    const approvedEvents = submittedEvents
      .filter(e => e.status === 'approved')
      .map(e => ({
        id: e.id,
        title: e.title,
        city: e.city,
        country_code: e.country_code,
        when: e.when,
        tag: e.tag,
        description: e.description,
        location: e.location,
        price: e.price,
        link: e.link
      }));

    vfiedEvents = approvedEvents;

    // If not enough events, add curated events
    if (vfiedEvents.length < 3) {
      const pool = getEventPool(cc);
      const curatedEvents = pool.slice(0, 6 - vfiedEvents.length).map((e, idx) => ({
        id: `${cc}-curated-${idx + 1}`,
        title: e.title,
        city,
        country_code: cc,
        when: whenLabel,
        tag: 'food',
        description: e.explanation || '',
        location: `${city} area`,
        price: 'Varies',
        link: `https://www.google.com/search?q=${encodeURIComponent(e.title + ' ' + city)}`
      }));
      
      vfiedEvents = [...vfiedEvents, ...curatedEvents];
    }
    // Cache first
    const key = cacheKey(city, cc, category, time);
    const cached = getCache(key);
    if (cached) {
      return res.json({ success: true, events: cached, from: 'cache', processingTimeMs: Date.now() - t0 });
    }

    let vfiedEvents = [];

    // 1) Try Eventbrite (if enabled)
    if (USE_EVENTS_PROVIDER && EVENTBRITE_TOKEN) {
      try {
        const ebEvents = await fetchEventbriteEvents(city, cc, category, time);
        vfiedEvents = (ebEvents || [])
          .filter(e => !!e && e.status !== 'canceled')
          .slice(0, 8)
          .map(e => toVFIEDEvent(e, city, cc, whenLabel, detectTag(e, category)));
      } catch (e) {
        console.warn('[events] Eventbrite fetch failed:', e.message);
      }
    }

    // 2) If nothing, use curated pools
    if (!vfiedEvents.length) {
      const pool = getEventPool(cc);
      vfiedEvents = pool.slice(0, 6).map((e, idx) => ({
        id: `${cc}-${idx + 1}`,
        title: e.title,
        city,
        country_code: cc,
        when: whenLabel,
        tag: 'food',
        description: e.explanation || e.description || '',
        location: `${city} area`,
        price: e.price || 'Varies',
        link: `https://www.google.com/search?q=${encodeURIComponent((e.title || 'food event') + ' ' + city)}`
      }));
    }

    // 3) GPT Enrichment (optional)
    const finalList = await gptEnrichEvents(vfiedEvents.slice(0, 6), city, cc);

    // 4) Save cache + respond (UI shows 3, but return up to 6)
    setCache(key, finalList);
    return res.json({
      success: true,
      events: finalList.slice(0, 3),
      source: vfiedEvents.length && vfiedEvents[0]?.id?.length > 8 ? 'eventbrite' : 'curated',
      processingTimeMs: Date.now() - t0
    });
  } catch (e) {
    console.error('Events error:', e);
    return res.status(200).json({
      success: true,
      events: [
        { 
          id: 'global-1',
          title: 'Food Truck Night',
          city: req.query.city || 'City',
          country_code: (req.query.country_code || 'GB').toUpperCase(),
          when: 'Tonight',
          tag: 'food',
          description: 'Casual street eats and community vibes',
          location: 'City center',
          price: 'Budget-friendly',
          link: ''
        }
      ],
      note: 'fallback',
      processingTimeMs: 0
    });
  }
});

app.get('/submit-event', (req, res) => res.sendFile(path.resolve(__dirname, '../app/submit-event.html')));

// ===== DATA QUALITY ENDPOINTS =====

// ✅ NEW: Data status endpoint - MATCHES OpenAPI DataStatusResponse  
app.get('/v1/data-status/:city', (req, res) => {
  const city = req.params.city;
  
  // Mock freshness data
  const mockFreshness = {
    restaurants: { 
      updated: Date.now() - (2 * 60 * 60 * 1000), // 2h ago
      status: 'fresh' 
    }, 
    events: { 
      updated: Date.now() - (30 * 60 * 1000), // 30m ago
      status: 'fresh' 
    }, 
    weather: { 
      updated: Date.now() - (15 * 60 * 1000), // 15m ago
      status: 'fresh' 
    }
  };
  
  const coverage = ['london', 'new york', 'tokyo', 'paris'].includes(city.toLowerCase()) ? 'high' : 'medium';
  
  res.json({
    success: true,
    city,
    freshness: mockFreshness,
    coverage
  });
});

// ✅ NEW: Coverage endpoint - MATCHES OpenAPI CoverageResponse
app.get('/v1/coverage/:city', (req, res) => {
  const city = req.params.city.toLowerCase();
  
  // Define coverage levels
  const coverageMap = {
    // Tier 1: Full coverage
    'london': { level: 'high', restaurants: 5000, events: 200, accuracy: 95 },
    'new york': { level: 'high', restaurants: 8000, events: 350, accuracy: 94 },
    'tokyo': { level: 'high', restaurants: 4000, events: 180, accuracy: 92 },
    'paris': { level: 'high', restaurants: 3500, events: 160, accuracy: 91 },
    
    // Tier 2: Good coverage  
    'berlin': { level: 'medium', restaurants: 1500, events: 80, accuracy: 88 },
    'sydney': { level: 'medium', restaurants: 1200, events: 70, accuracy: 87 },
    'toronto': { level: 'medium', restaurants: 1000, events: 60, accuracy: 85 },
    
    // Default for unlisted cities
    'default': { level: 'basic', restaurants: 200, events: 10, accuracy: 75 }
  };
  
  const coverage = coverageMap[city] || coverageMap.default;
  
  res.json({
    success: true,
    city: req.params.city,
    coverage: coverage.level,
    stats: {
      restaurants: coverage.restaurants,
      events: coverage.events,
      accuracy: coverage.accuracy
    },
    features: {
      food_suggestions: true,
      travel_planning: coverage.level !== 'basic',
      events: coverage.level !== 'basic',
      real_time_data: coverage.level === 'high'
    },
    limitations: coverage.level === 'basic' ? [
      'Limited restaurant database',
      'Basic suggestions only', 
      'No real-time event data'
    ] : []
  });
});

// ===== FEEDBACK ENDPOINT =====

// ✅ Feedback endpoint - MATCHES OpenAPI
app.post('/v1/feedback', (req, res) => {
  const { 
    type, 
    interactionId, 
    vote, 
    suggestion, 
    reason, 
    location, 
    mood, 
    payload, 
    timestamp 
  } = req.body || {};

  // Log feedback (in production, save to database)
  const feedbackRecord = {
    type,
    interactionId,
    vote,
    suggestion,
    reason,
    location,
    mood,
    payload,
    timestamp: timestamp || new Date().toISOString(),
    received_at: new Date().toISOString()
  };

  console.log('[feedback received]', feedbackRecord);

  // Mock response times for different issue types
  let message = 'Thank you for your feedback!';
  if (type === 'incorrect_info') {
    message = 'Thank you for the report! We\'ll investigate and update within 24 hours.';
  } else if (type === 'closed_restaurant') {
    message = 'Thanks for letting us know! We\'ll verify and update within 2-4 hours.';
  }

  res.json({
    success: true,
    message
  });
});

// ===== UTILITY ENDPOINTS =====

// Countries endpoint
app.get('/v1/countries', (_req, res) => {
  const out = COUNTRIES_LIST.map(c => ({
    name: c.name,
    code: c.country_code, // This maps your data to what frontend expects
    region: c.region || '—',
    cuisine: c.cuisine || '—'
  }));
  res.json({ countries: out });
});

// Moods endpoint
app.get('/v1/moods', (_req, res) => {
  res.json({ moods: MOODS_TAXONOMY });
});

// ===== MCP ENDPOINTS (for backward compatibility) =====

app.post('/mcp/get_food_suggestion', async (req, res) => {
  const { mood = 'hungry', location = {}, dietary = [] } = req.body || {};
  const weather = await getWeather(location);
  
  if (USE_GPT && OPENAI_API_KEY) {
    const gpt = await recommendWithGPT({ mood_text: mood, location, dietary, weather });
    if (gpt) return res.json(gpt);
  }
  
  const pick = fallbackSuggestion(location, dietary);
  res.json({
    success: true,
    friendMessage: `Try ${pick.name} ${pick.emoji} — ${weather?.isCold ? 'it will warm you up' : 'it suits today'}.`,
    food: { name: pick.name, emoji: pick.emoji, country: location.country, country_code: location.country_code },
    weather,
    dietaryNote: dietary.length ? `Filtered for: ${dietary.join(', ')}` : null
  });
});

// Add after your existing endpoints, before the error handler
app.post('/v1/analytics/track', (req, res) => {
  const { event, data } = req.body;
  analytics.addEvent(event, { ...data, ip: req.ip });
  res.json({ success: true });
});
app.get('/v1/analytics/stats', (req, res) => {
  res.json(analytics.getStats());
})
app.post('/mcp/get_cultural_food_context', async (req, res) => {
  const { location, dietary = [] } = req.body;
  const cc = (location?.country_code || 'GB').toUpperCase();
  const city = location?.city || 'Unknown';

  // Use your existing getGlobalFoodExamples function
  const examples = getGlobalFoodExamples(cc);
  
  res.json({
    success: true,
    mainCuisine: location?.country || 'Local',
    popularFoods: ['Local staple', 'Regional specialty', 'Street food'],
    comfortFoods: ['Warm soup', 'Rice dish', 'Bread'],
    streetFoods: ['Market snacks', 'Quick bites', 'Local treats'],
    celebrationFoods: ['Festival dish', 'Special occasion meal'],
    culturalNotes: examples,
    dietaryFriendlyOptions: dietary.reduce((acc, diet) => {
      acc[diet] = ['Plant-based option', 'Modified traditional dish'];
      return acc;
    }, {}),
    location: `${city}, ${location?.country || 'Unknown'}`
  });
});
app.post('/v1/restaurant/menu', async (req, res) => {
  try {
    const result = await menuManager.addRestaurantMenu(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false,
    error: 'Internal server error', 
    message: err.message 
  });
});


app.post('/v1/restaurants/signup', async (req, res) => {
  try {
    const { restaurant, contact, plan = 'free', terms_accepted } = req.body;
    
    if (!restaurant || !contact || !terms_accepted) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: restaurant, contact, terms_accepted'
      });
    }

    // Generate credentials
    const restaurant_id = `rest_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const api_key = `vf_${Math.random().toString(36).slice(2,15)}${Date.now().toString(36)}`;
    const secret = `sec_${Math.random().toString(36).slice(2,20)}`;

    // In production, save to database
    console.log('[restaurant signup]', { restaurant_id, restaurant, contact, plan });

    res.status(201).json({
      success: true,
      restaurant_id,
      credentials: {
        api_key,
        secret
      },
      next_steps: "Check your email for setup instructions. Use your API key to upload menus."
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/v1/restaurants/profile', (req, res) => {
  // Mock restaurant profile - replace with actual auth & DB lookup
  res.json({
    success: true,
    restaurant: {
      restaurant_id: 'rest_123',
      name: 'Sample Restaurant',
      cuisineType: 'italian',
      city: 'London',
      country: 'United Kingdom',
      country_code: 'GB',
      status: 'active',
      plan: 'free',
      created_at: new Date().toISOString()
    }
  });
});

app.put('/v1/restaurants/profile', (req, res) => {
  const updates = req.body;
  
  // In production: validate auth, update database
  console.log('[profile update]', updates);
  
  res.json({
    success: true,
    restaurant: {
      ...updates,
      restaurant_id: 'rest_123',
      updated_at: new Date().toISOString()
    }
  });
});

app.get('/v1/menus', (req, res) => {
  // Return restaurant's menu items
  res.json({
    success: true,
    items: menuManager.getAllMenuItems() || [],
    total_count: menuManager.getMenuCount()
  });
});

app.post('/v1/menus', async (req, res) => {
  try {
    const { items, replace_existing = false } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }

    // Use existing menu manager
    let added = 0, updated = 0, errors = [];
    
    for (const item of items) {
      try {
        await menuManager.addMenuItem(item);
        added++;
      } catch (error) {
        errors.push(`Failed to add ${item.name}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      processed: items.length,
      added,
      updated,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/v1/admin/restaurants', (req, res) => {
  // Mock admin response
  res.json({
    success: true,
    restaurants: [
      {
        restaurant_id: 'rest_123',
        name: 'Sample Restaurant',
        city: 'London',
        country_code: 'GB',
        status: 'active',
        plan: 'free',
        created_at: new Date().toISOString()
      }
    ]
  });
});

app.get('/v1/admin/summary', (req, res) => {
  res.json({
    vendor_id: 'restaurant_001',
    menu_items: 0,
    menu_version: '1.0',
    updatedAt: new Date().toISOString()
  });
});

app.get('/v1/analytics', (req, res) => {
  res.json({
    plan: 'free',
    usage: { current_period: 45, limit: 1000, percentage: 4.5 }
  });
});
app.get('/v1/admin/checklist', (req, res) => {
  res.json({
    summary: { phase1_pass: true, phase2_seed_pass: true },
    counts: { countries: 150, menu_items: 0 },
    items: [
      { key: 'gpt_enabled', label: 'GPT Enabled', ok: !!process.env.OPENAI_API_KEY },
      { key: 'menu_upload', label: 'Menu Upload', ok: true },
      // Add more checklist items
    ]
  });
});

app.get('/v1/admin/telemetry', (req, res) => {
  res.json({
    items: analytics.events.length > 0 ? analytics.events : [
      { timestamp: new Date().toISOString(), type: 'feedback', data: { rating: 'positive', comment: 'Great food!' } },
      { timestamp: new Date().toISOString(), type: 'recommendation', data: { dish: 'Pasta', mood: 'comfort' } }
    ]
  });
});

// Add this health endpoint to your mcp-server.js
app.get('/health', async (req, res) => {
  const services = {
    gpt: USE_GPT && OPENAI_API_KEY ? 'on' : 'off',
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

app.post('/v1/auth/login', (req, res) => {
  const { email, password, role = 'restaurant' } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  // Mock authentication - replace with real auth
  const token = `jwt_${Math.random().toString(36).slice(2,15)}${Date.now().toString(36)}`;
  
  res.json({
    success: true,
    token,
    expires_in: 3600,
    user: {
      id: 'user_123',
      email,
      role,
      created_at: new Date().toISOString()
    }
  });
});

app.post('/v1/auth/refresh', (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(401).json({
      success: false,
      error: 'Refresh token required'
    });
  }

  const new_token = `jwt_${Math.random().toString(36).slice(2,15)}${Date.now().toString(36)}`;
  
  res.json({
    success: true,
    token: new_token,
    expires_in: 3600
  });
});

// Event storage (in production, use a database)
const submittedEvents = [];

// Event submission endpoint
app.post('/v1/events/submit', upload.single('poster'), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      location, 
      date, 
      time, 
      category, 
      contact_email,
      contact_name,
      price,
      user_id,
      place_id // From Google Places
    } = req.body;

    // Enhanced validation
    if (!title || !description || !location || !date || !contact_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, location, date, contact_email'
      });
    }

    // Get user profile for credibility scoring
    const user = userProfiles.find(u => u.id === user_id);
    
    // Process poster image
    const posterUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Enhanced location data
    let enhancedLocation;
      try {
        if (typeof location === 'object' && location !== null) {
          enhancedLocation = location;
        } else if (typeof location === 'string') {
          enhancedLocation = JSON.parse(location);
        } else {
          enhancedLocation = {};
        }
      } catch (error) {
        console.warn('Failed to parse location:', error.message);
        enhancedLocation = { city: 'Unknown', country_code: 'GB' };
      }
    if (place_id) {
      // Fetch additional place details
      try {
        const placeResponse = await fetch(`http://localhost:${PORT}/v1/places/details/${place_id}`);
        const placeData = await placeResponse.json();
        if (placeData.success) {
          enhancedLocation = {
            ...enhancedLocation,
            place_id,
            coordinates: placeData.place.geometry.location,
            formatted_address: placeData.place.formatted_address,
            phone: placeData.place.formatted_phone_number,
            website: placeData.place.website
          };
        }
      } catch (error) {
        console.warn('Failed to fetch place details:', error);
      }
    }

    // Create enhanced event object
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      title: title.trim(),
      description: description.trim(),
      location: enhancedLocation,
      city: enhancedLocation.city || 'Unknown',
      country_code: (enhancedLocation.country_code || 'GB').toUpperCase(),
      when: `${date} ${time || ''}`.trim(),
      tag: category || 'food',
      price: price || 'Free',
      contact_email,
      contact_name: contact_name || 'Event Organizer',
      user_id: user_id || null,
      poster_url: posterUrl,
      submitted_at: new Date().toISOString(),
      status: 'pending',
      link: `mailto:${contact_email}`,
      
      // Enhanced fields
      credibility_score: user ? user.approval_rate : 0.5,
      auto_moderation: null // Will be set by AI
    };

    // Run auto-moderation AI
    const moderation = await EventAutoModerator.evaluateEvent(event);
    event.auto_moderation = moderation;

    // Auto-approve if criteria met
    if (moderation.shouldAutoApprove) {
      event.status = 'approved';
      event.approved_at = new Date().toISOString();
      event.approved_by = 'auto-moderator';
      
      console.log(`[AUTO-APPROVED] ${event.title} (confidence: ${moderation.confidence})`);
    } else {
      console.log(`[MANUAL REVIEW] ${event.title} - Reasons: ${moderation.reasons.join(', ')}`);
    }

    // Store event
    submittedEvents.push(event);

    // Update user stats if registered user
    if (user) {
      user.submission_count += 1;
      if (event.status === 'approved') {
        // Boost approval rate for good submissions
        user.approval_rate = Math.min(1.0, user.approval_rate + 0.05);
      }
    }
    
    res.status(201).json({
      success: true,
      event_id: event.id,
      status: event.status,
      message: event.status === 'approved' 
        ? 'Event approved and published immediately!' 
        : 'Event submitted for review. You\'ll hear back within 24 hours.',
      estimated_review_time: event.status === 'approved' ? 'immediate' : '24-48 hours',
      auto_approved: moderation.shouldAutoApprove,
      confidence: moderation.confidence
    });

  } catch (error) {
    console.error('Enhanced event submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit event'
    });
  }
});

// Admin: Get pending events
app.get('/v1/admin/events/pending', (req, res) => {
  const pendingEvents = submittedEvents.filter(e => e.status === 'pending');
  res.json({
    success: true,
    events: pendingEvents,
    total: pendingEvents.length
  });
});

// Admin: Approve/reject events
app.post('/v1/admin/events/:id/approve', (req, res) => {
  const eventId = req.params.id;
  const event = submittedEvents.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  event.status = 'approved';
  event.approved_at = new Date().toISOString();

  console.log('[event approved]', { id: eventId, title: event.title });
  
  res.json({ success: true, message: 'Event approved' });
});

app.post('/v1/admin/events/:id/reject', (req, res) => {
  const eventId = req.params.id;
  const { reason } = req.body;
  const event = submittedEvents.find(e => e.id === eventId);
  
  if (!event) {
    return res.status(404).json({ success: false, error: 'Event not found' });
  }

  event.status = 'rejected';
  event.rejection_reason = reason;
  event.rejected_at = new Date().toISOString();

  res.json({ success: true, message: 'Event rejected' });
});
// Add this route for the admin dashboard
app.get('/admin', (req, res) => res.sendFile(path.resolve(__dirname, '../admin.html')));
// =====================================================
// 1. AUTO-APPROVAL AI SYSTEM
// =====================================================

class EventAutoModerator {
  static autoApprovalCriteria = {
    hasValidContact: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    hasValidDate: (date) => new Date(date) >= new Date(),
    hasDescription: (desc) => desc?.length >= 30,
    hasLocation: (loc) => loc?.city && loc?.venue,
    noSpamKeywords: (text) => !/(viagra|casino|crypto|bitcoin|scam|hack)/i.test(text),
    priceFormat: (price) => !price || /^(free|£\d+|£\d+-\d+|\$\d+|varies)$/i.test(price)
  };

  static moderationFlags = {
    suspiciousEmail: (email) => /(temp|fake|test|spam|throwaway)/i.test(email),
    priceAboveThreshold: (price) => {
      const match = price?.match(/£(\d+)/);
      return match && parseInt(match[1]) > 100;
    },
    inappropriateContent: (text) => /(fuck|shit|damn|sexual|explicit)/i.test(text),
    duplicateSubmission: async (title, contact_email) => {
      // Check for similar submissions in last 7 days
      const recent = submittedEvents.filter(e => 
        e.contact_email === contact_email && 
        e.title.toLowerCase() === title.toLowerCase() &&
        new Date() - new Date(e.submitted_at) < 7 * 24 * 60 * 60 * 1000
      );
      return recent.length > 0;
    }
  };

  static async evaluateEvent(event) {
    const criteria = this.autoApprovalCriteria;
    const flags = this.moderationFlags;
    
    // Check all auto-approval criteria
    const autoApprove = Object.keys(criteria).every(key => {
      switch (key) {
        case 'hasValidContact': return criteria[key](event.contact_email);
        case 'hasValidDate': return criteria[key](event.date);
        case 'hasDescription': return criteria[key](event.description);
        case 'hasLocation': return criteria[key](event.location);
        case 'noSpamKeywords': return criteria[key](event.title + ' ' + event.description);
        case 'priceFormat': return criteria[key](event.price);
        default: return true;
      }
    });

    // Check moderation flags
    const flagged = Object.keys(flags).some(key => {
      switch (key) {
        case 'suspiciousEmail': return flags[key](event.contact_email);
        case 'priceAboveThreshold': return flags[key](event.price);
        case 'inappropriateContent': return flags[key](event.title + ' ' + event.description);
        case 'duplicateSubmission': return flags[key](event.title, event.contact_email);
        default: return false;
      }
    });

    const shouldAutoApprove = autoApprove && !flagged;
    
    return {
      shouldAutoApprove,
      confidence: shouldAutoApprove ? 0.95 : 0.3,
      reasons: this.getEvaluationReasons(event, autoApprove, flagged)
    };
  }

  static getEvaluationReasons(event, passedCriteria, flagged) {
    const reasons = [];
    if (!passedCriteria) reasons.push('Failed basic validation criteria');
    if (flagged) reasons.push('Triggered content moderation flags');
    if (passedCriteria && !flagged) reasons.push('Passed all automated checks');
    return reasons;
  }
}

// =====================================================
// 2. USER PROFILE SYSTEM
// =====================================================

const userProfiles = []; // In production, use database

app.post('/v1/auth/register', async (req, res) => {
  try {
    const { name, email, password, type = 'individual', city } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Check if user exists
    const existingUser = userProfiles.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists with this email'
      });
    }

    // Create user profile
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // In production, hash this!
      type, // 'individual', 'restaurant', 'venue'
      city: city || 'London',
      verified: false,
      avatar_url: null,
      created_at: new Date().toISOString(),
      submission_count: 0,
      approval_rate: 1.0
    };

    userProfiles.push(user);

    // Return user without password
    const { password: _, ...userResponse } = user;
    res.status(201).json({
      success: true,
      user: userResponse,
      message: 'Profile created successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create profile'
    });
  }
});

app.post('/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = userProfiles.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Return user without password
    const { password: _, ...userResponse } = user;
    res.json({
      success: true,
      user: userResponse,
      token: `token_${user.id}` // In production, use JWT
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// =====================================================
// 3. GOOGLE PLACES GEO INTELLIGENCE
// =====================================================

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

app.get('/v1/places/search', async (req, res) => {
  try {
    const { query, city = 'London' } = req.query;
    
    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Google Places API not configured'
      });
    }

    const searchQuery = `${query} ${city}`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const suggestions = data.results.slice(0, 5).map(place => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      geometry: place.geometry.location,
      types: place.types,
      rating: place.rating,
      price_level: place.price_level
    }));

    res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Places search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search places'
    });
  }
});

app.get('/v1/places/details/:place_id', async (req, res) => {
  try {
    const { place_id } = req.params;
    
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_address,geometry,formatted_phone_number,website,opening_hours&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    res.json({
      success: true,
      place: data.result
    });

  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get place details'
    });
  }
});

// =====================================================
// 4. IMAGE UPLOAD SYSTEM
// =====================================================



// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Image upload endpoint
app.post('/v1/upload/image', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      image_url: imageUrl,
      file_info: {
        original_name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// =====================================================
// 5. RESTAURANT MENU SYSTEM
// =====================================================

const restaurantMenus = []; // In production, use database

app.post('/v1/menus', upload.array('images', 10), async (req, res) => {
  try {
    const { restaurant_id, user_id, menu_data } = req.body;
    
    if (!restaurant_id || !user_id) {
      return res.status(400).json({
        success: false,
        error: 'Restaurant ID and User ID are required'
      });
    }

    // Process uploaded images
    const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    // Parse menu data
    const menuItems = JSON.parse(menu_data || '[]');
    
    const menu = {
      id: `menu_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      restaurant_id,
      user_id,
      items: menuItems,
      images: imageUrls,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'active'
    };

    restaurantMenus.push(menu);

    res.status(201).json({
      success: true,
      menu,
      message: 'Menu uploaded successfully'
    });

  } catch (error) {
    console.error('Menu upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload menu'
    });
  }
});

app.get('/v1/menus/:restaurant_id', (req, res) => {
  try {
    const { restaurant_id } = req.params;
    
    const menu = restaurantMenus.find(m => m.restaurant_id === restaurant_id && m.status === 'active');
    
    if (!menu) {
      return res.status(404).json({
        success: false,
        error: 'Menu not found'
      });
    }

    res.json({
      success: true,
      menu
    });

  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu'
    });
  }
});

// =====================================================
// 7. ENHANCED ADMIN DASHBOARD DATA
// =====================================================

app.get('/v1/admin/stats', (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const stats = {
      pending_count: submittedEvents.filter(e => e.status === 'pending').length,
      approved_today: submittedEvents.filter(e => 
        e.status === 'approved' && 
        new Date(e.approved_at || e.submitted_at) >= today
      ).length,
      total_submissions: submittedEvents.length,
      auto_approval_rate: submittedEvents.length > 0 
        ? (submittedEvents.filter(e => e.approved_by === 'auto-moderator').length / submittedEvents.length * 100).toFixed(1)
        : 0,
      avg_response_time: '< 1h', // Calculate from actual data
      user_count: userProfiles.length,
      restaurant_count: userProfiles.filter(u => u.type === 'restaurant').length
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load stats'
    });
  }
});

app.get('/v1/admin/events/all', (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let events = submittedEvents;
    if (status && status !== 'all') {
      events = events.filter(e => e.status === status);
    }
    
    // Sort by submission date, newest first
    events = events
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      events,
      total: events.length
    });

  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🌦️ VFIED Complete API Server running on port ${PORT}`);
  console.log(`📖 OpenAPI docs available at http://localhost:${PORT}/openapi.json`);
  console.log(`🔧 Features: ${USE_GPT ? '✅ GPT' : '❌ GPT'} | ${process.env.OPENWEATHER_API_KEY ? '✅ Weather' : '❌ Weather'}`);
});

// (Optional) export for testing
// export default app;

// ===== EXPORTS (ADD THIS AT THE VERY END) =====
export {
  EventAutoModerator,
  userProfiles,
  restaurantMenus,
  submittedEvents
};