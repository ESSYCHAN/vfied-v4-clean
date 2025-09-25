// events.js - Events-related endpoints and functionality

import Joi from 'joi';
import { randomUUID } from 'crypto';

// Environment variables
const USE_EVENTS_PROVIDER = String(process.env.USE_EVENTS_PROVIDER || '').toLowerCase() === 'true';
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN || '';
const EVENTS_CACHE_TTL = parseInt(process.env.EVENTS_CACHE_TTL || '10800', 10); // 3h
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const USE_GPT = ['true', '1', 'yes', 'on'].includes(String(process.env.USE_GPT || process.env.VITE_USE_GPT || '').toLowerCase().trim());
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const EVENTS_SCHEMA = Joi.object({
  city: Joi.string().default('London'),
  country_code: Joi.string().length(2).uppercase().default('GB'),
  category: Joi.string().valid('all','food','music','market','culture','nightlife').default('all'),
  time: Joi.string().valid('today','tomorrow','weekend','this_week').default('today')
});

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

// Eventbrite helpers
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

  // keywords to help "market" / "nightlife"
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

// GPT enrichment (optional, batched)
async function gptEnrichEvents(vfiedEvents, city, cc) {
  if (!USE_GPT || !OPENAI_API_KEY || !vfiedEvents?.length) return vfiedEvents;

  const system = `You are VFIED, a concise food & culture coach. 
Given a list of events, add a short foodie context.
Return STRICT JSON:
{"events":[{"id":"...","explanation":"1 sentence why it's good for food lovers","food_pairing":"1 short phrase","vibe":"1-3 words"}]}`;
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

// Event storage (in production, use a database)
export const submittedEvents = [];

// User profiles
export const userProfiles = [];

// =====================================================
// AUTO-APPROVAL AI SYSTEM
// =====================================================

export class EventAutoModerator {
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

export function setupEventsRoutes(app, upload) {
  // Live Events with Eventbrite + GPT enrichment + curated fallback
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

      // Cache first
      const key = cacheKey(city, cc, category, time);
      const cached = getCache(key);
      if (cached) {
        return res.json({ success: true, events: cached, from: 'cache', processingTimeMs: Date.now() - t0 });
      }

      let vfiedEvents = [];

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

      // 1) Try Eventbrite (if enabled)
      if (USE_EVENTS_PROVIDER && EVENTBRITE_TOKEN) {
        try {
          const ebEvents = await fetchEventbriteEvents(city, cc, category, time);
          const eventbriteEvents = (ebEvents || [])
            .filter(e => !!e && e.status !== 'canceled')
            .slice(0, 8)
            .map(e => toVFIEDEvent(e, city, cc, whenLabel, detectTag(e, category)));
          vfiedEvents = [...vfiedEvents, ...eventbriteEvents];
        } catch (e) {
          console.warn('[events] Eventbrite fetch failed:', e.message);
        }
      }

      // 2) If not enough events, use curated pools
      if (vfiedEvents.length < 3) {
        const pool = getEventPool(cc);
        const curatedEvents = pool.slice(0, 6 - vfiedEvents.length).map((e, idx) => ({
          id: `${cc}-curated-${idx + 1}`,
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
        
        vfiedEvents = [...vfiedEvents, ...curatedEvents];
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
          const placeResponse = await fetch(`http://localhost:${process.env.PORT}/v1/places/details/${place_id}`);
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

  // Admin stats
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

  // User registration
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

  // User login
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

  // Google Places search
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
}