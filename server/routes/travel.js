// travel.js - Travel-related endpoints and functionality

import Joi from 'joi';
import * as countriesModule from '../data/countries.js';
import { SUPPORTED_COUNTRIES } from '../data/countries.js';

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const USE_GPT = ['true', '1', 'yes', 'on'].includes(String(process.env.USE_GPT || process.env.VITE_USE_GPT || '').toLowerCase().trim());
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Load data
const countries = countriesModule.SUPPORTED_COUNTRIES?.countries || countriesModule.default?.countries || [];
const COUNTRIES_LIST = SUPPORTED_COUNTRIES.countries || [];

// Validation schemas
const ITIN_SCHEMA = Joi.object({
  location: Joi.object({
    city: Joi.string().default('London'),
    country_code: Joi.string().length(2).uppercase().required()
  }).required(),
  duration: Joi.string().valid('one_day','two_days','weekend','quick','half-day','full-day').default('one_day'),
  interests: Joi.array().items(Joi.string()).default(['food','culture']),
  budget: Joi.string().valid('budget','medium','premium','luxury').default('medium')
});

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

// Find country by code
function findCountryByCode(cc) {
  if (!cc) return null;
  const code = cc.toUpperCase();
  const fromExport = SUPPORTED_COUNTRIES?.countries?.find?.(c => c.country_code === code);
  if (fromExport) return fromExport;
  return COUNTRIES_LIST.find(c => (c.country_code || c.code) === code) || null;
}

// Shuffle utility
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// Build concise itinerary
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

export function setupTravelRoutes(app) {
  // Night plan endpoint
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

  // Food crawl endpoint
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

  // City guide endpoint
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

  // Itinerary endpoint
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

  // Travel coach endpoint
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
    {"name":"Specific Place/Dish","details":"1 sentence why it's special","price_range":"$/$/$/$","location":"specific neighborhood"}
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
}