// data/countries.js - Supported Countries with Cultural Context
export const SUPPORTED_COUNTRIES = {
  countries: [
    {
      name: 'Kenya',
      country_code: 'KE',
      region: 'East Africa',
      cuisine: 'East African',
      dishes: [
        { name: "Ugali + Sukuma", emoji: "🍽️", explanation: "Staple comfort: maize meal with greens" },
        { name: "Nyama Choma", emoji: "🥩", explanation: "Char-grilled goat/beef, weekend favorite" },
        { name: "Pilau", emoji: "🍚", explanation: "Spiced rice, aromatic and satisfying" },
        { name: "Chapati & Beans", emoji: "🫓", explanation: "Flatbread with seasoned beans" },
        { name: "Samosas", emoji: "🥟", explanation: "Crispy pastries with spiced filling" }
      ],
      travel_spots: [
        { name: "Kenyatta Market", emoji: "🥙", reason: "Street food stalls with nyama choma" },
        { name: "Giraffe Centre Café", emoji: "🦒", reason: "Unique breakfast with giraffes" },
        { name: "Karen Blixen Coffee Garden", emoji: "☕", reason: "Cozy lunch with history" }
      ],
      events: [
        { title: "Nairobi Street Food Festival", emoji: "🎉", description: "Sample bold local flavors" },
        { title: "Kenya Food & Drink Expo", emoji: "🍻", description: "Showcase of East African cuisine" }
      ]
    },
    {
      name: 'United Kingdom',
      country_code: 'GB',
      region: 'Western Europe',
      cuisine: 'British',
      dishes: [
        { name: "Fish & Chips", emoji: "🍟", explanation: "Classic British comfort, crispy & filling" },
        { name: "Chicken Tikka Masala", emoji: "🍛", explanation: "UK curry-house favorite, bold spices" },
        { name: "Sunday Roast", emoji: "🥩", explanation: "Traditional hearty family meal" },
        { name: "Full English Breakfast", emoji: "🍳", explanation: "Complete morning fuel with all the fixings" },
        { name: "Bangers & Mash", emoji: "🌭", explanation: "Sausages with creamy mashed potatoes" }
      ],
      travel_spots: [
        { name: "Borough Market", emoji: "🥪", reason: "Historic market with artisanal food" },
        { name: "Brick Lane", emoji: "🍛", reason: "Curry capital with vibrant energy" },
        { name: "Camden Market", emoji: "🌮", reason: "Street food from all over the world" }
      ],
      events: [
        { title: "London Coffee Festival", emoji: "☕", description: "Specialty brews & tastings" },
        { title: "Taste of London", emoji: "🍴", description: "Flagship UK food festival" }
      ]
    },
    {
      name: 'United States',
      country_code: 'US',
      region: 'North America',
      cuisine: 'American',
      dishes: [
        { name: "Smash Burger", emoji: "🍔", explanation: "Hearty, fast, crowd-pleasing classic" },
        { name: "Burrito Bowl", emoji: "🌯", explanation: "Protein + grains, easy to customize" },
        { name: "Chicken Caesar Salad", emoji: "🥗", explanation: "Crunchy greens with savory bite" },
        { name: "BBQ Ribs", emoji: "🍖", explanation: "Smoky comfort food, weekend worthy" },
        { name: "Mac & Cheese", emoji: "🧀", explanation: "Creamy comfort food classic" }
      ],
      travel_spots: [
        { name: "Chelsea Market (NYC)", emoji: "🥯", reason: "Iconic indoor food hall" },
        { name: "Fisherman's Wharf (SF)", emoji: "🦀", reason: "Seafood stalls and chowder bowls" },
        { name: "Austin Food Trucks", emoji: "🌮", reason: "Street food and BBQ hotspot" }
      ],
      events: [
        { title: "BBQ Festival", emoji: "🍖", description: "Smoked meats, live music, community vibes" },
        { title: "Food & Wine Classic", emoji: "🍷", description: "Luxury tasting with chefs & sommeliers" }
      ]
    },
    {
      name: 'Japan',
      country_code: 'JP',
      region: 'East Asia',
      cuisine: 'Japanese',
      dishes: [
        { name: "Tonkotsu Ramen", emoji: "🍜", explanation: "Rich broth, cozy noodle comfort" },
        { name: "Chicken Katsu", emoji: "🍱", explanation: "Crispy cutlet, simple and satisfying" },
        { name: "Salmon Nigiri", emoji: "🍣", explanation: "Clean flavors, light but filling" },
        { name: "Tempura", emoji: "🍤", explanation: "Light, crispy battered vegetables and seafood" },
        { name: "Miso Soup", emoji: "🥣", explanation: "Savory soybean soup with tofu and seaweed" }
      ],
      travel_spots: [
        { name: "Tsukiji Outer Market (Tokyo)", emoji: "🐟", reason: "Fresh sushi & seafood street stalls" },
        { name: "Dotonbori (Osaka)", emoji: "🍢", reason: "Street food heaven: takoyaki & okonomiyaki" },
        { name: "Kyoto Nishiki Market", emoji: "🍡", reason: "Traditional snacks & sweets" }
      ],
      events: [
        { title: "Cherry Blossom Food Stalls", emoji: "🌸", description: "Seasonal hanami snacks & drinks" },
        { title: "Tokyo Ramen Show", emoji: "🍜", description: "Regional ramen pop-ups in one place" }
      ]
    },
    {
      name: 'India',
      country_code: 'IN',
      region: 'South Asia',
      cuisine: 'Indian',
      dishes: [
        { name: "Butter Chicken", emoji: "🍛", explanation: "Creamy tomato curry with tender chicken" },
        { name: "Biryani", emoji: "🍚", explanation: "Fragrant rice with spices and meat" },
        { name: "Masala Dosa", emoji: "🥞", explanation: "Crispy crepe with spiced potato filling" },
        { name: "Dal Tadka", emoji: "🍲", explanation: "Spiced lentil curry, comfort in a bowl" },
        { name: "Naan & Curry", emoji: "🫓", explanation: "Fluffy bread perfect for scooping curry" }
      ],
      travel_spots: [
        { name: "Chandni Chowk (Delhi)", emoji: "🌶️", reason: "Spicy street food paradise" },
        { name: "Crawford Market (Mumbai)", emoji: "🧄", reason: "Aromatic spices and traditional snacks" },
        { name: "Local Dhaba", emoji: "🚛", reason: "Roadside eatery with authentic flavors" }
      ],
      events: [
        { title: "Diwali Food Festival", emoji: "🪔", description: "Sweet treats and festival foods" },
        { title: "Street Food Walk", emoji: "🌶️", description: "Guided tour through spicy local favorites" }
      ]
    },
    {
      name: 'France',
      country_code: 'FR',
      region: 'Western Europe',
      cuisine: 'French',
      dishes: [
        { name: "Coq au Vin", emoji: "🍗", explanation: "Wine-braised chicken, classic bistro dish" },
        { name: "Croque Monsieur", emoji: "🥪", explanation: "Grilled ham and cheese with béchamel" },
        { name: "French Onion Soup", emoji: "🧅", explanation: "Rich broth with caramelized onions and cheese" },
        { name: "Ratatouille", emoji: "🍆", explanation: "Rustic vegetable stew from Provence" },
        { name: "Croissant", emoji: "🥐", explanation: "Buttery, flaky pastry perfect for breakfast" }
      ],
      travel_spots: [
        { name: "Local Boulangerie", emoji: "🥖", reason: "Fresh bread and pastries daily" },
        { name: "Wine Bar", emoji: "🍷", reason: "Regional wines with cheese and charcuterie" },
        { name: "Bistro", emoji: "🍽️", reason: "Casual French dining with seasonal menus" }
      ],
      events: [
        { title: "Wine Harvest Festival", emoji: "🍇", description: "Celebrate new vintages with tastings" },
        { title: "Marché aux Puces", emoji: "🧀", description: "Flea market with artisanal cheese stalls" }
      ]
    }
  ]
};
  
  // Helper functions
  export function getCountryByCode(countryCode) {
    return SUPPORTED_COUNTRIES.countries.find(
      country => country.country_code=== countryCode?.toUpperCase()
    );
  }
  export function getCountryDishes(countryCode) {
    const country = getCountryByCode(countryCode);
    return country?.dishes || [];
  }
  
  export function getCountryTravelSpots(countryCode) {
    const country = getCountryByCode(countryCode);
    return country?.travel_spots || [];
  }
  export function getCountryEvents(countryCode) {
    const country = getCountryByCode(countryCode);
    return country?.events || [];
  }
  export function getCountriesByRegion(region) {
    return SUPPORTED_COUNTRIES.countries.filter(
      country => country.region === region
    );
  }
  
  export function getCountriesByCuisine(cuisine) {
    return SUPPORTED_COUNTRIES.countries.filter(
      country => country.cuisine.toLowerCase().includes(cuisine.toLowerCase())
    );
  }
  
  export function searchCountries(searchTerm) {
    const term = searchTerm.toLowerCase();
    return SUPPORTED_COUNTRIES.countries.filter(country =>
      country.name.toLowerCase().includes(term) ||
      country.country_code.toLowerCase().includes(term) ||
      country.cuisine.toLowerCase().includes(term) ||
      country.region.toLowerCase().includes(term)
    );
  }
  
  export function isCountrySupported(countryCode) {
    return SUPPORTED_COUNTRIES.countries.some(
      country => country.country_code === countryCode?.toUpperCase()
    );
  }
  
  export function getAllCountryCodes() {
    return SUPPORTED_COUNTRIES.countries.map(country => country.country_code);
  }
  
  export function getRegions() {
    return [...new Set(SUPPORTED_COUNTRIES.countries.map(country => country.region))];
  }
  
  export function getCuisineTypes() {
    return [...new Set(SUPPORTED_COUNTRIES.countries.map(country => country.cuisine))];
  }
  
  // Get country suggestions based on user input
  export function getCountrySuggestions(input) {
    if (!input || input.length < 2) {
      return SUPPORTED_COUNTRIES.countries.slice(0, 10); // Return first 10
    }
    
    const matches = searchCountries(input);
    return matches.slice(0, 10); // Limit to 10 suggestions
  }
  
  // Validate and normalize country input
  export function normalizeCountryInput(countryInput) {
    if (!countryInput) return null;
    
    // If it's already a country code
    if (countryInput.length === 2) {
      const country = getCountryByCode(countryInput);
      return country || null;
    }
    
    // Search by name
    const matches = searchCountries(countryInput);
    return matches.length > 0 ? matches[0] : null;
  }
  // New helper for quick decision fallbacks
export function getQuickFallbackDishes(countryCode) {
  const dishes = getCountryDishes(countryCode);
  return dishes.length >= 3 ? dishes.slice(0, 3) : [
    { name: "Local Special", emoji: "🍽️", explanation: "Regional favorite dish" },
    { name: "Comfort Food", emoji: "🥘", explanation: "Traditional comfort meal" },
    { name: "Street Food", emoji: "🥙", explanation: "Popular quick bite" }
  ];
}