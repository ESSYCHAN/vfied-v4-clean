# CURL Test Commands for VFIED API

Copy and paste these commands into your terminal to test each endpoint.

---

## 1️⃣ Test Travel Coach (What you see in the modal)

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/coach \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "dinner in London",
    "location": {
      "city": "London",
      "country_code": "GB"
    }
  }' | python3 -m json.tool
```

**Expected Result:**
- `"success": true`
- `"response": "AI text mentioning Dishoom, No60, etc."`
- `"restaurants": [...]` array with real restaurant objects
- Restaurant names: "Dishoom Covent Garden", "No60 Brasserie", etc.

---

## 2️⃣ Test Food Quick Decision (Food tab - "Decide for Me")

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/quick_decision \
  -H 'Content-Type: application/json' \
  -d '{
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "mood_text": "hungry",
    "dietary": []
  }' | python3 -m json.tool
```

**Expected Result:**
- `"success": true`
- `"decisions": [...]` array with **6 menu items** (not 2!)
- Items from different restaurants (Dishoom, No60, Brags & Brams, etc.)
- Each item has `"restaurant": { "name": "..." }`

**Note:** Adding `"time_context": {"meal_period": "dinner"}` will filter results to dinner-appropriate items only. Omit for maximum variety.

---

## 3️⃣ Count How Many Restaurants Are in Firebase

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/restaurants/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "",
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "limit": 20
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); restaurants=set([r.get('restaurant_id') for r in data.get('shortlist', [])]); print(f'Unique restaurants: {len(restaurants)}'); [print(f'  - {r.get(\"restaurant_name\")} ({r.get(\"cuisine_type\")})') for r in data.get('shortlist', [])[:10]]"
```

**Expected Result:**
- Should show 6-9 unique restaurants
- Names like: Dishoom, No60 Brasserie, Brags & Brams, CANTO 73, The Breakfast Club

---

## 4️⃣ Test Travel Shortlist (Used by Travel tab)

```bash
curl -X POST https://vfied-v4-clean.onrender.com/v1/travel/shortlist \
  -H 'Content-Type: application/json' \
  -d '{
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "mood_text": "dinner",
    "limit": 5
  }' | python3 -m json.tool | head -100
```

**Expected Result:**
- `"success": true`
- `"shortlist": [...]` with restaurant cards
- Each has: `hero_image`, `rating`, `availability_label`, `distance_text`, `booking_link`

---

## 5️⃣ Quick Check - Just List Restaurant Names

```bash
curl -s -X POST https://vfied-v4-clean.onrender.com/v1/travel/coach \
  -H 'Content-Type: application/json' \
  -d '{"query":"dinner","location":{"city":"London","country_code":"GB"}}' \
  | python3 -c "import sys, json; data=json.load(sys.stdin); [print(f'{i+1}. {r[\"name\"]}') for i, r in enumerate(data.get('restaurants', []))]"
```

**Expected Output:**
```
1. Dishoom Covent Garden
2. No60 Brasserie
3. Brags & Brams
```

**NOT:**
```
1. Fish and Chips
2. Pint of Ale
```

---

## 6️⃣ Check Food Tab Results Count

```bash
curl -s -X POST https://vfied-v4-clean.onrender.com/v1/quick_decision \
  -H 'Content-Type: application/json' \
  -d '{"location":{"city":"London","country_code":"GB"},"mood_text":""}' \
  | python3 -c "import sys, json; data=json.load(sys.stdin); decisions=data.get('decisions', []); print(f'Food items returned: {len(decisions)}'); [print(f'  {i+1}. {d[\"name\"]} from {d.get(\"restaurant\", {}).get(\"name\", \"?\")}') for i, d in enumerate(decisions)]"
```

**Expected Output:**
```
Food items returned: 6
  1. House Black Daal from Dishoom Covent Garden
  2. Buttermilk Pancakes from The Breakfast Club Soho
  3. Sea Bass Fillet from No60 Brasserie
  4. [etc... 6 items total]
```

**NOT:**
```
Food items returned: 2
```

---

## 🎯 Run All Tests at Once

```bash
./TEST_API_ENDPOINTS.sh
```

Or if not executable:
```bash
bash TEST_API_ENDPOINTS.sh
```

---

## 🐛 Debugging Tips

If results are wrong:

1. **Check if Render deployed:** Visit https://dashboard.render.com/web/srv-xxx (your service)
2. **Check deploy logs:** Look for errors during build
3. **Hard refresh browser:** Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)
4. **Clear service worker:** DevTools → Application → Service Workers → Unregister
5. **Test on different device:** Try on phone or incognito window

---

## ✅ What "Good" Results Look Like

### Travel Coach Response:
```json
{
  "success": true,
  "response": "For dinner in London, I recommend Dishoom...",
  "restaurants": [
    {
      "restaurant_id": "dishoom_covent_garden",
      "name": "Dishoom Covent Garden",
      "cuisine_type": "indian",
      "hero_item": "House Black Daal",
      "booking_link": {...}
    }
  ]
}
```

### Food Decision Response:
```json
{
  "success": true,
  "decisions": [
    {
      "name": "House Black Daal",
      "restaurant": {
        "name": "Dishoom Covent Garden"
      }
    },
    // ... 5 more items (6 total)
  ]
}
```
