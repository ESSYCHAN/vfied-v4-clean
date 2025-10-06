// food.js - Food-related endpoints and functionality

import Joi from 'joi';
import fs from 'fs';
import { randomUUID } from 'crypto';
import * as moodsModule from '../data/moods.js';
import * as countriesModule from '../data/countries.js';
import { SUPPORTED_COUNTRIES } from '../data/countries.js';
import { parseCravings, enhanceMoodText } from '../craving_parser.js';
import { recommendFromMenus, menuManager } from '../menu_manager.js';
import { RestaurantCollections } from '../../src/collections/index.js';
// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const USE_GPT = ['true', '1', 'yes', 'on'].includes(String(process.env.USE_GPT || process.env.VITE_USE_GPT || '').toLowerCase().trim());
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Load data
const moods = moodsModule.MOOD_TAXONOMY?.moods || moodsModule.default?.moods || [];
const countries = countriesModule.SUPPORTED_COUNTRIES?.countries || countriesModule.default?.countries || [];
const culturalMeals = JSON.parse(fs.readFileSync('./server/data/cultural_meals.json', 'utf8'));

console.log('🔧 Environment Check:');
console.log('- USE_GPT:', USE_GPT);
console.log('- OPENAI_API_KEY exists:', !!OPENAI_API_KEY);
console.log('- OPENAI_MODEL:', OPENAI_MODEL);

if (!USE_GPT) {
  console.warn('⚠️ GPT is disabled! Set USE_GPT=true in your .env file');
}
if (!OPENAI_API_KEY) {
  console.warn('⚠️ OpenAI API key missing! Set VITE_OPENAI_API_KEY in your .env file');
}

// Define mood fallbacks FIRST (prevents use-before-define)
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

// Spec-aligned but tolerant validators
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
  recent_suggestions: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(), 
  time_context: Joi.object({
    current_hour: Joi.number().min(0).max(23).optional(),
    meal_period: Joi.string().valid('breakfast','lunch','snack','dinner','late_night').optional(),
    is_weekend: Joi.boolean().optional(),
    day_of_week: Joi.number().min(0).max(6).optional()
  }).optional()
}).unknown(true);

// Normalizers
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

// Analytics
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
  const code = c?.country_code || '';
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

function pickCountryPool(cc) {
  const code = (cc || '').toUpperCase();
  return COUNTRY_POOLS[code] && COUNTRY_POOLS[code].length ? COUNTRY_POOLS[code] : GLOBAL_POOL;
}

// Robust country finder (uses export if available else normalized list)
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

// Validate dietary compliance
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

// Restaurant menus storage
const restaurantMenus = [];

export function setupFoodRoutes(app, upload) {
  // Quick decision endpoint
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
        cravingAttributes: parseCravings(mood_text).attributes,
        timeContext: timeContext // ADD THIS LINE
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

  // Debug GPT status
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

  // Recommendation endpoint
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

  // Dietary compliance validation
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

  // Analytics tracking
  app.post('/v1/analytics/track', (req, res) => {
    const { event, data } = req.body;
    analytics.addEvent(event, { ...data, ip: req.ip });
    res.json({ success: true });
  });

  app.get('/v1/analytics/stats', (req, res) => {
    res.json(analytics.getStats());
  });

  // MCP food suggestion
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

  // Cultural food context
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

  

  // Restaurant profile
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

  // Menu management
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
    const { items, restaurant_name, location, replace_existing = false } = req.body;
    
    if (!Array.isArray(items) && !restaurant_name) {
      return res.status(400).json({
        success: false,
        error: 'Either items array or restaurant data required'
      });
    }

    let added = 0, updated = 0, errors = [];
    let restaurantId = null;

    // Handle restaurant creation if provided
    if (restaurant_name) {
      try {
        restaurantId = await RestaurantCollections.createRestaurant({
          name: restaurant_name,
          city: location?.city || 'London',
          country_code: location?.country_code || 'GB',
          coordinates: location?.coordinates || null,
          data_source: 'api_import'
        });
        console.log(`Created restaurant: ${restaurantId}`);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: `Failed to create restaurant: ${error.message}`
        });
      }
    }

    // Process menu items
    for (const item of items || []) {
      try {
        // Use Firebase collections for new items
        if (restaurantId || item.restaurant_id) {
          await MenuItemCollections.createMenuItem({
            name: item.name,
            description: item.description || '',
            price: item.price || '',
            category: item.category || 'main',
            restaurant_id: restaurantId || item.restaurant_id,
            tags: item.tags || [],
            dietary: {
              vegetarian: item.vegetarian || false,
              vegan: item.vegan || false,
              gluten_free: item.gluten_free || false
            },
            data_source: 'api_import'
          });
          added++;
        } else {
          // Fallback to existing menuManager for backward compatibility
          await menuManager.addMenuItem(item);
          added++;
        }
      } catch (error) {
        errors.push(`Failed to add ${item.name}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      restaurant_id: restaurantId,
      processed: (items || []).length,
      added,
      updated,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

  // Restaurant menu endpoint
  app.post('/v1/restaurant/menu', async (req, res) => {
    try {
      const result = await menuManager.addRestaurantMenu(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Menu upload with images
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

  // Admin endpoints
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

  // Feedback endpoint
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

  // Authentication endpoints
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
app.get('/v1/debug/menus', (req, res) => {
  const allMenus = Array.from(menuManager.menus.entries()).map(([key, menu]) => ({
    key,
    restaurant_id: menu.restaurant_id,
    name: menu.restaurant_name,
    location: menu.location,
    items_count: menu.menu_items?.length || 0,
    sample_items: menu.menu_items?.slice(0, 3).map(i => i.name) || []
  }));
  
  res.json({
    total_restaurants: allMenus.length,
    restaurants: allMenus
  });
});}
