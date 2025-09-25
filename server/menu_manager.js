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

  async searchMenus({ location, mood_text = '', dietary = [], meal_period = 'all_day', attributes = [], limit = 10 }) {
    const results = [];
    const locationKey = `${(location && location.country_code ? location.country_code : 'GB').toLowerCase()}_${(location && location.city ? location.city : '').toLowerCase()}`;
    
    console.log(`🔍 Searching menus for location: ${locationKey}, meal: ${meal_period}`);
    
    for (const [key, menu] of this.menus) {
      const menuLocation = `${menu.location.country_code.toLowerCase()}_${menu.location.city.toLowerCase()}`;
      if (!menuLocation.includes(location && location.country_code ? location.country_code.toLowerCase() : '') && 
          !key.includes(location && location.city ? location.city.toLowerCase() : '')) {
        continue;
      }
      
      const matchingItems = menu.menu_items.filter(item => {
        if (!item.available) return false;
        
        if (meal_period !== 'all_day' && 
            item.meal_period !== 'all_day' && 
            item.meal_period !== meal_period) {
          return false;
        }
        
        if (dietary.length > 0) {
          for (const restriction of dietary) {
            const normalizedRestriction = restriction.replace('-', '_');
            if (!item.dietary || !item.dietary[normalizedRestriction]) {
              return false;
            }
          }
        }
        
        let score = Math.random() * 5;
        const itemText = `${item.name} ${item.description || ''} ${(item.search_tags || []).join(' ')}`.toLowerCase();
        
        if (mood_text) {
          const moodWords = mood_text.toLowerCase().split(/\s+/);
          for (const word of moodWords) {
            if (word.length > 2 && itemText.includes(word)) {
              score += 10;
            }
          }
        }
        
        for (const attr of attributes) {
          if (itemText.includes(attr.toLowerCase())) {
            score += 8;
          }
        }
        
        item.match_score = score;
        return true;
      });
      
      matchingItems.forEach(item => {
        results.push({
          ...item,
          restaurant_name: menu.restaurant_name,
          restaurant_id: menu.restaurant_id,
          delivery_platforms: menu.delivery_platforms,
          location: menu.location,
          cuisine_type: menu.cuisine_type
        });
      });
    }
    
    results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    const topResults = results.slice(0, limit);
    
    console.log(`✅ Found ${results.length} items, returning top ${topResults.length}`);
    return topResults;
  }

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
  const { location, mood_text, dietary, meal_period, cravingAttributes } = params;
  
  try {
    const menuItems = await menuManager.searchMenus({
      location,
      mood_text,
      dietary: dietary || [],
      meal_period: meal_period || 'all_day',
      attributes: cravingAttributes || [],
      limit: 6
    });
    
    if (menuItems.length === 0) {
      console.log('🔍 No menu items found matching criteria');
      return null;
    }
    
    const formatted = menuItems.slice(0, 3).map(item => ({
      name: item.name,
      emoji: item.emoji || '🍽️',
      explanation: item.description || `Available at ${item.restaurant_name}`,
      restaurant: item.restaurant_name,
      price: item.price,
      delivery_link: menuManager.getDeliveryLink(item.restaurant_id),
      source: 'restaurant_menu',
      cuisine_type: item.cuisine_type,
      dietary_info: item.dietary
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

console.log('📋 Enhanced Menu Manager initialized');