# Expected Travel Coach Output

## What You SHOULD See

When you click "Ask Coach" on the Travel tab with query like "dinner in London", you should see:

---

### 🍽️ Your Travel Food Coach

**Response from AI:**
> "For a delightful dinner in London, I recommend **Dishoom Covent Garden**, where you can savor their renowned House Black Daal. Alternatively, **No60 Brasserie** in Newington Green offers fantastic Mediterranean dishes like Sea Bass Fillet in a cozy atmosphere."

---

### Restaurant Card 1: **Dishoom Covent Garden**

```
🍛 Dishoom Covent Garden
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 Worth Discovering

Details: House Black Daal • 24-hour slow-cooked black lentils, rich and creamy

📍 Covent Garden, London
⭐ 4.8 rating
££ Price Range
🍛 Indian Cuisine

✅ Available now
Opens at: 08:00

[Book Now on Deliveroo] →
```

---

### Restaurant Card 2: **No60 Brasserie**

```
🥗 No60 Brasserie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Details: Sea Bass Fillet with portobello mushroom risotto

📍 Newington Green, London
££ Price Range
🥗 Mediterranean Cuisine

✅ Available now
Opens at: 08:00

[View on Map] →
```

---

### Restaurant Card 3: **Brags & Brams**

```
🍳 Brags & Brams
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Details: Rigatoni with feta, chilli pepper, onions, parsley

📍 Hackney Road, London
££ Price Range
🍔 American Cuisine

⏰ Opens at 09:00

[View on Map] →
```

---

## What You're Currently Seeing (WRONG!)

```
❌ Fish and Chips - Generic fallback
❌ Pint of Ale - Generic fallback
❌ Street Tacos - Generic fallback
```

These are **NOT real restaurants** - they're placeholder/demo data that shouldn't be showing!

---

## API Response Format

The backend `/v1/travel/coach` API is correctly returning:

```json
{
  "success": true,
  "response": "AI-generated personalized message...",
  "restaurants": [
    {
      "restaurant_id": "dishoom_covent_garden",
      "name": "Dishoom Covent Garden",
      "details": "House Black Daal • 24-hour slow-cooked black lentils...",
      "hero_item": "House Black Daal",
      "cuisine_type": "indian",
      "price_range": "moderate",
      "rating": 4.8,
      "location": "Covent Garden",
      "distance_text": "London",
      "availability_label": "Available now",
      "is_open_now": true,
      "booking_link": {
        "url": "https://deliveroo.co.uk/menu/dishoom-covent-garden",
        "type": "delivery",
        "label": "Order on Deliveroo"
      },
      "hidden_gem_badge": {
        "emoji": "🔍",
        "label": "Worth Discovering",
        "color": "#95A5A6"
      }
    }
  ],
  "quick_tips": [...],
  "follow_up_questions": [...]
}
```

## The Problem

Your **frontend is NOT using this data** - it's showing hardcoded/fallback content instead.

The issue is likely:
1. Frontend not calling the right endpoint
2. Frontend ignoring API response and using cached data
3. Service Worker serving old cached response
4. Modal code has hardcoded demo data
