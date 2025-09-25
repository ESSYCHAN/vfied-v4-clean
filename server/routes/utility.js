// utility.js - Utility endpoints and common functionality

import * as moodsModule from '../data/moods.js';
import * as countriesModule from '../data/countries.js';
import { SUPPORTED_COUNTRIES } from '../data/countries.js';

// Load data
const moods = moodsModule.MOOD_TAXONOMY?.moods || moodsModule.default?.moods || [];
const countries = countriesModule.SUPPORTED_COUNTRIES?.countries || countriesModule.default?.countries || [];
const COUNTRIES_LIST = SUPPORTED_COUNTRIES.countries || [];

// Define mood fallbacks
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

// Process the extracted data
const rawMoods = extractMoodsFromModule(moodsModule).map(normalizeMood).filter(Boolean);
const MOODS_TAXONOMY = moods.length ? moods : MOODS_FALLBACK;

export function setupUtilityRoutes(app) {
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

  // Data status endpoint
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

  // Coverage endpoint
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
}