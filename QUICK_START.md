# 🚀 Quick Start - Your Enhanced Travel Tab

## ✨ What We Built

Your **Travel tab** is now a fully-featured **Restaurant Discovery Hub** with:

✅ Beautiful restaurant cards (photos, ratings, distance, availability)
✅ Geo-based "near me" search
✅ Smart filtering (dietary, vibes, occasions)
✅ Hidden gem detection
✅ AI coach recommendations
✅ Real-time availability checking

---

## 🎯 Test It Right Now

### **1. Start Your Server**

```bash
cd /Users/esthermulwa/vfied-v4
node server/app.js
```

### **2. Try the API**

**Get breakfast spots in London:**
```bash
curl -X POST http://localhost:3048/v1/travel/shortlist \
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

**Find restaurants near you (with geo-location):**
```bash
curl -X POST http://localhost:3048/v1/travel/restaurants/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 51.5074,
    "longitude": -0.1278,
    "radius_km": 2,
    "only_open_now": true,
    "limit": 10
  }'
```

**Ask the coach:**
```bash
curl -X POST http://localhost:3048/v1/travel/coach \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Where should I take my parents for Sunday lunch?",
    "location": {
      "city": "London",
      "country_code": "GB"
    }
  }'
```

---

## 📱 Connect Your Frontend

### **Sample React Component**

```jsx
import { useState, useEffect } from 'react';

function RestaurantFeed() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRestaurants = async () => {
    setLoading(true);

    // Get user's location
    navigator.geolocation.getCurrentPosition(async (position) => {
      const response = await fetch('/v1/travel/shortlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: {
            city: 'London',
            country_code: 'GB',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            search_radius_km: 5
          },
          mood_text: 'cozy dinner',
          limit: 10,
          sort_by: 'distance',
          include_coach: true
        })
      });

      const data = await response.json();
      setRestaurants(data.restaurants);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  return (
    <div className="restaurant-feed">
      {loading && <div>Finding restaurants...</div>}

      {restaurants.map((restaurant) => (
        <div key={restaurant.restaurant_id} className="restaurant-card">
          {/* Hero Image */}
          {restaurant.hero_image && (
            <img src={restaurant.hero_image} alt={restaurant.restaurant_name} />
          )}

          {/* Name & Rating */}
          <h3>{restaurant.restaurant_name}</h3>
          {restaurant.rating && (
            <div className="rating">
              ⭐ {restaurant.rating} ({restaurant.review_count} reviews)
            </div>
          )}

          {/* Cuisine Tags */}
          <div className="tags">
            {restaurant.cuisine_tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>

          {/* Availability */}
          <div className={`availability ${restaurant.availability_status}`}>
            {restaurant.availability_label}
          </div>

          {/* Distance */}
          <div className="distance">📍 {restaurant.distance_text}</div>

          {/* Hidden Gem Badge */}
          {restaurant.gem_badge && (
            <div className="gem-badge" style={{ color: restaurant.gem_badge.color }}>
              {restaurant.gem_badge.emoji} {restaurant.gem_badge.label}
            </div>
          )}

          {/* Featured Items */}
          <div className="menu-samples">
            <h4>Featured Items:</h4>
            {restaurant.featured_items.map((item, idx) => (
              <div key={idx} className="menu-item">
                <span>{item.emoji} {item.name}</span>
                <span className="price">{item.price}</span>
              </div>
            ))}
          </div>

          {/* Booking Link */}
          {restaurant.booking_link && (
            <a href={restaurant.booking_link.url} className="cta-button">
              {restaurant.booking_link.label}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🎨 Sample Data Available

You have 4 restaurants already loaded:

1. **Dishoom** (Covent Garden)
   - Indian, Cocktails, Date Night
   - Rating: 4.8 ⭐
   - Famous for: Bacon Naan Roll

2. **The Laughing Heart** (Hackney)
   - Wine Bar, Small Plates, European
   - Rating: 4.9 ⭐
   - 💎 Hidden Gem

3. **Bright** (Hackney)
   - British, Seasonal
   - Rating: 4.7 ⭐
   - 💎 Hidden Gem

4. **Padella** (Borough Market)
   - Italian, Pasta
   - Rating: 4.6 ⭐
   - Famous for: Pici Cacio e Pepe

---

## 🔧 API Endpoints

### **Main Endpoints:**

| Endpoint | Purpose | Key Features |
|----------|---------|-------------|
| `/v1/travel/shortlist` | **Primary discovery** | Photos, ratings, distance, availability, menu samples |
| `/v1/travel/restaurants/search` | Advanced filtering | Search by query, cuisine, vibes, dietary |
| `/v1/travel/restaurants/nearby` | Geo-based | Find what's around you (requires lat/lng) |
| `/v1/travel/coach` | AI recommendations | Get personalized restaurant suggestions |

### **Filters Available:**

- **Location:** City, country, lat/lng, radius
- **Dietary:** Vegetarian, vegan, gluten-free, halal, dairy-free
- **Vibes:** Wine Bar, Casual, Romantic, Date Night, etc.
- **Occasions:** Weekend Brunch, Business Lunch, Family Dinner
- **Availability:** Only show open restaurants
- **Sort:** Relevance, distance, hidden gems

---

## 📊 Response Data Structure

Every restaurant card includes:

```typescript
{
  restaurant_id: string;
  restaurant_name: string;

  // Visual
  hero_image: string | null;
  gallery: string[];

  // Social proof
  rating: number | null;        // 0-5
  review_count: number | null;

  // Availability
  availability_status: 'open' | 'closing_soon' | 'closed' | 'unknown';
  availability_label: string;   // "Available now" | "Opens at 17:00"
  is_open_now: boolean | null;

  // Location
  distance_text: string;        // "1.2km away"
  distance_km: number | null;
  address: string;

  // Tags
  cuisine_tags: string[];       // ["Indian", "Cocktails", "Date Night"]
  cuisine_type: string;
  price_range: string;          // "££"

  // Menu preview
  featured_items: [
    {
      name: string;
      description: string;
      price: string;
      emoji: string;
      image: string | null;
    }
  ];

  // Hidden gem
  is_hidden_gem: boolean;
  gem_badge: {
    emoji: string;              // 💎 | 🏆 | ⭐
    label: string;              // "Hidden Gem" | "Legendary Find"
    color: string;              // "#9B59B6"
  } | null;

  // Booking
  booking_link: {
    url: string;
    type: 'reservation' | 'delivery' | 'website' | 'map';
    label: string;              // "Book a Table" | "Order on Deliveroo"
  } | null;
}
```

---

## 🌐 API Documentation

**View interactive docs:**

```bash
# Method 1: OpenAPI spec is served at
http://localhost:3048/openapi.json

# Method 2: View in Redoc
npx @redocly/cli preview-docs http://localhost:3048/openapi.json

# Method 3: Import into Postman
# Just paste: http://localhost:3048/openapi.json
```

---

## 🎯 What's Different from Before?

### **Before:**
```json
{
  "shortlist": [
    {
      "restaurant_name": "Some Place",
      "menu_samples": ["Dish 1", "Dish 2"]
    }
  ]
}
```

### **After (New!):**
```json
{
  "restaurants": [
    {
      "restaurant_name": "Dishoom",
      "hero_image": "https://...",           // ⭐ NEW
      "rating": 4.8,                         // ⭐ NEW
      "review_count": 3247,                  // ⭐ NEW
      "availability_label": "Available now", // ⭐ NEW
      "is_open_now": true,                   // ⭐ NEW
      "distance_text": "1.2km away",         // ⭐ NEW
      "cuisine_tags": ["Indian", "Cocktails"], // ⭐ NEW
      "gem_badge": {...},                    // ⭐ NEW
      "featured_items": [...],               // Enhanced
      "booking_link": {...}                  // ⭐ NEW
    }
  ]
}
```

---

## 📚 Documentation Files

- **[TRAVEL_TAB_OPTIMIZATION.md](TRAVEL_TAB_OPTIMIZATION.md)** - Complete technical guide
- **[HOW_TO_USE_OPENAPI.md](HOW_TO_USE_OPENAPI.md)** - OpenAPI schema usage
- **[openapi-travel-updated.json](openapi-travel-updated.json)** - API specification
- **[add-sample-restaurants-rich.js](add-sample-restaurants-rich.js)** - Sample data script

---

## 🚀 Next Steps

1. ✅ **Test the API** (see commands above)
2. ✅ **Import into Postman** (http://localhost:3048/openapi.json)
3. ✅ **Connect your frontend** (use sample React code)
4. ✅ **Add more restaurants** (run add-sample-restaurants-rich.js)
5. ✅ **Enable geolocation** in your app (for distance calculation)

---

## 💡 Tips

- **Use geo-coordinates** when possible for accurate distance
- **Enable "open now" filter** for better UX
- **Sort by "hidden_gem"** to surface local favorites
- **Cache results** in frontend to reduce API calls
- **Show loading states** while fetching

---

**Your restaurant discovery hub is ready! 🎉**

Start building that beautiful UI with rich restaurant cards!
