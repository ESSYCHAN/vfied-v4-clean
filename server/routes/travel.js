// travel.js - Travel-related endpoints and functionality

import Joi from 'joi';
import * as countriesModule from '../data/countries.js';
import { SUPPORTED_COUNTRIES } from '../data/countries.js';
import { menuManager } from '../menu_manager.js';

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const USE_GPT = ['true', '1', 'yes', 'on'].includes(String(process.env.USE_GPT || process.env.VITE_USE_GPT || '').toLowerCase().trim());
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Load data
const countries = countriesModule.SUPPORTED_COUNTRIES?.countries || countriesModule.default?.countries || [];
const COUNTRIES_LIST = SUPPORTED_COUNTRIES.countries || [];

const FLEX_LOCATION = Joi.object({
  city: Joi.string().allow('', null),
  country_code: Joi.string().min(2).max(2).uppercase().allow('', null),
  latitude: Joi.alternatives(Joi.number(), Joi.string()).optional(),
  longitude: Joi.alternatives(Joi.number(), Joi.string()).optional(),
  neighborhood: Joi.string().allow('', null)
}).unknown(true);

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

const SHORTLIST_SCHEMA = Joi.object({
  location: FLEX_LOCATION.keys({
    city: Joi.string().required(),
    country_code: Joi.string().min(2).max(2).uppercase().default('GB')
  }).required(),
  mood_text: Joi.string().allow('', null),
  dietary: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).default([]),
  attributes: Joi.array().items(Joi.string()).default([]),
  interests: Joi.array().items(Joi.string()).default([]),
  vibe_preferences: Joi.array().items(Joi.string()).default([]),
  include_coach: Joi.boolean().default(true),
  coach_query: Joi.string().allow('', null),
  limit: Joi.number().min(1).max(12).default(5),
  per_restaurant_items: Joi.number().min(1).max(5).default(3),
  sort_by: Joi.string().valid('relevance','hidden_gem','distance').default('relevance'),
  data_source: Joi.string().valid('hybrid','local','firebase').default('hybrid'),
  time_context: Joi.object({
    current_hour: Joi.number().min(0).max(23),
    meal_period: Joi.string().valid('breakfast','lunch','snack','dinner','late_night','all_day'),
    day_of_week: Joi.number().min(0).max(6)
  }).default({})
}).unknown(true);

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

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((v) => String(v).trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function formatPriceRange(priceRange) {
  if (!priceRange) return '$$';
  const map = {
    budget: '$',
    cheap: '$',
    medium: '$$',
    moderate: '$$',
    premium: '$$$',
    upscale: '$$$',
    luxury: '$$$$',
    fine_dining: '$$$$'
  };
  const normalized = String(priceRange).toLowerCase();
  return map[normalized] || priceRange;
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

// Helper: Check restaurant availability based on opening hours and time context
function checkRestaurantAvailability(restaurant, timeContext) {
  if (!restaurant.opening_hours || Object.keys(restaurant.opening_hours).length === 0) {
    return {
      status: 'unknown',
      label: 'Hours not available',
      is_open: null,
      opens_at: null,
      closes_at: null
    };
  }

  const now = new Date();
  const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][timeContext?.day_of_week ?? now.getDay()];
  const currentHour = timeContext?.current_hour ?? now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  const todayHours = restaurant.opening_hours[currentDay];

  if (!todayHours || todayHours === 'closed') {
    return {
      status: 'closed',
      label: 'Closed today',
      is_open: false,
      opens_at: null,
      closes_at: null
    };
  }

  // Parse opening hours (e.g., "09:00" -> 540 minutes)
  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const openTime = parseTime(todayHours.open || '00:00');
  const closeTime = parseTime(todayHours.close || '23:59');

  const isOpen = currentTimeMinutes >= openTime && currentTimeMinutes < closeTime;
  const closingSoon = isOpen && (closeTime - currentTimeMinutes) <= 60; // Within 1 hour of closing

  return {
    status: isOpen ? (closingSoon ? 'closing_soon' : 'open') : 'closed',
    label: isOpen ? (closingSoon ? 'Closing soon' : 'Available now') : `Opens at ${todayHours.open}`,
    is_open: isOpen,
    opens_at: todayHours.open,
    closes_at: todayHours.close
  };
}

// Helper: Calculate and format distance between user and restaurant
function calculateDistanceDisplay(userLocation, restaurantLocation) {
  // If both have coordinates, calculate actual distance
  if (userLocation.latitude && userLocation.longitude &&
      restaurantLocation.coordinates) {

    const lat1 = userLocation.latitude;
    const lon1 = userLocation.longitude;
    const lat2 = restaurantLocation.coordinates.latitude || restaurantLocation.coordinates._latitude;
    const lon2 = restaurantLocation.coordinates.longitude || restaurantLocation.coordinates._longitude;

    // Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const km = R * c;

    // Format for display
    if (km < 1) {
      return { km, text: `${Math.round(km * 1000)}m away` };
    } else if (km < 10) {
      return { km, text: `${km.toFixed(1)}km away` };
    } else {
      return { km, text: `${Math.round(km)}km away` };
    }
  }

  // Fallback: no precise distance available
  return {
    km: null,
    text: `${restaurantLocation.city || restaurantLocation.neighborhood || 'Nearby'}`
  };
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

async function buildCoachRecommendation({ location, shortlist, query, mood_text, dietary, interests }) {
  const city = location.city || 'the city';
  const cc = (location.country_code || 'GB').toUpperCase();
  const shortlistSummary = shortlist.slice(0, 5).map((item) => ({
    name: item.restaurant_name,
    hero_item: item.menu_samples?.[0]?.name || null,
    insight: item.insight,
    vibe_tags: item.vibe_tags,
    hidden_gem_badge: item.hidden_gem_badge?.label || null,
    experience_score: item.experience_score,
    price_range: formatPriceRange(item.price_range),
    community_rating: item.community_rating,
    review_count: item.review_count
  }));

  const userPayload = {
    city,
    country_code: cc,
    query,
    mood_text,
    dietary,
    interests,
    shortlist: shortlistSummary
  };

  if (USE_GPT && OPENAI_API_KEY) {
    const system = `You are VFIED's travel dining coach. Use the shortlist provided to confirm or refine which restaurants the traveler should prioritise. Return STRICT JSON:
{
  "success": true,
  "response": "Two short sentences that stitch the evening together",
  "recommendations": [
    {"name":"Restaurant","details":"Why it matches","price_range":"$-$$$$","hero_item":"Dish to order"}
  ],
  "quick_tips": ["emoji tip", "emoji tip"],
  "follow_up_questions": ["short question", "short question"]
}

Only recommend from the shortlist. Be specific about dishes and vibes. Keep the tone upbeat and concise.`;

    const user = JSON.stringify(userPayload);
    const coach = await gptChatJSON({ system, user, max_tokens: 650 });
    if (coach) return coach;
  }

  const picks = shortlist.slice(0, 3);
  if (!picks.length) {
    return {
      success: true,
      response: `Explore ${city}'s local markets and ask locals where they eat after work for the most authentic bites.`,
      recommendations: [],
      quick_tips: [
        '🎯 Follow the spots with loyal regulars',
        '💬 Ask what the team orders for staff meal'
      ],
      follow_up_questions: [
        'Want café or cocktail vibes next?',
        'Should we build a day plan as well?'
      ]
    };
  }

  const primary = picks[0];
  const primaryDish = primary.menu_samples?.[0]?.name;
  const secondary = picks[1];
  const responseParts = [
    `Start at ${primary.restaurant_name}${primaryDish ? ` for the ${primaryDish}` : ''}.`
  ];
  if (secondary) {
    responseParts.push(`Then drift to ${secondary.restaurant_name} to keep the energy going.`);
  }

  const recommendations = picks.map((item) => ({
    name: item.restaurant_name,
    details: item.insight,
    price_range: formatPriceRange(item.price_range),
    hero_item: item.menu_samples?.[0]?.name || null
  }));

  return {
    success: true,
    response: responseParts.join(' '),
    recommendations,
    quick_tips: [
      '🎯 Book ahead if you want prime seating',
      '💡 Mention you found them via VFIED for the warm intro'
    ],
    follow_up_questions: [
      'Need a dessert or nightcap spot?',
      'Should we add a daytime plan too?'
    ]
  };
}

export function setupTravelRoutes(app) {
  // Primary endpoint: Restaurant Discovery Shortlist
  app.post('/v1/travel/shortlist', async (req, res) => {
    const started = Date.now();

    try {
      const { value, error } = SHORTLIST_SCHEMA.validate(req.body || {});
      if (error) {
        return res.status(400).json({ success: false, error: error.message });
      }

      // Normalize location with geo-coordinates support
      const location = {
        city: String(value.location.city || 'London').trim(),
        country_code: String(value.location.country_code || 'GB').trim().slice(0, 2).toUpperCase(),
        latitude: value.location.latitude || value.location.lat,
        longitude: value.location.longitude || value.location.lng,
        neighborhood: value.location.neighborhood,
        search_radius_km: value.location.search_radius_km || 5,
        use_geo: Boolean(value.location.latitude && value.location.longitude)
      };

      const dietary = normalizeStringList(value.dietary).map((d) => d.toLowerCase());
      const attributeList = normalizeStringList(value.attributes);
      const interestList = normalizeStringList(value.interests);
      const vibeList = normalizeStringList(value.vibe_preferences);
      const attributes = [...new Set([...attributeList, ...interestList, ...vibeList])];

      // Get current time context for availability
      const now = new Date();
      const timeContext = Object.keys(value.time_context || {}).length
        ? value.time_context
        : {
            current_hour: now.getHours(),
            day_of_week: now.getDay(),
            is_weekend: [0, 6].includes(now.getDay())
          };

      const shortlistResult = await menuManager.shortlistRestaurants({
        location,
        mood_text: value.mood_text || '',
        dietary,
        attributes,
        limit: value.limit,
        per_restaurant_items: value.per_restaurant_items,
        sort_by: value.sort_by,
        timeContext,
        data_source: value.data_source,
        search_radius: location.search_radius_km
      });

      // Enrich restaurants with UI-ready data
      const enrichedShortlist = shortlistResult.shortlist.map(restaurant => {
        const availability = checkRestaurantAvailability(restaurant, timeContext);
        const distance = calculateDistanceDisplay(location, restaurant.location);

        return {
          ...restaurant,
          // Core display data
          hero_image: restaurant.hero_image || restaurant.media?.hero_image || restaurant.gallery?.[0] || null,
          gallery: restaurant.gallery || restaurant.media?.gallery || [],
          rating: restaurant.community_rating,
          review_count: restaurant.review_count,

          // Availability & status
          availability_status: availability.status,
          availability_label: availability.label,
          is_open_now: availability.is_open,
          opens_at: availability.opens_at,
          closes_at: availability.closes_at,

          // Location & distance
          distance_text: distance.text,
          distance_km: distance.km,
          address: restaurant.location?.address || `${restaurant.location?.city}`,

          // Tags for filtering/display
          cuisine_tags: [
            restaurant.cuisine_type,
            ...(restaurant.vibe_tags || [])
          ].filter(Boolean).slice(0, 5),

          // Menu preview
          featured_items: restaurant.menu_samples.slice(0, 3).map(item => ({
            name: item.name,
            description: item.description,
            price: item.price,
            emoji: item.emoji,
            image: item.image
          })),

          // Hidden gem indicator
          is_hidden_gem: Boolean(restaurant.hidden_gem_badge),
          gem_badge: restaurant.hidden_gem_badge,

          // Links
          booking_link: restaurant.primary_link,

          // Metadata
          price_range: restaurant.price_range || '££',
          data_source: restaurant.data_source
        };
      });

      let coach = null;
      if (value.include_coach) {
        const query = value.coach_query || value.mood_text || `Where should I eat in ${location.city}?`;
        coach = await buildCoachRecommendation({
          location,
          shortlist: enrichedShortlist,
          query,
          mood_text: value.mood_text || '',
          dietary,
          interests: interestList
        });
      }

      return res.json({
        success: true,
        city: location.city,
        country_code: location.country_code,
        user_location: location.use_geo ? {
          latitude: location.latitude,
          longitude: location.longitude
        } : null,
        restaurants: enrichedShortlist,
        coach,
        meta: {
          total_considered: shortlistResult.total_considered,
          total_restaurants: shortlistResult.total_restaurants,
          generation_time_ms: shortlistResult.generation_time_ms,
          data_source: value.data_source,
          server_time_ms: Date.now() - started,
          filters_applied: {
            dietary,
            attributes,
            has_geo: location.use_geo,
            search_radius_km: location.search_radius_km
          }
        }
      });
    } catch (err) {
      console.error('Travel shortlist error:', err);
      return res.status(500).json({ success: false, error: 'Failed to build travel shortlist' });
    }
  });

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

  // Restaurant Search Endpoint
  app.post('/v1/travel/restaurants/search', async (req, res) => {
    const started = Date.now();

    try {
      const {
        query = '',
        location = {},
        filters = {},
        limit = 20,
        sort_by = 'relevance'
      } = req.body;

      const normalizedLocation = {
        city: location.city || 'London',
        country_code: (location.country_code || 'GB').toUpperCase(),
        latitude: location.latitude || location.lat,
        longitude: location.longitude || location.lng,
        search_radius_km: location.search_radius_km || 10,
        use_geo: Boolean(location.latitude && location.longitude)
      };

      const searchResult = await menuManager.shortlistRestaurants({
        location: normalizedLocation,
        mood_text: query,
        dietary: filters.dietary || [],
        attributes: [
          ...(filters.cuisine_types || []),
          ...(filters.vibes || []),
          ...(filters.occasions || [])
        ],
        limit,
        per_restaurant_items: 3,
        sort_by,
        timeContext: filters.only_open_now ? {
          current_hour: new Date().getHours(),
          day_of_week: new Date().getDay()
        } : null,
        data_source: filters.data_source || 'hybrid',
        search_radius: normalizedLocation.search_radius_km
      });

      // Enrich with UI data
      const now = new Date();
      const timeContext = {
        current_hour: now.getHours(),
        day_of_week: now.getDay()
      };

      const results = searchResult.shortlist.map(restaurant => {
        const availability = checkRestaurantAvailability(restaurant, timeContext);
        const distance = calculateDistanceDisplay(normalizedLocation, restaurant.location);

        // Filter out closed restaurants if requested
        if (filters.only_open_now && !availability.is_open) {
          return null;
        }

        return {
          restaurant_id: restaurant.restaurant_id,
          restaurant_name: restaurant.restaurant_name,
          hero_image: restaurant.hero_image || restaurant.media?.hero_image,
          gallery: restaurant.gallery || restaurant.media?.gallery || [],
          rating: restaurant.community_rating,
          review_count: restaurant.review_count,
          cuisine_type: restaurant.cuisine_type,
          price_range: restaurant.price_range,
          distance_text: distance.text,
          distance_km: distance.km,
          availability_status: availability.status,
          availability_label: availability.label,
          is_open_now: availability.is_open,
          address: restaurant.location?.address || restaurant.location?.city,
          featured_items: restaurant.menu_samples.slice(0, 3),
          cuisine_tags: [restaurant.cuisine_type, ...(restaurant.vibe_tags || [])].filter(Boolean),
          is_hidden_gem: Boolean(restaurant.hidden_gem_badge),
          gem_badge: restaurant.hidden_gem_badge,
          booking_link: restaurant.primary_link
        };
      }).filter(Boolean); // Remove nulls from closed restaurants

      return res.json({
        success: true,
        restaurants: results,
        total_found: results.length,
        query,
        filters: filters,
        meta: {
          search_location: normalizedLocation,
          generation_time_ms: Date.now() - started
        }
      });

    } catch (error) {
      console.error('Restaurant search error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search restaurants'
      });
    }
  });

  // Nearby Restaurants Endpoint (Geo-focused)
  app.post('/v1/travel/restaurants/nearby', async (req, res) => {
    const started = Date.now();

    try {
      const {
        latitude,
        longitude,
        radius_km = 2,
        limit = 10,
        only_open_now = false,
        sort_by = 'distance'
      } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Latitude and longitude are required'
        });
      }

      const location = {
        latitude,
        longitude,
        search_radius_km: radius_km,
        use_geo: true,
        city: 'Nearby' // Will be overridden by actual data
      };

      const nearbyResult = await menuManager.shortlistRestaurants({
        location,
        limit: limit * 2, // Get more to filter
        per_restaurant_items: 3,
        sort_by: 'distance',
        data_source: 'hybrid',
        search_radius: radius_km
      });

      const now = new Date();
      const timeContext = {
        current_hour: now.getHours(),
        day_of_week: now.getDay()
      };

      const restaurants = nearbyResult.shortlist
        .map(restaurant => {
          const availability = checkRestaurantAvailability(restaurant, timeContext);
          const distance = calculateDistanceDisplay(location, restaurant.location);

          if (only_open_now && !availability.is_open) {
            return null;
          }

          return {
            restaurant_id: restaurant.restaurant_id,
            restaurant_name: restaurant.restaurant_name,
            hero_image: restaurant.hero_image || restaurant.media?.hero_image,
            rating: restaurant.community_rating,
            review_count: restaurant.review_count,
            cuisine_type: restaurant.cuisine_type,
            price_range: restaurant.price_range,
            distance_text: distance.text,
            distance_km: distance.km,
            availability_status: availability.status,
            availability_label: availability.label,
            is_open_now: availability.is_open,
            address: restaurant.location?.address,
            featured_items: restaurant.menu_samples.slice(0, 3),
            is_hidden_gem: Boolean(restaurant.hidden_gem_badge),
            gem_badge: restaurant.hidden_gem_badge,
            booking_link: restaurant.primary_link
          };
        })
        .filter(Boolean)
        .slice(0, limit);

      return res.json({
        success: true,
        restaurants,
        total_found: restaurants.length,
        user_location: { latitude, longitude, radius_km },
        meta: {
          generation_time_ms: Date.now() - started
        }
      });

    } catch (error) {
      console.error('Nearby restaurants error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find nearby restaurants'
      });
    }
  });

  // Travel coach endpoint (Restaurant-focused)
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

    // Get actual restaurant recommendations from the database
    try {
      const normalizedLocation = {
        city,
        country_code: cc,
        latitude: location.latitude || location.lat,
        longitude: location.longitude || location.lng,
        search_radius_km: location.search_radius_km || 5,
        use_geo: Boolean(location.latitude && location.longitude)
      };

      // Search for restaurants matching the query
      const restaurantResults = await menuManager.shortlistRestaurants({
        location: normalizedLocation,
        mood_text: query,
        dietary: context.dietary || [],
        attributes: context.interests || [],
        limit: 5,
        per_restaurant_items: 3,
        sort_by: 'relevance',
        data_source: 'hybrid',
        search_radius: normalizedLocation.search_radius_km
      });

      const now = new Date();
      const timeContext = {
        current_hour: now.getHours(),
        day_of_week: now.getDay()
      };

      // Format top 3 restaurant recommendations
      const topRestaurants = restaurantResults.shortlist.slice(0, 3).map(restaurant => {
        const availability = checkRestaurantAvailability(restaurant, timeContext);
        const distance = calculateDistanceDisplay(normalizedLocation, restaurant.location);

        return {
          restaurant_id: restaurant.restaurant_id,
          name: restaurant.restaurant_name,
          hero_image: restaurant.hero_image || restaurant.media?.hero_image,
          details: restaurant.insight || `Known for ${restaurant.menu_samples[0]?.name || 'authentic cuisine'}`,
          price_range: restaurant.price_range,
          rating: restaurant.community_rating,
          review_count: restaurant.review_count,
          location: restaurant.location?.neighborhood || restaurant.location?.city,
          distance_text: distance.text,
          availability_label: availability.label,
          is_open_now: availability.is_open,
          hero_item: restaurant.menu_samples[0]?.name,
          cuisine_type: restaurant.cuisine_type,
          hidden_gem_badge: restaurant.hidden_gem_badge,
          booking_link: restaurant.primary_link
        };
      });

      // Use GPT to craft personalized response around these restaurants
      if (USE_GPT && OPENAI_API_KEY && topRestaurants.length > 0) {
        const system = `You are VFIED's restaurant discovery coach. You recommend SPECIFIC restaurants from the provided list.

Return STRICT JSON:
{
  "success": true,
  "response": "2-3 sentences connecting their question to these specific restaurants",
  "restaurants": [use the provided restaurant objects],
  "quick_tips": ["🎯 actionable tip", "💡 insider tip"],
  "follow_up_questions": ["related question"]
}

Be warm, specific, and reference the actual restaurants by name. Mention standout dishes.`;

        const user = `User asks: "${query}" in ${city}.

Available restaurants:
${topRestaurants.map(r => `- ${r.name} (${r.cuisine_type}, ${r.price_range}) - ${r.hero_item || r.details}`).join('\n')}

Create a response that answers their question using these specific restaurants.`;

        const gptResult = await gptChatJSON({ system, user, max_tokens: 600 });

        if (gptResult) {
          return res.json({
            ...gptResult,
            restaurants: topRestaurants // Use actual restaurant data
          });
        }
      }

      // Fallback with actual restaurant data
      const responseText = topRestaurants.length > 0
        ? `For "${query}" in ${city}, I'd recommend ${topRestaurants[0].name}${topRestaurants[0].hero_item ? ` for their ${topRestaurants[0].hero_item}` : ''}. ${topRestaurants.length > 1 ? `Also check out ${topRestaurants[1].name} nearby.` : ''}`
        : `Looking for spots matching "${query}" in ${city}. Try exploring ${city}'s local neighborhoods or markets for authentic finds.`;

      res.json({
        success: true,
        response: responseText,
        restaurants: topRestaurants,
        quick_tips: [
          '🎯 Check if reservations are needed',
          '⏰ Visit during off-peak hours for better service',
          '💡 Ask staff for their personal recommendations'
        ],
        follow_up_questions: [
          'Want to see more hidden gems nearby?',
          'Should I find similar places in a different neighborhood?'
        ]
      });

    } catch (error) {
      console.error('Coach endpoint error:', error);

      // Final fallback
      res.json({
        success: true,
        response: `For "${query}" in ${city}, explore neighborhoods where locals eat. Skip tourist areas and look for busy spots.`,
        restaurants: [],
        quick_tips: [
          '🎯 Ask locals where they eat',
          '⏰ Best finds during lunch hours',
          '💡 Busy spots mean authentic food'
        ],
        follow_up_questions: [
          'What neighborhoods have the best food scene?',
          'Any specific cuisine you're craving?'
        ]
      });
    }
  });
}
