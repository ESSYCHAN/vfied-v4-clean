# 🔧 Fix: Show Restaurant Names in Food Tab

## 🐛 Problem

Your "DECIDE FOR ME" feature shows menu items (House Black Daal, Buttermilk Pancakes) but **doesn't show which restaurant** they're from!

## ✅ Solution

The API **already returns** the restaurant info - your frontend just isn't displaying it!

---

## 📊 Current API Response

When you call `/v1/quick_decision`, you get:

```json
{
  "success": true,
  "decisions": [
    {
      "name": "House Black Daal",
      "emoji": "🍛",
      "explanation": "24-hour slow-cooked black lentils • 💎 Hidden Gem",
      "restaurant": {
        "name": "Dishoom",           // ← THIS IS ALREADY HERE!
        "link": "https://deliveroo.co.uk/menu/dishoom-covent-garden",
        "link_type": "delivery",
        "link_label": "Order on Deliveroo",
        "address": "12 Upper St Martin's Lane, London WC2H 9FB",
        "distance": "1.2km away",
        "rating": 4.8,
        "reviews": 3247
      },
      "price": "£8.90",
      "hidden_gem": {
        "emoji": "💎",
        "label": "Hidden Gem",
        "color": "#9B59B6"
      },
      "source": "restaurant_menu_firebase"
    }
  ]
}
```

---

## 🎨 Frontend Fix

### **Current Code (Likely):**

```javascript
// Your current Food tab component
decisions.map((item) => (
  <div key={item.name} className="food-card">
    <div className="emoji">{item.emoji}</div>
    <h3>{item.name}</h3>
    <p>{item.explanation}</p>
    {item.price && <span className="price">{item.price}</span>}
  </div>
))
```

### **Fixed Code:**

```javascript
// Enhanced to show restaurant
decisions.map((item) => (
  <div key={item.name} className="food-card">
    <div className="emoji">{item.emoji}</div>

    <h3>{item.name}</h3>

    {/* ADD THIS: Show restaurant name */}
    {item.restaurant && (
      <div className="restaurant-info">
        <span className="restaurant-name">
          📍 {item.restaurant.name}
        </span>
        {item.restaurant.rating && (
          <span className="rating">
            ⭐ {item.restaurant.rating}
          </span>
        )}
      </div>
    )}

    <p>{item.explanation}</p>

    {item.price && <span className="price">{item.price}</span>}

    {/* Optional: Hidden gem badge */}
    {item.hidden_gem && (
      <div className="gem-badge" style={{ color: item.hidden_gem.color }}>
        {item.hidden_gem.emoji} {item.hidden_gem.label}
      </div>
    )}

    {/* Optional: Order/View button */}
    {item.restaurant?.link && (
      <a href={item.restaurant.link} className="cta-button">
        {item.restaurant.link_label || "View Restaurant"}
      </a>
    )}
  </div>
))
```

---

## 🎯 Quick Fix (Minimal Change)

If you just want to add the restaurant name with minimal code change:

```javascript
// Find your food card component and add this line:
<h3>{item.name}</h3>
{/* ADD THIS ONE LINE: */}
{item.restaurant?.name && <p className="restaurant">at {item.restaurant.name}</p>}
<p>{item.explanation}</p>
```

**Result:**
```
House Black Daal
at Dishoom                    ← NEW!
24-hour slow-cooked black lentils
```

---

## 📱 Enhanced UI Example

For a better user experience, show it like this:

```jsx
<div className="food-card">
  <div className="card-header">
    <span className="emoji">{item.emoji}</span>
    {item.hidden_gem && (
      <span className="gem-badge">{item.hidden_gem.emoji}</span>
    )}
  </div>

  <h3 className="dish-name">{item.name}</h3>

  <div className="restaurant-badge">
    <span className="icon">📍</span>
    <span className="name">{item.restaurant.name}</span>
    {item.restaurant.rating && (
      <span className="rating">
        {item.restaurant.rating} ⭐
      </span>
    )}
  </div>

  <p className="description">{item.explanation}</p>

  <div className="card-footer">
    <span className="price">{item.price}</span>
    {item.restaurant.distance && (
      <span className="distance">{item.restaurant.distance}</span>
    )}
  </div>

  {item.restaurant.link && (
    <a href={item.restaurant.link} className="order-button">
      {item.restaurant.link_label}
    </a>
  )}
</div>
```

---

## 🎨 CSS Suggestions

```css
.food-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.restaurant-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 14px;
}

.restaurant-badge .name {
  font-weight: 600;
  color: #333;
}

.restaurant-badge .rating {
  margin-left: auto;
  color: #666;
}

.gem-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(155, 89, 182, 0.1);
}

.order-button {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  background: #8B5CF6;
  color: white;
  text-align: center;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}
```

---

## 🔍 Where to Find Your Food Card Component

Look for files like:
- `src/components/FoodCard.js`
- `src/pages/Food.js`
- `src/modules/food.js`
- `src/components/QuickDecision.js`

Search for:
- `"DECIDE FOR ME"`
- `"Your 3 Perfect Picks"`
- `quick_decision`
- `decisions.map`

---

## 🧪 Test Your Fix

After making the change:

1. **Refresh your app**
2. **Click "DECIDE FOR ME"**
3. **You should now see:**
   ```
   🍛 House Black Daal
   📍 Dishoom ⭐ 4.8
   24-hour slow-cooked black lentils • 💎 Hidden Gem
   £8.90
   [Order on Deliveroo]
   ```

---

## 📊 Full Data Available

The API returns all this data for each item:

```javascript
{
  name: "House Black Daal",
  emoji: "🍛",
  explanation: "24-hour slow-cooked black lentils",
  restaurant: {
    name: "Dishoom",                    // Restaurant name
    link: "https://...",                // Order/booking link
    link_type: "delivery",              // Type of link
    link_label: "Order on Deliveroo",   // Button text
    address: "12 Upper St Martin's...", // Full address
    distance: "1.2km away",             // Distance
    rating: 4.8,                        // Star rating
    reviews: 3247                       // Review count
  },
  price: "£8.90",
  hidden_gem: {
    emoji: "💎",
    label: "Hidden Gem",
    color: "#9B59B6"
  },
  source: "restaurant_menu_firebase",
  cuisine_type: "indian",
  dietary_info: {...},
  availability: "Available now"
}
```

**You can display ANY of these fields!**

---

## 🎯 Recommended Display

**Minimum (Quick Fix):**
- ✅ Dish name
- ✅ Restaurant name
- ✅ Description
- ✅ Price

**Enhanced:**
- ✅ All of the above +
- ✅ Restaurant rating
- ✅ Distance
- ✅ Hidden gem badge
- ✅ Order/booking button

**Premium:**
- ✅ All of the above +
- ✅ Restaurant photo (need to fetch from `/v1/travel/shortlist`)
- ✅ Availability status
- ✅ Save to favorites
- ✅ Share option

---

## 🔗 Alternative: Use Travel Tab Endpoint

If you want **full restaurant cards with photos**, switch to:

```javascript
// Instead of /v1/quick_decision
const response = await fetch('/v1/travel/shortlist', {
  method: 'POST',
  body: JSON.stringify({
    location: { city: 'London', country_code: 'GB' },
    mood_text: userInput,
    limit: 3,
    per_restaurant_items: 1  // Get 1 dish per restaurant
  })
});

const { restaurants } = await response.json();

// Now you get full restaurant objects with:
// - hero_image, gallery
// - rating, review_count
// - availability_label
// - distance_text
// - featured_items[0] (the dish)
```

---

## ✅ Quick Summary

**Problem:** Restaurant names not showing

**Cause:** Frontend not displaying `item.restaurant.name`

**Fix:** Add one line to your food card component:
```javascript
{item.restaurant?.name && <p>at {item.restaurant.name}</p>}
```

**Result:** Users now see which restaurant each dish is from! 🎉

---

**The data is already there - just display it!** 🚀
