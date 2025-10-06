# How to Use Your OpenAPI Schema

## 🎯 What is OpenAPI?

OpenAPI (formerly Swagger) is a **standard format for documenting REST APIs**. Think of it as a blueprint that describes:
- What endpoints exist (`/v1/travel/shortlist`)
- What data they accept (request body)
- What data they return (response)
- Authentication requirements
- Examples and descriptions

**It's NOT for OpenAI/GPT** - It's for API documentation and tooling.

---

## ✅ Your OpenAPI Spec is Now Live

Your server already serves it at:

```
http://localhost:3048/openapi.json
https://vfied-v4-clean.onrender.com/openapi.json
```

**Try it:**
```bash
curl http://localhost:3048/openapi.json
```

---

## 🔧 How to Use It

### **1. View Interactive API Documentation**

Install Redoc or Swagger UI to get beautiful interactive docs:

```bash
# Option A: Redoc (cleaner, modern)
npx @redocly/cli preview-docs http://localhost:3048/openapi.json

# Option B: Swagger UI (more features)
npx swagger-ui-cli -p 8080 http://localhost:3048/openapi.json
```

Then open **http://localhost:8080** to see your API docs with:
- ✅ All endpoints listed
- ✅ Request/response examples
- ✅ Try it out feature
- ✅ Code samples in multiple languages

---

### **2. Import into Postman**

**Steps:**
1. Open Postman
2. Click **Import** button
3. Paste: `http://localhost:3048/openapi.json`
4. Click **Import**

**Result:** All your API endpoints are ready to test! Postman will auto-fill:
- Request URLs
- Headers
- Example request bodies
- Expected responses

---

### **3. Generate TypeScript Types**

Auto-generate types for your frontend:

```bash
# Install generator
npm install --save-dev openapi-typescript

# Generate types
npx openapi-typescript http://localhost:3048/openapi.json -o src/types/api.ts
```

**Then use in your code:**
```typescript
import type { paths } from './types/api';

type RestaurantShortlistRequest =
  paths['/v1/travel/shortlist']['post']['requestBody']['content']['application/json'];

type RestaurantCard =
  paths['/v1/travel/shortlist']['post']['responses']['200']['content']['application/json']['restaurants'][0];

// Now you have type-safe API calls!
const request: RestaurantShortlistRequest = {
  location: {
    city: 'London',
    country_code: 'GB',
    latitude: 51.5074,
    longitude: -0.1278
  },
  mood_text: 'cozy date night',
  limit: 5
};
```

---

### **4. Generate Client SDKs**

Auto-generate API clients for your frontend:

```bash
# For JavaScript/TypeScript
npx openapi-generator-cli generate \
  -i http://localhost:3048/openapi.json \
  -g typescript-axios \
  -o src/generated/api

# For Swift (iOS)
npx openapi-generator-cli generate \
  -i http://localhost:3048/openapi.json \
  -g swift5 \
  -o ios/generated

# For Kotlin (Android)
npx openapi-generator-cli generate \
  -i http://localhost:3048/openapi.json \
  -g kotlin \
  -o android/generated
```

---

### **5. Validate Your API Implementation**

Check if your actual API responses match the schema:

```bash
# Install validator
npm install --save-dev @redocly/cli

# Validate schema
npx @redocly/cli lint http://localhost:3048/openapi.json

# Test actual API against schema
npx @redocly/cli test http://localhost:3048/openapi.json
```

---

## 🚀 What About OpenAI/GPT?

Your API **already uses OpenAI** internally (in [travel.js](server/routes/travel.js)):

```javascript
// Line 1065-1086 in travel.js
if (USE_GPT && OPENAI_API_KEY && topRestaurants.length > 0) {
  const system = `You are VFIED's restaurant discovery coach...`;
  const gptResult = await gptChatJSON({ system, user, max_tokens: 600 });
  // Returns personalized restaurant recommendations
}
```

**You DON'T need to paste the OpenAPI schema into OpenAI.**

The OpenAPI schema is for documenting your API endpoints. GPT is used **inside** your endpoints to generate smart responses.

---

## 📊 OpenAPI vs OpenAI - The Difference

### **OpenAPI (what you have):**
- 📄 API documentation standard
- 🔧 Used by tools (Postman, code generators)
- 📖 Describes your endpoints
- ✅ Lives at `/openapi.json`

### **OpenAI (what you're using):**
- 🤖 AI/GPT API service
- 💬 Used to generate text responses
- 🧠 Powers your coach recommendations
- ✅ Called from `gptChatJSON()` in your code

---

## 🎨 Visual Example

```
┌─────────────────────────────────────────────────┐
│  USER                                           │
│  "Find me a romantic restaurant in London"     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  YOUR API                                       │
│  POST /v1/travel/shortlist                     │
│                                                 │
│  1. Parse request                              │
│  2. Query Firebase/Local DB                    │
│  3. Call OpenAI GPT (coach response)           │
│  4. Format results                             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  RESPONSE                                       │
│  {                                              │
│    "restaurants": [                            │
│      {                                          │
│        "name": "The Laughing Heart",           │
│        "rating": 4.9,                          │
│        "availability_label": "Available now",  │
│        "distance_text": "1.2km away",          │
│        "featured_items": [...],                │
│        "gem_badge": {...}                      │
│      }                                          │
│    ],                                           │
│    "coach": {                                   │
│      "response": "For romantic dinner..."      │
│    }                                            │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 💡 Quick Start Guide

**For Frontend Development:**

1. **View the API docs:**
   ```bash
   npx @redocly/cli preview-docs http://localhost:3048/openapi.json
   ```

2. **Test in Postman:**
   - Import: `http://localhost:3048/openapi.json`
   - Try calling `/v1/travel/shortlist`

3. **Generate TypeScript types:**
   ```bash
   npx openapi-typescript http://localhost:3048/openapi.json -o src/types/api.ts
   ```

4. **Use in your React/Vue app:**
   ```typescript
   const response = await fetch('/v1/travel/shortlist', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       location: { city: 'London', country_code: 'GB' },
       mood_text: 'breakfast',
       limit: 5
     })
   });

   const data = await response.json();
   // data.restaurants is now typed!
   ```

---

## 📝 Summary

**OpenAPI Schema:**
- ✅ Already served at `/openapi.json`
- ✅ Describes your API endpoints
- ✅ Use with Postman, Swagger UI, code generators
- ❌ **Don't** paste into OpenAI

**OpenAI/GPT:**
- ✅ Already integrated in your backend
- ✅ Powers the coach recommendations
- ✅ Configured via `OPENAI_API_KEY` env variable
- ✅ Called automatically by `/v1/travel/coach`

**You're all set!** 🚀
