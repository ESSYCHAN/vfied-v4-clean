// server/menu_manager.js
// Enhanced restaurant menu storage and retrieval for VFIED

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MenuManager {
  constructor() {
    this.menuDataPath = path.resolve(__dirname, '../data/restaurant_menus.json');
    this.menus = new Map();
    this.menuStats = { total_items: 0, total_restaurants: 0, last_updated: null };
    this.initialized = false;
    this.loadMenus().catch(console.error);
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.menuDataPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  async loadMenus() {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.menuDataPath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.menus) {
        Object.entries(parsed.menus).forEach(([key, menu]) => {
          this.menus.set(key, menu);
        });
        this.menuStats = parsed.stats || this.menuStats;
      } else {
        Object.entries(parsed).forEach(([key, menu]) => {
          this.menus.set(key, menu);
        });
      }
      
      this.updateStats();
      this.initialized = true;
      console.log(`📋 Loaded ${this.menuStats.total_items} menu items from ${this.menuStats.total_restaurants} restaurants`);
    } catch (error) {
      console.log('📋 No existing menus found, starting fresh');
      this.menus = new Map();
      this.updateStats();
      this.initialized = true;
    }
  }

  async saveMenus() {
    if (!this.initialized) return;
    
    try {
      await this.ensureDataDirectory();
      const data = {
        menus: Object.fromEntries(this.menus),
        stats: this.menuStats,
        last_saved: new Date().toISOString()
      };
      await fs.writeFile(this.menuDataPath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${this.menuStats.total_items} menu items`);
    } catch (error) {
      console.error('❌ Failed to save menus:', error.message);
    }
  }

  updateStats() {
    let totalItems = 0;
    for (const [, menu] of this.menus) {
      totalItems += (menu.menu_items || []).length;
    }
    
    this.menuStats = {
      total_items: totalItems,
      total_restaurants: this.menus.size,
      last_updated: new Date().toISOString()
    };
  }

  // NEW: Calculate distance between two coordinates
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  // NEW: Calculate hidden gem score
  calculateHiddenGemScore(restaurant, item) {
  let score = 0;
  
  // 1. Limited availability (30 points)
  if (item.availability === 'weekends_only') score += 30;
  if (item.availability === 'seasonal') score += 25;
  if (item.availability === 'chef_special') score += 20;
  if (item.availability === 'limited_daily') score += 15;
  
  // 2. Small batch / preparation time (25 points)
  if (item.daily_limit && item.daily_limit < 20) score += 25;
  if (item.preparation_time && item.preparation_time > 60) score += 15;
  
  // 3. Family recipe / traditional (20 points)
  if (item.tags?.includes('family_recipe')) score += 20;
  if (item.tags?.includes('generational')) score += 15;
  if (item.tags?.includes('traditional')) score += 10;
  if (item.tags?.includes('secret_recipe')) score += 25;
  
  // 4. Restaurant size / reviews (15 points)
  if (restaurant.review_count && restaurant.review_count < 50) score += 15;
  if (restaurant.seating_capacity && restaurant.seating_capacity < 30) score += 10;
  if (restaurant.type === 'family_owned') score += 10;
  
  // 5. Not on delivery apps (10 points)
  const deliveryPlatforms = restaurant.delivery_platforms || {};
  const onPlatforms = Object.keys(deliveryPlatforms).filter(k => k.endsWith('_id')).length;
  if (onPlatforms === 0) score += 10;
  if (onPlatforms === 1) score += 5;
  
  // 6. High rating but low visibility (bonus 15 points)
  if (restaurant.rating && restaurant.rating > 4.5 && 
      restaurant.review_count && restaurant.review_count < 100) {
    score += 15;
  }
  
  // 7. Unique/rare cuisine or technique
  if (item.tags?.includes('rare')) score += 20;
  if (item.tags?.includes('unique')) score += 15;
  if (item.cooking_method === 'wood_fired' || 
      item.cooking_method === 'charcoal' ||
      item.cooking_method === 'traditional') score += 10;
  
  // NEW: Use signup metadata goals
  const goals = restaurant.metadata?.goals || [];
  
  // If NOT seeking visibility, they're more of a hidden gem
  if (!goals.includes('increase_visibility')) {
    score += 12; // They're not actively marketing = hidden
  }
  
  // If highlighting specialties, signature dishes get gem status
  if (goals.includes('highlight_specialties') && item.tags?.includes('signature')) {
    score += 10;
  }
  
  // Competing with chains = underdog/gem quality
  if (goals.includes('compete_chains')) {
    score += 8;
  }
  
  // Menu size from signup
  const menuSize = restaurant.metadata?.menu_size;
  if (menuSize === '21-50 items') score += 15; // Small, curated menu
  if (menuSize === '1-20 items') score += 20; // Very focused
  if (menuSize === '51-100 items') score += 5;
  
  // POS systems - fewer = more traditional
  const posSystems = restaurant.metadata?.pos_systems || [];
  if (posSystems.length === 0) score += 10; // No tech = traditional
  if (posSystems.length === 1) score += 5;
  
  return Math.min(score, 100); // Cap at 100
}

  // NEW: Get hidden gem badge
  getHiddenGemBadge(score) {
    if (score >= 90) return { emoji: '🏆', label: 'Legendary Find', color: '#FFD700' };
    if (score >= 70) return { emoji: '💎', label: 'Hidden Gem', color: '#9B59B6' };
    if (score >= 50) return { emoji: '⭐', label: 'Local Favorite', color: '#3498DB' };
    if (score >= 30) return { emoji: '🔍', label: 'Worth Discovering', color: '#95A5A6' };
    return null;
  }

  // NEW: Build restaurant link with fallback chain
  buildRestaurantLink(restaurant) {
    const platforms = restaurant.delivery_platforms || {};
    
    // Priority: Direct website > Deliveroo > Uber Eats > Google Maps
    if (restaurant.website) {
      return {
        url: restaurant.website,
        type: 'website',
        label: 'Visit Website'
      };
    }
    
    if (platforms.deliveroo_id) {
      return {
        url: `https://deliveroo.co.uk/menu/${platforms.deliveroo_id}`,
        type: 'delivery',
        label: 'Order on Deliveroo'
      };
    }
    
    if (platforms.ubereats_id) {
      return {
        url: `https://www.ubereats.com/store/${platforms.ubereats_id}`,
        type: 'delivery',
        label: 'Order on Uber Eats'
      };
    }
    
    if (platforms.doordash_id) {
      return {
        url: `https://www.doordash.com/store/${platforms.doordash_id}`,
        type: 'delivery',
        label: 'Order on DoorDash'
      };
    }
    
    // Fallback to Google Maps/Search
    const address = restaurant.location?.address || 
                   `${restaurant.restaurant_name}, ${restaurant.location?.city}`;
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      type: 'map',
      label: 'View on Map'
    };
  }

  // ENHANCED: Search with location flexibility and distance
  async searchMenus({ 
    location, 
    target_location = null, // NEW: Allow searching different area
    search_radius = 10, // NEW: km radius (default 10km)
    mood_text = '', 
    dietary = [], 
    meal_period = 'all_day', 
    attributes = [], 
    limit = 10, 
    timeContext = null,
    sort_by = 'relevance' // NEW: 'relevance', 'distance', 'hidden_gem'
  }) {
    const results = [];
    const searchLoc = target_location || location;
    const hasCoords = searchLoc?.latitude && searchLoc?.longitude;
    
    console.log(`🔍 Searching ${search_radius}km radius around ${searchLoc?.city || 'location'}`);
    
    for (const [key, menu] of this.menus) {
      // Filter by distance if coordinates available
      if (hasCoords && menu.location?.latitude && menu.location?.longitude) {
        const distance = this.calculateDistance(
          searchLoc.latitude,
          searchLoc.longitude,
          menu.location.latitude,
          menu.location.longitude
        );
        
        if (distance > search_radius) {
          console.log(`📍 Skipping ${menu.restaurant_name} - ${distance.toFixed(1)}km away (outside ${search_radius}km radius)`);
          continue;
        }
        
        menu.distance_km = distance;
      } else {
        // Fallback to city/country matching
        const menuLocation = `${menu.location.country_code.toLowerCase()}_${menu.location.city.toLowerCase()}`;
        const searchLocation = `${(searchLoc?.country_code || 'GB').toLowerCase()}_${(searchLoc?.city || '').toLowerCase()}`;
        
        if (!menuLocation.includes(searchLocation) && !searchLocation.includes(menuLocation)) {
          continue;
        }
        
        menu.distance_km = null; // Unknown distance
      }
      
      // Check opening hours
      if (timeContext && menu.opening_hours) {
        const now = new Date();
        const currentDay = now.toLocaleDateString('en', {weekday: 'long'}).toLowerCase();
        const currentTime = now.toTimeString().slice(0,5);
        
        const todayHours = menu.opening_hours[currentDay];
        if (!todayHours || currentTime < todayHours.open || currentTime > todayHours.close) {
          console.log(`⏰ Skipping ${menu.restaurant_name} - closed`);
          continue;
        }
      }
      
      // Filter menu items
      const matchingItems = menu.menu_items.filter(item => {
        if (!item.available) return false;
        
        // Meal period filter
        if (meal_period !== 'all_day' && 
            item.meal_period !== 'all_day' && 
            item.meal_period !== meal_period) {
          return false;
        }
        
        // Dietary restrictions
        if (dietary.length > 0) {
          for (const restriction of dietary) {
            const normalizedRestriction = restriction.replace('-', '_');
            if (!item.dietary || !item.dietary[normalizedRestriction]) {
              return false;
            }
          }
        }
        
        return true;
      });
      
      // Score and add matching items
      matchingItems.forEach(item => {
        let score = Math.random() * 5; // Base randomness
        const itemText = `${item.name} ${item.description || ''} ${(item.search_tags || []).join(' ')}`.toLowerCase();
        
        // Existing mood matching...
        if (mood_text) {
          const moodWords = mood_text.toLowerCase().split(/\s+/);
          for (const word of moodWords) {
            if (word.length > 2 && itemText.includes(word)) {
              score += 10;
            }
          }
        }
        
        // NEW: Boost based on restaurant goals
        const goals = menu.metadata?.goals || [];
        
        // If restaurant wants visibility, boost all their items slightly
        if (goals.includes('increase_visibility')) {
          score += 3;
        }
        
        // If they want to highlight specialties and item is tagged as signature
        if (goals.includes('highlight_specialties') && item.tags?.includes('signature')) {
          score += 15;
        }
        
        // If targeting dietary customers and this matches user's dietary needs
        if (goals.includes('attract_dietary') && dietary.length > 0) {
          const matchesDietary = dietary.some(d => item.dietary?.[d.replace('-','_')]);
          if (matchesDietary) score += 12;
        }
        
        // If filling off-peak hours, boost during those times
        if (goals.includes('fill_off_peak') && timeContext) {
          const hour = timeContext.current_hour;
          if ((hour >= 14 && hour < 17) || (hour >= 21)) { // Afternoon & late night
            score += 10;
          }
        }
        
        // If competing with chains, boost for mood-based searches (more personal)
        if (goals.includes('compete_chains') && mood_text?.length > 10) {
          score += 8;
        }
        
        // If targeting specific moods, boost when mood keywords match their cuisine
        if (goals.includes('target_specific_moods') && mood_text) {
          const cuisineMatch = itemText.includes(menu.cuisine_type);
          if (cuisineMatch) score += 7;
        }
        
        item.match_score = score;
        const link = this.buildRestaurantLink(menu);
        const gemScore = this.calculateHiddenGemScore(menu, item);
        const gemBadge = this.getHiddenGemBadge(gemScore);
        
        results.push({
          ...item,
          restaurant_name: menu.restaurant_name,
          restaurant_id: menu.restaurant_id,
          restaurant_link: link,
          hidden_gem_score: gemScore,
          hidden_gem_badge: gemBadge,
          location: menu.location,
          cuisine_type: menu.cuisine_type});
      });
    }
    
    // Sort results
    if (sort_by === 'distance' && results.some(r => r.distance_km !== null)) {
      results.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    } else if (sort_by === 'hidden_gem') {
      results.sort((a, b) => b.hidden_gem_score - a.hidden_gem_score);
    } else {
      // Default: relevance (match_score)
      results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    }
    
    const topResults = results.slice(0, limit);
    
    console.log(`✅ Found ${results.length} items, returning top ${topResults.length}`);
    if (topResults.length > 0 && topResults[0].hidden_gem_badge) {
      console.log(`💎 Top result is a ${topResults[0].hidden_gem_badge.label}!`);
    }
    
    return topResults;
  }


  async addRestaurantMenu(restaurantData) {
    const {
      restaurant_id,
      restaurant_name,
      location,
      menu_items = [],
      delivery_platforms = {},
      opening_hours = {},
      replace_existing = false
    } = restaurantData;

    if (!restaurant_id || !restaurant_name || !location) {
      throw new Error('Missing required fields: restaurant_id, restaurant_name, location');
    }

    const key = `${location.country_code}_${location.city}_${restaurant_id}`.replace(/\s+/g, '_').toLowerCase();
    
    const processedItems = menu_items.map((item, index) => ({
      menu_item_id: item.menu_item_id || `${restaurant_id}_${index}_${Date.now()}`,
      name: item.name ? item.name.trim() : `Item ${index + 1}`,
      emoji: item.emoji || this.getEmoji(item),
      price: item.price || '—',
      description: item.description || '',
      category: item.category || 'main',
      tags: Array.isArray(item.tags) ? item.tags : [],
      meal_period: item.meal_period || this.detectMealPeriod(item),
      search_tags: this.generateSearchTags(item),
      dietary: {
        vegetarian: Boolean(item.dietary && item.dietary.vegetarian),
        vegan: Boolean(item.dietary && item.dietary.vegan),
        gluten_free: Boolean(item.dietary && item.dietary.gluten_free),
        dairy_free: Boolean(item.dietary && item.dietary.dairy_free),
        halal: Boolean(item.dietary && item.dietary.halal)
      },
      available: item.available !== false,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const menuEntry = {
      restaurant_id,
      restaurant_name,
      location: {
        city: location.city,
        country_code: (location.country_code || 'GB').toUpperCase(),
        address: location.address || ''
      },
      menu_items: processedItems,
      delivery_platforms, 
      opening_hours,
      cuisine_type: this.detectCuisineType(processedItems),
      updated_at: new Date().toISOString(),
      created_at: this.menus.has(key) ? this.menus.get(key).created_at : new Date().toISOString()
    };

    this.menus.set(key, menuEntry);
    this.updateStats();
    await this.saveMenus();
    
    console.log(`✅ ${replace_existing ? 'Updated' : 'Added'} menu for ${restaurant_name}: ${processedItems.length} items`);
    
    return { 
      success: true, 
      restaurant_id, 
      items_added: processedItems.length,
      menu_key: key
    };
  }

  async addMenuItem(itemData, restaurantId = 'default_restaurant') {
    const restaurantKey = Array.from(this.menus.keys()).find(key => key.includes(restaurantId));
    
    if (restaurantKey) {
      const restaurant = this.menus.get(restaurantKey);
      const newItem = {
        menu_item_id: itemData.menu_item_id || `${restaurantId}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        name: itemData.name ? itemData.name.trim() : 'New Item',
        emoji: itemData.emoji || this.getEmoji(itemData),
        price: itemData.price || '—',
        description: itemData.description || '',
        tags: Array.isArray(itemData.tags) ? itemData.tags : [],
        meal_period: itemData.meal_period || this.detectMealPeriod(itemData),
        search_tags: this.generateSearchTags(itemData),
        available: itemData.available !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      restaurant.menu_items.push(newItem);
      restaurant.updated_at = new Date().toISOString();
      
      this.updateStats();
      await this.saveMenus();
      
      return newItem;
    } else {
      return await this.addRestaurantMenu({
        restaurant_id: restaurantId,
        restaurant_name: `Restaurant ${restaurantId}`,
        location: { city: 'London', country_code: 'GB' },
        menu_items: [itemData]
      });
    }
  }

  detectCuisineType(items) {
    const cuisineIndicators = {
      'italian': /pizza|pasta|risotto|lasagna|spaghetti|ravioli/i,
      'indian': /curry|tikka|masala|biryani|naan|dal|samosa/i,
      'chinese': /fried rice|sweet sour|chow mein|dim sum|wonton/i,
      'japanese': /sushi|ramen|tempura|teriyaki|miso|udon|sashimi/i,
      'mexican': /burrito|taco|quesadilla|nachos|salsa|guacamole/i,
      'american': /burger|bbq|wings|fries|mac cheese|sandwich/i,
      'thai': /pad thai|tom yum|green curry|massaman|som tam/i,
      'british': /fish chips|shepherd pie|bangers mash|sunday roast/i
    };

    const itemNames = items.map(item => item.name).join(' ').toLowerCase();
    
    for (const [cuisine, pattern] of Object.entries(cuisineIndicators)) {
      if (pattern.test(itemNames)) {
        return cuisine;
      }
    }
    
    return 'international';
  }

  detectMealPeriod(item) {
    const name = (item.name || '').toLowerCase();
    const tags = (item.tags || []).join(' ').toLowerCase();
    const text = `${name} ${tags}`.toLowerCase();
    
    if (/breakfast|pancake|waffle|omelette|eggs|bacon|cereal|croissant|porridge|toast|granola|yogurt/i.test(text)) {
      return 'breakfast';
    }
    
    if (/lunch|sandwich|salad|wrap|soup|light meal/i.test(text)) {
      return 'lunch';
    }
    
    if (/dinner|steak|roast|curry|pasta|main course|hearty/i.test(text)) {
      return 'dinner';
    }
    
    if (/snack|chips|nuts|fruit|cake|cookie|pastry/i.test(text)) {
      return 'snack';
    }

    return item.meal_period || 'all_day';
  }

  generateSearchTags(item) {
    const tags = [...(item.tags || [])];
    const name = (item.name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const text = `${name} ${description}`;
    
    if (/curry|tikka|masala|biryani|dal|naan/i.test(text)) tags.push('indian');
    if (/sushi|ramen|tempura|teriyaki|miso/i.test(text)) tags.push('japanese');
    if (/pasta|pizza|risotto|italian/i.test(text)) tags.push('italian');
    if (/burger|fries|wings|american/i.test(text)) tags.push('american');
    if (/taco|burrito|mexican|salsa/i.test(text)) tags.push('mexican');
    if (/fish.*chips|british|pie/i.test(text)) tags.push('british');
    
    if (/vegan|plant.*based/i.test(text)) tags.push('vegan');
    if (/vegetarian|veggie/i.test(text)) tags.push('vegetarian');
    if (/gluten.*free/i.test(text)) tags.push('gluten-free');
    if (/spicy|hot|chili/i.test(text)) tags.push('spicy');
    if (/healthy|light|fresh/i.test(text)) tags.push('healthy');
    if (/comfort|hearty|filling/i.test(text)) tags.push('comfort');
    
    if (/fried|crispy|crunchy/i.test(text)) tags.push('fried');
    if (/grilled|barbecue|bbq/i.test(text)) tags.push('grilled');
    if (/fresh|raw|salad/i.test(text)) tags.push('fresh');
    
    return [...new Set(tags)];
  }

  getEmoji(item) {
    const name = (item.name || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    
    if (/pizza/i.test(name)) return '🍕';
    if (/burger/i.test(name)) return '🍔';
    if (/pasta|spaghetti/i.test(name)) return '🍝';
    if (/sushi/i.test(name)) return '🍣';
    if (/ramen|noodle/i.test(name)) return '🍜';
    if (/curry|rice/i.test(name)) return '🍛';
    if (/salad/i.test(name)) return '🥗';
    if (/fish/i.test(name)) return '🐟';
    if (/chicken/i.test(name)) return '🍗';
    if (/steak|beef/i.test(name)) return '🥩';
    if (/taco/i.test(name)) return '🌮';
    if (/sandwich|sub/i.test(name)) return '🥪';
    if (/fries|chips/i.test(name)) return '🍟';
    if (/cake|dessert/i.test(name)) return '🍰';
    if (/coffee/i.test(name)) return '☕';
    if (/beer/i.test(name)) return '🍺';
    if (/wine/i.test(name)) return '🍷';
    
    const categoryEmojis = {
      'appetizer': '🥗',
      'main': '🍽️',
      'dessert': '🍰',
      'drink': '🥤',
      'soup': '🍲',
      'breakfast': '🥞',
      'lunch': '🍽️',
      'dinner': '🍽️',
      'snack': '🍪'
    };
    
    return categoryEmojis[category] || item.emoji || '🍽️';
  }

  // async searchMenus({ location, mood_text = '', dietary = [], meal_period = 'all_day', attributes = [], limit = 10, timeContext = null }) {
  //   const results = [];
  //   const locationKey = `${(location && location.country_code ? location.country_code : 'GB').toLowerCase()}_${(location && location.city ? location.city : '').toLowerCase()}`;
    
  //   console.log(`🔍 Searching menus for location: ${locationKey}, meal: ${meal_period}`);
    
  //   for (const [key, menu] of this.menus) {
  //     const menuLocation = `${menu.location.country_code.toLowerCase()}_${menu.location.city.toLowerCase()}`;
  //     if (!menuLocation.includes(location && location.country_code ? location.country_code.toLowerCase() : '') && 
  //         !key.includes(location && location.city ? location.city.toLowerCase() : '')) {
  //       continue;
  //     }
  //    if (timeContext && menu.opening_hours) {
  //   const now = new Date();
  //   const currentDay = now.toLocaleDateString('en', {weekday: 'long'}).toLowerCase();
  //   const currentTime = now.toTimeString().slice(0,5);
    
  //   const todayHours = menu.opening_hours[currentDay];
  //   if (!todayHours || currentTime < todayHours.open || currentTime > todayHours.close) {
  //     console.log(`⏰ Skipping ${menu.restaurant_name} - closed (${currentTime} not between ${todayHours?.open}-${todayHours?.close})`);
  //     continue; // Skip closed restaurants
  //   }
  // } 
  //     const matchingItems = menu.menu_items.filter(item => {
  //       if (!item.available) return false;
        
  //       if (meal_period !== 'all_day' && 
  //           item.meal_period !== 'all_day' && 
  //           item.meal_period !== meal_period) {
  //         return false;
  //       }
        
  //       if (dietary.length > 0) {
  //         for (const restriction of dietary) {
  //           const normalizedRestriction = restriction.replace('-', '_');
  //           if (!item.dietary || !item.dietary[normalizedRestriction]) {
  //             return false;
  //           }
  //         }
  //       }
        
  //       let score = Math.random() * 5;
  //       const itemText = `${item.name} ${item.description || ''} ${(item.search_tags || []).join(' ')}`.toLowerCase();
        
  //       if (mood_text) {
  //         const moodWords = mood_text.toLowerCase().split(/\s+/);
  //         for (const word of moodWords) {
  //           if (word.length > 2 && itemText.includes(word)) {
  //             score += 10;
  //           }
  //         }
  //       }
        
  //       for (const attr of attributes) {
  //         if (itemText.includes(attr.toLowerCase())) {
  //           score += 8;
  //         }
  //       }
        
  //       item.match_score = score;
  //       return true;
  //     });
      
  //     matchingItems.forEach(item => {
  //       results.push({
  //         ...item,
  //         restaurant_name: menu.restaurant_name,
  //         restaurant_id: menu.restaurant_id,
  //         delivery_platforms: menu.delivery_platforms,
  //         location: menu.location,
  //         cuisine_type: menu.cuisine_type
  //       });
  //     });
  //   }
    
  //   results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  //   const topResults = results.slice(0, limit);
    
  //   console.log(`✅ Found ${results.length} items, returning top ${topResults.length}`);
  //   return topResults;
  // }

  getAllMenuItems() {
    const allItems = [];
    for (const [, menu] of this.menus) {
      menu.menu_items.forEach(item => {
        allItems.push({
          ...item,
          restaurant_name: menu.restaurant_name,
          restaurant_id: menu.restaurant_id
        });
      });
    }
    return allItems;
  }

  getMenuCount() {
    return this.menuStats.total_items;
  }

  getRestaurantCount() {
    return this.menuStats.total_restaurants;
  }

  getDeliveryLink(restaurant_id, platform = 'any') {
    for (const [, menu] of this.menus) {
      if (menu.restaurant_id === restaurant_id) {
        const platforms = menu.delivery_platforms || {};
        
        if (platform === 'any') {
          if (platforms.deliveroo_id) return `https://deliveroo.co.uk/menu/${platforms.deliveroo_id}`;
          if (platforms.ubereats_id) return `https://www.ubereats.com/store/${platforms.ubereats_id}`;
          if (platforms.doordash_id) return `https://www.doordash.com/store/${platforms.doordash_id}`;
        } else if (platforms[`${platform}_id`]) {
          return this.buildPlatformLink(platform, platforms[`${platform}_id`]);
        }
        
        return `https://www.google.com/search?q=${encodeURIComponent(menu.restaurant_name + ' ' + menu.location.city + ' delivery')}`;
      }
    }
    return null;
  }

  buildPlatformLink(platform, id) {
    const templates = {
      'deliveroo': `https://deliveroo.co.uk/menu/${id}`,
      'ubereats': `https://www.ubereats.com/store/${id}`,
      'doordash': `https://www.doordash.com/store/${id}`,
      'grubhub': `https://www.grubhub.com/restaurant/${id}`
    };
    return templates[platform] || null;
  }

  async removeMenuItem(itemId) {
    for (const [key, menu] of this.menus) {
      const itemIndex = menu.menu_items.findIndex(item => 
        item.menu_item_id === itemId || item.name === itemId
      );
      
      if (itemIndex !== -1) {
        const removedItem = menu.menu_items.splice(itemIndex, 1)[0];
        menu.updated_at = new Date().toISOString();
        
        this.updateStats();
        await this.saveMenus();
        
        console.log(`🗑️ Removed menu item: ${removedItem.name}`);
        return { success: true, removed_item: removedItem.name };
      }
    }
    
    return { success: false, error: 'Item not found' };
  }

  getStats() {
    return {
      ...this.menuStats,
      restaurants_by_country: this.getRestaurantsByCountry(),
      top_cuisines: this.getTopCuisines()
    };
  }

  getRestaurantsByCountry() {
    const byCountry = {};
    for (const [, menu] of this.menus) {
      const cc = menu.location.country_code;
      byCountry[cc] = (byCountry[cc] || 0) + 1;
    }
    return byCountry;
  }

  getTopCuisines() {
    const cuisines = {};
    for (const [, menu] of this.menus) {
      const cuisine = menu.cuisine_type || 'unknown';
      cuisines[cuisine] = (cuisines[cuisine] || 0) + 1;
    }
    return Object.entries(cuisines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine, count]) => ({ cuisine, count }));
  }
}

export const menuManager = new MenuManager();

export async function recommendFromMenus(params) {
  const { 
    location, 
    target_location, // NEW
    search_radius = 5, // NEW
    mood_text, 
    dietary, 
    meal_period, 
    cravingAttributes, 
    timeContext,
    prioritize_hidden_gems = false // NEW
  } = params;
  
  try {
    const menuItems = await menuManager.searchMenus({
      location,
      target_location,
      search_radius,
      mood_text,
      dietary: dietary || [],
      meal_period: meal_period || 'all_day',
      attributes: cravingAttributes || [],
      timeContext,
      limit: 6,
      sort_by: prioritize_hidden_gems ? 'hidden_gem' : 'relevance'
    });
    
    console.log(`🔍 Menu search found ${menuItems.length} matching items`);
    
    if (menuItems.length === 0) {
      console.log('🔍 No menu items found matching criteria');
      return null;
    }
    
    const formatted = menuItems.slice(0, 3).map(item => ({
      name: item.name,
      emoji: item.emoji || '🍽️',
      explanation: `${item.description || ''} ${item.hidden_gem_badge ? `• ${item.hidden_gem_badge.emoji} ${item.hidden_gem_badge.label}` : ''}`.trim(),
      restaurant: {
        name: item.restaurant_name,
        link: item.restaurant_link.url,
        link_type: item.restaurant_link.type,
        link_label: item.restaurant_link.label,
        address: item.location?.address,
        distance: item.distance_km ? `${item.distance_km.toFixed(1)}km away` : null,
        rating: item.restaurant_rating,
        reviews: item.restaurant_review_count
      },
      price: item.price,
      hidden_gem: item.hidden_gem_badge,
      source: 'restaurant_menu',
      cuisine_type: item.cuisine_type,
      dietary_info: item.dietary,
      availability: item.availability
    }));
    
    console.log(`🍽️ Returning ${formatted.length} restaurant recommendations`);
    return formatted;
    
  } catch (error) {
    console.error('❌ Menu recommendation error:', error);
    return null;
  }
}

export async function addSampleRestaurants() {
  const samples = [
    {
      restaurant_id: 'dishoom_covent_garden',
      restaurant_name: 'Dishoom Covent Garden',
      location: {
        city: 'London',
        country_code: 'GB',
        address: '12 Upper St Martin\'s Lane, London WC2H 9FB'
      },
      delivery_platforms: {
        deliveroo_id: 'dishoom-covent-garden',
        ubereats_id: 'dishoom-london'
      },
      menu_items: [
        {
          name: 'Bacon Naan Roll',
          emoji: '🥓',
          price: '£7.50',
          description: 'Crispy bacon in fresh naan with cream cheese and herbs',
          tags: ['breakfast', 'signature', 'meat'],
          meal_period: 'breakfast',
          dietary: { vegetarian: false, vegan: false }
        },
        {
          name: 'House Black Daal',
          emoji: '🍛',
          price: '£8.90',  
          description: '24-hour slow-cooked black lentils, rich and creamy',
          tags: ['comfort', 'vegetarian', 'signature', 'curry'],
          meal_period: 'all_day',
          dietary: { vegetarian: true, vegan: false }
        }
      ]
    },
    {
      restaurant_id: 'pizza_pilgrims_soho',
      restaurant_name: 'Pizza Pilgrims Soho',
      location: {
        city: 'London',
        country_code: 'GB'
      },
      menu_items: [
        {
          name: 'Margherita Pizza',
          emoji: '🍕',
          price: '£9.50',
          description: 'San Marzano tomatoes, mozzarella, fresh basil',
          tags: ['vegetarian', 'classic', 'italian'],
          dietary: { vegetarian: true }
        }
      ]
    }
  ];

  for (const sample of samples) {
    await menuManager.addRestaurantMenu(sample);
  }
  
  console.log('✅ Added sample restaurants');
  return { success: true, added: samples.length };
}

console.log('📋 Enhanced Menu Manager with Location Flexibility & Hidden Gems initialized');