#!/bin/bash
# Test VFIED API Endpoints
# Run this to verify backend is working correctly

echo "🧪 Testing VFIED API Endpoints"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_BASE="https://vfied-v4-clean.onrender.com"

echo -e "${BLUE}1. Testing Travel Coach (/v1/travel/coach)${NC}"
echo "Expected: Should return real restaurants (Dishoom, No60, etc.)"
echo "---"
curl -s "$API_BASE/v1/travel/coach" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "dinner in London",
    "location": {
      "city": "London",
      "country_code": "GB"
    }
  }' | python3 -m json.tool | head -60

echo ""
echo ""
echo -e "${BLUE}2. Testing Food Quick Decision (/v1/quick_decision)${NC}"
echo "Expected: Should return 6 menu items from Firebase restaurants"
echo "---"
curl -s "$API_BASE/v1/quick_decision" \
  -H 'Content-Type: application/json' \
  -d '{
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "mood_text": "hungry",
    "dietary": []
  }' | python3 -m json.tool

echo ""
echo ""
echo -e "${BLUE}3. Testing Restaurant Search (/v1/travel/restaurants/search)${NC}"
echo "Expected: Should return all 6+ restaurants from Firebase"
echo "---"
curl -s "$API_BASE/v1/travel/restaurants/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "",
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "limit": 10
  }' | python3 -m json.tool | grep -E '"restaurant_id"|"name":|"cuisine_type"' | head -30

echo ""
echo ""
echo -e "${BLUE}4. Testing Travel Shortlist (/v1/travel/shortlist)${NC}"
echo "Expected: Should return restaurant cards with photos, ratings, etc."
echo "---"
curl -s "$API_BASE/v1/travel/shortlist" \
  -H 'Content-Type: application/json' \
  -d '{
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "mood_text": "dinner",
    "limit": 3
  }' | python3 -m json.tool | head -80

echo ""
echo ""
echo -e "${BLUE}5. Count Total Menu Items in Firebase${NC}"
echo "Expected: Should show 200+ menu items from 6+ restaurants"
echo "---"
TOTAL_ITEMS=$(curl -s "$API_BASE/v1/travel/restaurants/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "",
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "limit": 100
  }' | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data.get('shortlist', [])))")

echo "Total menu items found: $TOTAL_ITEMS"

if [ "$TOTAL_ITEMS" -gt 50 ]; then
  echo -e "${GREEN}✅ PASS: Found $TOTAL_ITEMS items${NC}"
else
  echo -e "${RED}❌ FAIL: Only found $TOTAL_ITEMS items (expected 50+)${NC}"
fi

echo ""
echo ""
echo -e "${BLUE}6. List All Restaurants in Database${NC}"
echo "---"
curl -s "$API_BASE/v1/travel/restaurants/search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "",
    "location": {
      "city": "London",
      "country_code": "GB"
    },
    "limit": 20
  }' | python3 -c "
import sys, json
data = json.load(sys.stdin)
restaurants = {}
for item in data.get('shortlist', []):
    rid = item.get('restaurant_id', 'unknown')
    name = item.get('restaurant_name', 'Unknown')
    cuisine = item.get('cuisine_type', 'unknown')
    restaurants[rid] = f'{name} ({cuisine})'

print('Unique Restaurants:')
for i, (rid, info) in enumerate(restaurants.items(), 1):
    print(f'{i}. {info}')
print(f'\nTotal: {len(restaurants)} restaurants')
"

echo ""
echo ""
echo "================================"
echo "🎯 Tests Complete!"
echo ""
echo "If you see real restaurant names (Dishoom, No60 Brasserie, etc.), the backend is working!"
echo "If you see generic names (Fish and Chips, etc.), there's still a problem."
