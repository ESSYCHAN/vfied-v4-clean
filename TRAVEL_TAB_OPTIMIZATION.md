# Travel Tab Optimization - Restaurant Discovery Hub

## 🎯 Overview

The Travel tab has been refactored from a mixed travel planning/food discovery tool into a **dedicated Restaurant Discovery Hub**. This gives users a beautiful, filterable interface to find restaurants based on mood, location, vibes, and dietary preferences.

---

## ✨ What's New

### **1. Enhanced `/v1/travel/shortlist` Endpoint**

**Primary restaurant discovery endpoint** with rich UI-ready data:

**Request:**
```json
{
  "location": {
    "city": "London",
    "country_code": "GB",
    "latitude": 51.5074,      // Optional for geo-based search
    "longitude": -0.1278,
    "search_radius_km": 5     // Default: 5km
  },
  "mood_text": "cozy date night",
  "dietary": ["vegetarian"],
  "attributes": ["romantic", "hidden_gem"],
  "vibe_preferences": ["Wine Bar", "Small Plates"],
  "limit": 5,
  "per_restaurant_items": 3,
  "sort_by": "relevance",  // or "distance", "hidden_gem"
  "data_source": "hybrid",  // "hybrid", "firebase", or "local"
  "include_coach": true
}
```

**Response:**
```json
{
  "success": true,
  "city": "London",
  "country_code": "GB",
  "user_location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  },
  "restaurants": [
    {
      "restaurant_id": "the_laughing_heart",
      "restaurant_name": "The Laughing Heart",

      // Visual data for cards
      "hero_image": "https://...",
      "gallery": ["https://...", "https://..."],
      "rating": 4.9,
      "review_count": 856,

      // Availability
      "availability_status": "open",
      "availability_label": "Available now",
      "is_open_now": true,
      "opens_at": "17:00",
      "closes_at": "23:00",

      // Location & distance
      "distance_text": "1.2km away",
      "distance_km": 1.2,
      "address": "277 Hackney Road, London E2 8NA",

      // Tags for filtering
      "cuisine_tags": ["Wine Bar", "Small Plates", "European", "Natural Wine", "Romantic"],
      "cuisine_type": "european",
      "price_range": "£££",

      // Menu preview
      "featured_items": [
        {
          "name": "Sourdough Toast",
          "description": "With cultured butter",
          "price": "£6.00",
          "emoji": "🍞",
          "image": null
        },
        {
          "name": "Eggs Benedict",
          "description": "Poached eggs, hollandaise",
          "price": "£12.00",
          "emoji": "🥚",
          "image": null
        },
        {
          "name": "Burrata",
          "description": "Heirloom tomatoes, basil",
          "price": "£14.00",
          "emoji": "🧀",
          "image": null
        }
      ],

      // Hidden gem indicator
      "is_hidden_gem": true,
      "gem_badge": {
        "emoji": "💎",
        "label": "Hidden Gem",
        "color": "#9B59B6"
      },

      // Booking/link
      "booking_link": {
        "url": "https://...",
        "type": "reservation",
        "label": "Book a Table"
      },

      "data_source": "firebase"
    }
  ],
  "coach": {
    "success": true,
    "response": "For cozy date night in London, I'd recommend The Laughing Heart for their Burrata. Also check out Bright nearby.",
    "restaurants": [...],  // Same format as above
    "quick_tips": ["🎯 Check if reservations are needed", "💡 Ask staff for recommendations"],
    "follow_up_questions": ["Want to see more hidden gems nearby?"]
  },
  "meta": {
    "total_considered": 50,
    "total_restaurants": 12,
    "generation_time_ms": 234,
    "data_source": "hybrid",
    "server_time_ms": 456,
    "filters_applied": {
      "dietary": ["vegetarian"],
      "attributes": ["romantic", "hidden_gem"],
      "has_geo": true,
      "search_radius_km": 5
    }
  }
}
```

---

### **2. New `/v1/travel/restaurants/search` Endpoint**

**Advanced search with filters:**

```json
{
  "query": "best pasta in London",
  "location": {
    "city": "London",
    "country_code": "GB",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "search_radius_km": 10
  },
  "filters": {
    "dietary": ["vegetarian"],
    "cuisine_types": ["Italian"],
    "vibes": ["Casual", "Date Night"],
    "occasions": ["Weekend Brunch"],
    "only_open_now": true,
    "data_source": "hybrid"
  },
  "limit": 20,
  "sort_by": "relevance"
}
```

**Returns:** Same rich restaurant objects as shortlist

---

### **3. New `/v1/travel/restaurants/nearby` Endpoint**

**Geo-focused "what's around me":**

```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "radius_km": 2,
  "limit": 10,
  "only_open_now": true,
  "sort_by": "distance"
}
```

**Returns:** Restaurants sorted by distance with availability status

---

### **4. Enhanced `/v1/travel/coach` Endpoint**

**Now returns actual restaurant recommendations instead of generic advice:**

```json
{
  "query": "Where should I take my parents for Sunday lunch?",
  "location": {
    "city": "London",
    "country_code": "GB"
  },
  "context": {
    "dietary": [],
    "interests": ["traditional", "family-friendly"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "For Sunday lunch with your parents in London, I'd recommend Bright for their Full English. Also check out Dishoom nearby.",
  "restaurants": [
    {
      "restaurant_id": "bright_hackney",
      "name": "Bright",
      "hero_image": "https://...",
      "details": "Known for Full English",
      "price_range": "£££",
      "rating": 4.7,
      "review_count": 412,
      "location": "Hackney",
      "distance_text": "2.1km away",
      "availability_label": "Available now",
      "is_open_now": true,
      "hero_item": "Full English",
      "cuisine_type": "british",
      "hidden_gem_badge": {...},
      "booking_link": {...}
    }
  ],
  "quick_tips": [
    "🎯 Check if reservations are needed",
    "⏰ Visit during off-peak hours for better service"
  ],
  "follow_up_questions": [
    "Want to see more hidden gems nearby?",
    "Should I find similar places in a different neighborhood?"
  ]
}
```

---

## 🎨 UI/UX Improvements

### **Restaurant Cards Now Include:**

1. **Hero image** + gallery
2. **Restaurant name** + **star rating** (e.g., "4.8 ⭐")
3. **Review count** (e.g., "3,247 reviews")
4. **Cuisine tags** (e.g., "Indian • Cocktails • Date Night")
5. **Availability badge** ("Available now" / "Closed" / "Opens at 17:00")
6. **Distance indicator** ("1.2km away")
7. **Featured menu items** (3 dishes with prices)
8. **Price range** ("££" / "£££")
9. **Hidden gem badge** (💎 Hidden Gem / 🏆 Legendary Find)
10. **Booking link** (with smart routing to Deliveroo/website/maps)

---

## 📍 Location System Improvements

### **Unified Location Object:**

```javascript
{
  // Core identifiers
  city: "London",
  country_code: "GB",  // ISO 3166-1 alpha-2

  // Geo coordinates (optional but preferred)
  coordinates: {
    latitude: 51.5074,
    longitude: -0.1278
  },

  // Refinement
  neighborhood: "Soho",
  address: "12 Upper St Martin's Lane",

  // Search config
  search_radius_km: 5,  // default 5km
  use_geo: true         // prefer geo over city match
}
```

### **Distance Calculation:**

- **< 1km:** "850m away"
- **1-10km:** "2.3km away"
- **> 10km:** "15km away"
- **No coords:** Fallback to city/neighborhood name

---

## ⏰ Opening Hours & Availability

### **Status Labels:**

- `open` → "Available now"
- `closing_soon` → "Closing soon" (< 1 hour)
- `closed` → "Opens at 17:00"
- `unknown` → "Hours not available"

### **Opening Hours Format:**

```json
{
  "monday": { "open": "08:00", "close": "23:00" },
  "tuesday": { "open": "08:00", "close": "23:00" },
  "wednesday": "closed",
  ...
}
```

---

## 💎 Hidden Gem Scoring

**Automatic scoring based on:**

1. **Limited availability** (weekends only, seasonal, chef special)
2. **Small batch items** (daily limit < 20)
3. **Recipe tags** (family recipe, traditional, secret recipe)
4. **Restaurant goals** (not seeking visibility = hidden gem)
5. **Ratings vs reviews** (high rating but < 25 reviews = undiscovered)
6. **Media presence** (photos = curated experience)

**Badge Tiers:**

- **90+:** 🏆 Legendary Find (#FFD700)
- **70-89:** 💎 Hidden Gem (#9B59B6)
- **50-69:** ⭐ Local Favorite (#3498DB)
- **30-49:** 🔍 Worth Discovering (#95A5A6)

---

## 🗂️ Sample Restaurants Added

1. **Dishoom** (Covent Garden) - Indian, Cocktails, Date Night
2. **The Laughing Heart** (Hackney) - Wine Bar, Small Plates, Hidden Gem
3. **Bright** (Hackney) - British, Seasonal, Hidden Gem
4. **Padella** (Borough Market) - Italian, Pasta, Casual

Each includes:
- Hero images from Unsplash
- Opening hours
- 3 menu samples
- Ratings & reviews
- Vibe tags
- Geo-coordinates

---

## 📊 Data Sources

### **Hybrid Mode (Default):**

- **Primary:** Firebase (partner restaurants with fresh data)
- **Fallback:** Local JSON (static menu data)
- **Merge strategy:** Firebase takes priority, local fills gaps

### **Firebase Only:**

- Real-time partner restaurant data
- User-submitted events
- Dynamic menu updates

### **Local Only:**

- Static fallback data
- Works offline
- Fast response times

---

## 🔄 Migration from Old Structure

### **Before:**
```
Travel Tab = restaurant discovery + travel plans + food crawls + city guides
Food Tab = menu item recommendations
Events Tab = event discovery
```

### **After:**
```
Travel Tab = RESTAURANT DISCOVERY (rich cards, filters, geo-search)
Food Tab = MENU ITEM DISCOVERY ("what should I eat now")
Events Tab = COMMUNITY EVENTS (curated + user-submitted)
```

---

## 🚀 Next Steps

### **To fully integrate with UI:**

1. **Update frontend to call new endpoints:**
   - Use `/v1/travel/shortlist` for main feed
   - Use `/v1/travel/restaurants/nearby` for geo-based "around me"
   - Use `/v1/travel/coach` for conversational Q&A

2. **Implement filters UI:**
   - Cuisine type dropdowns
   - Vibe tags (multi-select)
   - Price range slider
   - "Open now" toggle
   - Distance radius slider

3. **Add restaurant detail view:**
   - Full gallery
   - Complete menu
   - Opening hours table
   - Map integration
   - Booking CTA

4. **Enable geolocation:**
   - Request browser location
   - Use navigator.geolocation
   - Pass lat/lng to API
   - Show "Use my location" button

---

## 📝 Example API Calls

### **Default browsing (no location):**

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/shortlist \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "mood_text": "breakfast",
    "limit": 5
  }'
```

### **Geo-based discovery:**

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/restaurants/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 51.5074,
    "longitude": -0.1278,
    "radius_km": 2,
    "only_open_now": true,
    "limit": 10
  }'
```

### **Coach question:**

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/coach \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best brunch spots for a group?",
    "location": {
      "city": "London",
      "country_code": "GB"
    }
  }'
```

---

## ✅ Completed Features

- [x] Refactored Travel routes to focus on restaurant discovery
- [x] Created unified location validation with geo-coordinates
- [x] Added geo-location filtering to menuManager
- [x] Enhanced coach endpoint to return actual restaurants
- [x] Added rich metadata (photos, ratings, distance, availability)
- [x] Created restaurant search and nearby endpoints
- [x] Added sample restaurants with photos and rich data
- [ ] Update OpenAPI spec to reflect new structure

---

## 🎯 Result

**You now have a beautiful restaurant discovery experience matching your screenshot:**

- ✅ Restaurant cards with hero images
- ✅ Star ratings + review counts
- ✅ "Available now" status badges
- ✅ Distance indicators
- ✅ Cuisine tags (Indian, Cocktails, Date Night, etc.)
- ✅ Featured menu items with prices
- ✅ Hidden gem badges
- ✅ Favorite/bookmark support (via API)
- ✅ Geo-based "nearby" search
- ✅ Smart filtering (dietary, vibes, occasions)
- ✅ Coach integration for personalized advice

The API is ready - just connect your frontend! 🚀
