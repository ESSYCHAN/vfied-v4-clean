// server/menu_manager.js
// Enhanced restaurant menu storage and retrieval for VFIED with Firebase Admin integration

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Firebase Admin for server-side operations
let adminDb = null;
let useFirebaseAdmin = false;

try {
  const firebaseAdmin = await import('./firebase-admin.js');
  adminDb = firebaseAdmin.adminDb;
  useFirebaseAdmin = Boolean(adminDb);
  console.log('🔥 Firebase Admin SDK loaded successfully');
} catch (error) {
  console.log('📋 Firebase Admin not available, using local storage only');
}

class EnhancedMenuManager {
  constructor() {
    this.menuDataPath = path.resolve(__dirname, '../data/restaurant_menus.json');
    this.localMenus = new Map();
    this.menuStats = { total_items: 0, total_restaurants: 0, last_updated: null };
    this.initialized = false;
    this.useFirebase = useFirebaseAdmin;
    
    // Initialize local storage
    this.loadLocalMenus().catch(console.error);
  }

  async ensureDataDirectory() {
    const dataDir = path.dirname(this.menuDataPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  async loadLocalMenus() {
    try {
      await this.ensureDataDirectory();
      const data = await fs.readFile(this.menuDataPath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.menus) {
        Object.entries(parsed.menus).forEach(([key, menu]) => {
          this.localMenus.set(key, menu);
        });
        this.menuStats = parsed.stats || this.menuStats;
      } else {
        Object.entries(parsed).forEach(([key, menu]) => {
          this.localMenus.set(key, menu);
        });
      }
      
      this.updateLocalStats();
      this.initialized = true;
      console.log(`📋 Loaded ${this.menuStats.total_items} local menu items from ${this.menuStats.total_restaurants} restaurants`);
    } catch (error) {
      console.log('📋 No existing local menus found, starting fresh');
      this.localMenus = new Map();
      this.updateLocalStats();
      this.initialized = true;
    }
  }

  async saveLocalMenus() {
    if (!this.initialized) return;
    
    try {
      await this.ensureDataDirectory();
      const data = {
        menus: Object.fromEntries(this.localMenus),
        stats: this.menuStats,
        last_saved: new Date().toISOString()
      };
      await fs.writeFile(this.menuDataPath, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${this.menuStats.total_items} local menu items`);
    } catch (error) {
      console.error('❌ Failed to save local menus:', error.message);
    }
  }

  updateLocalStats() {
    let totalItems = 0;
    for (const [, menu] of this.localMenus) {
      totalItems += (menu.menu_items || []).length;
    }
    
    this.menuStats = {
      total_items: totalItems,
      total_restaurants: this.localMenus.size,
      last_updated: new Date().toISOString()
    };
  }

  // ===============================
  // FIREBASE ADMIN OPERATIONS
  // ===============================

  async addRestaurantToFirebase(restaurantData) {
    if (!adminDb) throw new Error('Firebase Admin not available');
    
    const {
      restaurant_id,
      restaurant_name,
      location,
      menu_items = [],
      delivery_platforms = {},
      opening_hours = {},
      metadata = {}
    } = restaurantData;

    const batch = adminDb.batch();
    
    // Create restaurant document
    const restaurantRef = adminDb.collection('restaurants').doc(restaurant_id);
    
    const restaurantDoc = {
      restaurant_id,
      basic_info: {
        name: restaurant_name,
        cuisine_type: this.detectCuisineType(menu_items),
        description: metadata.description || '',
        website: metadata.website || '',
        phone: metadata.phone || ''
      },
      location: {
        city: location.city,
        country_code: location.country_code,
        address: location.address || '',
        coordinates: location.coordinates ? 
          new adminDb.GeoPoint(location.coordinates.lat, location.coordinates.lng) : null
      },
      business_info: {
        opening_hours,
        delivery_platforms,
        price_range: metadata.price_range || '$$'
      },
      metadata: {
        goals: metadata.goals || [],
        menu_size: `${menu_items.length} items`,
        signup_source: 'menu_manager'
      },
      verification: {
        admin_approved: true,
        data_source: 'menu_manager',
        claimed_by: null
      },
      metrics: {
        total_menu_items: menu_items.length,
        views: 0,
        recommendations_count: 0,
        last_menu_update: adminDb.FieldValue.serverTimestamp()
      },
      created_at: adminDb.FieldValue.serverTimestamp(),
      updated_at: adminDb.FieldValue.serverTimestamp()
    };
    
    batch.set(restaurantRef, restaurantDoc);
    
    // Add menu items
    for (const [index, item] of menu_items.entries()) {
      const itemId = `${restaurant_id}_${index}_${Date.now()}`;
      const menuItemRef = adminDb.collection('menu_items').doc(itemId);
      
      const menuItemDoc = {
        menu_item_id: itemId,
        restaurant_id,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'main',
          emoji: item.emoji || this.getEmoji(item)
        },
        classification: {
          meal_period: item.meal_period || this.detectMealPeriod(item),
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: Boolean(item.dietary?.vegetarian),
            vegan: Boolean(item.dietary?.vegan),
            gluten_free: Boolean(item.dietary?.gluten_free),
            dairy_free: Boolean(item.dietary?.dairy_free),
            halal: Boolean(item.dietary?.halal)
          }
        },
        availability: {
          available: item.available !== false,
          seasonal: item.seasonal || false,
          daily_limit: item.daily_limit || null
        },
        metrics: {
          views: 0,
          orders: 0,
          recommendation_count: 0
        },
        created_at: adminDb.FieldValue.serverTimestamp(),
        updated_at: adminDb.FieldValue.serverTimestamp()
      };
      
      batch.set(menuItemRef, menuItemDoc);
    }
    
    await batch.commit();
    
    console.log(`🔥 Added restaurant ${restaurant_id} to Firebase with ${menu_items.length} items`);
    return { success: true, restaurant_id, items_added: menu_items.length };
  }

  async getFirebaseRestaurantsAdmin() {
    if (!adminDb) return [];
    
    try {
      const snapshot = await adminDb.collection('restaurants')
        .where('verification.admin_approved', '==', true)
        .limit(100)
        .get();
      
      const restaurants = [];
      
      for (const doc of snapshot.docs) {
        const restaurantData = { id: doc.id, ...doc.data() };
        
        // Get menu items for this restaurant
        const menuSnapshot = await adminDb.collection('menu_items')
          .where('restaurant_id', '==', doc.id)
          .get();
        
        const menu_items = menuSnapshot.docs.map(menuDoc => {
          const item = menuDoc.data();
          return {
            menu_item_id: item.menu_item_id,
            name: item.basic_info?.name,
            description: item.basic_info?.description,
            price: item.basic_info?.price,
            emoji: item.basic_info?.emoji,
            category: item.basic_info?.category,
            meal_period: item.classification?.meal_period,
            dietary: item.classification?.dietary,
            tags: item.classification?.cuisine_tags,
            available: item.availability?.available
          };
        });
        
        // Convert to expected format
        restaurants.push({
          restaurant_id: restaurantData.restaurant_id || restaurantData.id,
          restaurant_name: restaurantData.basic_info?.name,
          location: restaurantData.location,
          cuisine_type: restaurantData.basic_info?.cuisine_type,
          opening_hours: restaurantData.business_info?.opening_hours || {},
          delivery_platforms: restaurantData.business_info?.delivery_platforms || {},
          metadata: restaurantData.metadata || {},
          menu_items,
          data_source: 'firebase'
        });
      }
      
      console.log(`🔥 Retrieved ${restaurants.length} restaurants from Firebase Admin`);
      return restaurants;
    } catch (error) {
      console.error('🔥 Firebase Admin fetch error:', error);
      return [];
    }
  }

  async getFirebaseStatsAdmin() {
    if (!adminDb) return null;
    
    try {
      const [restaurantsSnapshot, menuItemsSnapshot, eventsSnapshot] = await Promise.all([
        adminDb.collection('restaurants').get(),
        adminDb.collection('menu_items').get(),
        adminDb.collection('events').get()
      ]);
      
      const pendingEventsSnapshot = await adminDb.collection('events')
        .where('moderation.status', '==', 'pending')
        .get();
      
      return {
        total_restaurants: restaurantsSnapshot.size,
        total_menu_items: menuItemsSnapshot.size,
        total_events: eventsSnapshot.size,
        pending_events: pendingEventsSnapshot.size
      };
    } catch (error) {
      console.error('🔥 Firebase Admin stats error:', error);
      return null;
    }
  }

  // ===============================
  // UNIFIED DATA ACCESS METHODS
  // ===============================

  async getMenuData(source = 'hybrid') {
    switch(source) {
      case 'firebase':
        if (!this.useFirebase) {
          throw new Error('Firebase not available');
        }
        return await this.getFirebaseMenus();
      case 'local': 
        return await this.getLocalMenus();
      case 'hybrid':
      default:
        const firebase = this.useFirebase ? await this.getFirebaseMenus() : [];
        const local = await this.getLocalMenus();
        return this.mergeMenuSources(firebase, local);
    }
  }

  async getFirebaseMenus() {
    if (!this.useFirebase || !adminDb) {
      return [];
    }
    
    return await this.getFirebaseRestaurantsAdmin();
  }

  async getLocalMenus() {
    const menus = [];
    for (const [, menu] of this.localMenus) {
      menus.push(menu);
    }
    return menus;
  }

  mergeMenuSources(firebaseRestaurants, localMenus) {
    const merged = new Map();
    
    // Add Firebase restaurants (primary source)
    firebaseRestaurants.forEach(restaurant => {
      const key = this.generateRestaurantKey(restaurant);
      merged.set(key, {
        ...restaurant,
        data_source: 'firebase',
        priority: 1
      });
    });
    
    // Add local restaurants that don't conflict
    localMenus.forEach(menu => {
      const key = this.generateRestaurantKey(menu);
      if (!merged.has(key)) {
        merged.set(key, {
          ...menu,
          data_source: 'local',
          priority: 2
        });
      }
    });
    
    console.log(`🔄 Merged ${merged.size} restaurants (${firebaseRestaurants.length} from Firebase, ${localMenus.length} local)`);
    return Array.from(merged.values());
  }

  generateRestaurantKey(restaurant) {
    const name = (restaurant.basic_info?.name || restaurant.restaurant_name || '').toLowerCase();
    const city = (restaurant.location?.city || '').toLowerCase();
    const country = (restaurant.location?.country_code || 'GB').toLowerCase();
    return `${country}_${city}_${name}`.replace(/\s+/g, '_');
  }

  // ===============================
  // RESTAURANT MANAGEMENT
  // ===============================

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

    // Try Firebase Admin first if available
    if (this.useFirebase && adminDb) {
      try {
        const result = await this.addRestaurantToFirebase(restaurantData);
        console.log(`🔥 Added restaurant to Firebase: ${restaurant_name}`);
        
        // Also save locally as backup
        await this.addToLocalStorage(restaurantData);
        
        return result;
      } catch (error) {
        console.error('🔥 Firebase Admin add failed, using local storage:', error);
        return await this.addToLocalStorage(restaurantData);
      }
    } else {
      return await this.addToLocalStorage(restaurantData);
    }
  }

  async addToLocalStorage(restaurantData) {
    const {
      restaurant_id,
      restaurant_name,
      location,
      menu_items = [],
      delivery_platforms = {},
      opening_hours = {},
      replace_existing = false
    } = restaurantData;

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

    const existingEntry = this.localMenus.get(key);
    const media = {
      hero_image: restaurantData.media?.hero_image || restaurantData.hero_image || existingEntry?.media?.hero_image || null,
      gallery: Array.isArray(restaurantData.media?.gallery)
        ? restaurantData.media.gallery
        : Array.isArray(restaurantData.images)
          ? restaurantData.images
          : existingEntry?.media?.gallery || [],
      logo: restaurantData.media?.logo || restaurantData.logo || existingEntry?.media?.logo || null,
      primary_color: restaurantData.media?.primary_color || existingEntry?.media?.primary_color || null
    };

    const combinedMetadata = {
      ...(existingEntry?.metadata || {}),
      ...(restaurantData.metadata || {}),
      reviews: restaurantData.metadata?.reviews || existingEntry?.metadata?.reviews || existingEntry?.reviews || undefined
    };

    const metrics = {
      ...(existingEntry?.metrics || {}),
      ...(restaurantData.metrics || {}),
      total_menu_items: processedItems.length,
      last_scored_at: new Date().toISOString()
    };

    const menuEntry = {
      restaurant_id,
      restaurant_name,
      location: {
        city: location.city,
        country_code: (location.country_code || 'GB').toUpperCase(),
        address: location.address || '',
        neighborhood: location.neighborhood || existingEntry?.location?.neighborhood || ''
      },
      menu_items: processedItems,
      delivery_platforms, 
      opening_hours,
      cuisine_type: this.detectCuisineType(processedItems),
      metadata: combinedMetadata,
      metrics,
      media,
      updated_at: new Date().toISOString(),
      created_at: existingEntry?.created_at || new Date().toISOString()
    };

    this.localMenus.set(key, menuEntry);
    this.updateLocalStats();
    await this.saveLocalMenus();
    
    console.log(`✅ ${replace_existing ? 'Updated' : 'Added'} local menu for ${restaurant_name}: ${processedItems.length} items`);
    
    return { 
      success: true, 
      restaurant_id, 
      items_added: processedItems.length,
      menu_key: key
    };
  }

  // ===============================
  // ENHANCED SEARCH WITH HYBRID SOURCES
  // ===============================

  async searchMenus({ 
    location, 
    target_location = null,
    search_radius = 10,
    mood_text = '', 
    dietary = [], 
    meal_period = 'all_day', 
    attributes = [], 
    limit = 10, 
    timeContext = null,
    sort_by = 'relevance',
    data_source = 'hybrid'
  }) {
    
    try {
      // Get menu data based on source preference
      const restaurants = await this.getMenuData(data_source);
      const results = [];
      const searchLoc = target_location || location;
      
      console.log(`🔍 Searching ${restaurants.length} restaurants (source: ${data_source})`);
      
      for (const restaurant of restaurants) {
        // Handle different data structures (Firebase vs local)
        const menuItems = this.extractMenuItems(restaurant);
        const restaurantInfo = this.normalizeRestaurantInfo(restaurant);
        
        // Location filtering
        if (!this.matchesLocation(restaurantInfo, searchLoc, search_radius)) {
          continue;
        }
        
        // Opening hours check
        if (timeContext && !this.isRestaurantOpen(restaurantInfo, timeContext)) {
          continue;
        }
        
        // Filter and score menu items
        const matchingItems = menuItems.filter(item => {
          return this.itemMatchesFilters(item, {
            meal_period,
            dietary,
            attributes,
            mood_text
          });
        });
        
        // Score and add matching items
        matchingItems.forEach(item => {
          const score = this.calculateItemScore(item, restaurantInfo, {
            mood_text,
            attributes,
            timeContext
          });
          
          const link = this.buildRestaurantLink(restaurantInfo);
          const gemScore = this.calculateHiddenGemScore(restaurantInfo, item);
          const gemBadge = this.getHiddenGemBadge(gemScore);
          
          results.push({
            ...this.normalizeMenuItem(item),
            restaurant_name: restaurantInfo.restaurant_name,
            restaurant_id: restaurantInfo.restaurant_id,
            restaurant_link: link,
            hidden_gem_score: gemScore,
            hidden_gem_badge: gemBadge,
            location: restaurantInfo.location,
            cuisine_type: restaurantInfo.cuisine_type,
            price_range: restaurantInfo.price_range,
            match_score: score,
            data_source: restaurant.data_source || 'local',
            restaurant_media: restaurantInfo.media,
            restaurant_metrics: restaurantInfo.metrics,
            restaurant_reviews: restaurantInfo.reviews,
            restaurant_metadata: restaurantInfo.metadata
          });
        });
      }
      
      // Sort results
      this.sortResults(results, sort_by);
      
      const topResults = results.slice(0, limit);
      
      console.log(`✅ Found ${results.length} items, returning top ${topResults.length}`);
      if (topResults.length > 0 && topResults[0].hidden_gem_badge) {
        console.log(`💎 Top result is a ${topResults[0].hidden_gem_badge.label}!`);
      }
      
      return topResults;
      
    } catch (error) {
      console.error('❌ Menu search error:', error);
      
      // Fallback to local if hybrid fails
      if (data_source === 'hybrid') {
        console.log('🔄 Falling back to local search...');
        return this.searchMenus({
          location, target_location, search_radius, mood_text, dietary, 
          meal_period, attributes, limit, timeContext, sort_by,
          data_source: 'local'
        });
      }
      
      throw error;
    }
  }

  // ===============================
  // DATA NORMALIZATION HELPERS
  // ===============================

  async shortlistRestaurants(options = {}) {
    const {
      location = {},
      mood_text = '',
      dietary = [],
      attributes = [],
      limit = 5,
      per_restaurant_items = 3,
      sort_by = 'relevance',
      timeContext = null,
      data_source = 'hybrid'
    } = options;

    const started = Date.now();
    const normalizedDietary = Array.isArray(dietary)
      ? dietary.filter(Boolean).map(d => String(d).trim().toLowerCase())
      : (dietary ? [String(dietary).trim().toLowerCase()] : []);

    const rawLimit = Math.max(limit * per_restaurant_items * 2, limit * 3);

    const menuMatches = await this.searchMenus({
      location,
      mood_text,
      dietary: normalizedDietary,
      attributes,
      limit: rawLimit,
      sort_by,
      timeContext,
      data_source
    });

    const grouped = new Map();

    for (const item of menuMatches) {
      const key = item.restaurant_id || item.restaurant_name;
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          restaurant_id: item.restaurant_id,
          restaurant_name: item.restaurant_name,
          location: item.location,
          cuisine_type: item.cuisine_type,
          price_range: item.price_range || 'moderate',
          data_source: item.data_source,
          menu_samples: [],
          match_scores: [],
          gem_scores: [],
          hidden_gem_badge: null,
          media: item.restaurant_media || {},
          metrics: item.restaurant_metrics || {},
          reviews: item.restaurant_reviews || {},
          metadata: item.restaurant_metadata || {},
          primary_link: null
        });
      }

      const entry = grouped.get(key);
      const sample = {
        menu_item_id: item.menu_item_id,
        name: item.name,
        description: item.description,
        price: item.price,
        emoji: item.emoji,
        image: item.image,
        hidden_gem_score: item.hidden_gem_score,
        hidden_gem_badge: item.hidden_gem_badge
      };

      if (entry.menu_samples.length < per_restaurant_items) {
        entry.menu_samples.push(sample);
      }

      entry.match_scores.push(item.match_score || 0);
      entry.gem_scores.push(item.hidden_gem_score || 0);

      if (!entry.hidden_gem_badge && item.hidden_gem_badge) {
        entry.hidden_gem_badge = item.hidden_gem_badge;
      }

      if (item.hidden_gem_badge && item.hidden_gem_score >= Math.max(...entry.gem_scores)) {
        entry.hidden_gem_badge = item.hidden_gem_badge;
      }

      if (!entry.primary_link && item.restaurant_link) {
        entry.primary_link = item.restaurant_link;
      }
    }

    const shortlist = Array.from(grouped.values()).map(entry => {
      const avgMatch = entry.match_scores.length
        ? entry.match_scores.reduce((acc, v) => acc + v, 0) / entry.match_scores.length
        : 0;
      const avgGem = entry.gem_scores.length
        ? entry.gem_scores.reduce((acc, v) => acc + v, 0) / entry.gem_scores.length
        : 0;

      const heroImage = entry.media?.hero_image || entry.media?.gallery?.[0] || null;
      const gallery = Array.isArray(entry.media?.gallery) ? entry.media.gallery : (heroImage ? [heroImage] : []);

      const communityRatingRaw = entry.reviews?.average_rating ?? entry.reviews?.avg ?? entry.metrics?.average_rating ?? null;
      const ratingNumber = Number(communityRatingRaw);
      const hasRating = Number.isFinite(ratingNumber) && ratingNumber > 0;
      const communityRating = hasRating ? Number(ratingNumber.toFixed(1)) : null;
      const reviewCountRaw = entry.reviews?.count ?? entry.reviews?.total ?? entry.metrics?.review_count ?? 0;
      const reviewCount = Number(reviewCountRaw) || 0;

      const experienceScore = Math.round(
        Math.min(
          100,
          (avgMatch || 0) * 0.6 + (avgGem || 0) * 0.4
        )
      );

      const topSample = entry.menu_samples[0];
      const insight = topSample
        ? `${topSample.name}${topSample.description ? ' • ' + topSample.description : ''}`
        : 'Ask for the house specialty';

      const vibeTags = new Set();
      if (entry.hidden_gem_badge?.label) vibeTags.add(entry.hidden_gem_badge.label);
      if (entry.metadata?.vibe_tags) {
        (Array.isArray(entry.metadata.vibe_tags) ? entry.metadata.vibe_tags : [entry.metadata.vibe_tags])
          .filter(Boolean)
          .forEach(tag => vibeTags.add(tag));
      }

      return {
        restaurant_id: entry.restaurant_id,
        restaurant_name: entry.restaurant_name,
        location: entry.location,
        cuisine_type: entry.cuisine_type,
        price_range: entry.price_range,
        data_source: entry.data_source,
        menu_samples: entry.menu_samples,
        hidden_gem_badge: entry.hidden_gem_badge,
        hidden_gem_score: Math.round(avgGem),
        match_score: Math.round(avgMatch),
        experience_score: experienceScore,
        hero_image: heroImage,
        gallery,
        community_rating: communityRating,
        review_count: reviewCount,
        insight,
        vibe_tags: Array.from(vibeTags),
        metadata: entry.metadata,
        metrics: entry.metrics,
        primary_link: entry.primary_link,
        score_breakdown: {
          average_match: Number(avgMatch.toFixed(1)),
          average_hidden_gem: Number(avgGem.toFixed(1))
        }
      };
    })
      .sort((a, b) => b.experience_score - a.experience_score)
      .slice(0, limit);

    return {
      shortlist,
      total_considered: menuMatches.length,
      total_restaurants: grouped.size,
      generation_time_ms: Date.now() - started
    };
  }

  extractMenuItems(restaurant) {
    if (restaurant.menu_items && Array.isArray(restaurant.menu_items)) {
      return restaurant.menu_items;
    }
    return [];
  }

  normalizeRestaurantInfo(restaurant) {
    // Handle Firebase structure
    if (restaurant.basic_info) {
      return {
        restaurant_id: restaurant.restaurant_id || restaurant.id,
        restaurant_name: restaurant.basic_info.name,
        location: restaurant.location,
        cuisine_type: restaurant.basic_info.cuisine_type,
        price_range: restaurant.business_info?.price_range || restaurant.basic_info?.price_range || 'moderate',
        opening_hours: restaurant.business_info?.opening_hours || {},
        delivery_platforms: restaurant.business_info?.delivery_platforms || {},
        metadata: restaurant.metadata || {},
        metrics: restaurant.metrics || restaurant.metadata?.metrics || {},
        media: restaurant.media || restaurant.metadata?.media || {},
        reviews: restaurant.reviews || restaurant.metadata?.reviews || null,
        website: restaurant.basic_info?.website
      };
    }

    // Handle local structure
    return {
      restaurant_id: restaurant.restaurant_id,
      restaurant_name: restaurant.restaurant_name,
      location: restaurant.location,
      cuisine_type: restaurant.cuisine_type,
      price_range: restaurant.price_range || restaurant.metadata?.price_range || 'moderate',
      opening_hours: restaurant.opening_hours || {},
      delivery_platforms: restaurant.delivery_platforms || {},
      metadata: restaurant.metadata || {},
      metrics: restaurant.metrics || restaurant.metadata?.metrics || {},
      media: restaurant.media || restaurant.metadata?.media || {},
      reviews: restaurant.reviews || restaurant.metadata?.reviews || null,
      website: restaurant.website
    };
  }

  normalizeMenuItem(item) {
    // Handle Firebase structure
    if (item.basic_info) {
      return {
        menu_item_id: item.menu_item_id || item.id,
        name: item.basic_info.name,
        description: item.basic_info.description,
        price: item.basic_info.price,
        emoji: item.basic_info.emoji,
        category: item.basic_info.category,
        meal_period: item.classification?.meal_period || 'all_day',
        dietary: item.classification?.dietary || {},
        tags: item.classification?.cuisine_tags || [],
        available: item.availability?.available !== false,
        image: item.media?.primary || item.media?.image || item.basic_info?.image || null
      };
    }

    // Handle local structure
    return {
      ...item,
      image: item.image || item.image_url || item.photo || item.thumbnail || null
    };
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  matchesLocation(restaurant, searchLoc, searchRadius) {
    if (!searchLoc) return true;
    
    const hasCoords = searchLoc?.latitude && searchLoc?.longitude && 
                     restaurant.location?.coordinates;
    
    if (hasCoords) {
      const distance = this.calculateDistance(
        searchLoc.latitude,
        searchLoc.longitude,
        restaurant.location.coordinates.latitude || restaurant.location.coordinates._latitude,
        restaurant.location.coordinates.longitude || restaurant.location.coordinates._longitude
      );
      return distance <= searchRadius;
    } else {
      // Fallback to city/country matching
      const restaurantLocation = `${restaurant.location.country_code.toLowerCase()}_${restaurant.location.city.toLowerCase()}`;
      const searchLocation = `${(searchLoc?.country_code || 'GB').toLowerCase()}_${(searchLoc?.city || '').toLowerCase()}`;
      return restaurantLocation.includes(searchLocation) || searchLocation.includes(restaurantLocation);
    }
  }

  isRestaurantOpen(restaurant, timeContext) {
    if (!restaurant.opening_hours || !timeContext) return true;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en', {weekday: 'long'}).toLowerCase();
    const currentTime = now.toTimeString().slice(0,5);
    
    const todayHours = restaurant.opening_hours[currentDay];
    if (!todayHours) return false;
    
    return currentTime >= todayHours.open && currentTime <= todayHours.close;
  }

  itemMatchesFilters(item, filters) {
    const normalizedItem = this.normalizeMenuItem(item);
    
    if (!normalizedItem.available) return false;
    
    // Meal period filter
    if (filters.meal_period !== 'all_day' && 
        normalizedItem.meal_period !== 'all_day' && 
        normalizedItem.meal_period !== filters.meal_period) {
      return false;
    }
    
    // Dietary restrictions
    if (filters.dietary && filters.dietary.length > 0) {
      for (const restriction of filters.dietary) {
        const normalizedRestriction = restriction.replace('-', '_');
        if (!normalizedItem.dietary || !normalizedItem.dietary[normalizedRestriction]) {
          return false;
        }
      }
    }
    
    return true;
  }

  calculateItemScore(item, restaurant, context) {
    let score = Math.random() * 5; // Base randomness
    const normalizedItem = this.normalizeMenuItem(item);
    const itemText = `${normalizedItem.name} ${normalizedItem.description || ''} ${(normalizedItem.tags || []).join(' ')}`.toLowerCase();
    
    // Mood matching
    if (context.mood_text) {
      const moodWords = context.mood_text.toLowerCase().split(/\s+/);
      for (const word of moodWords) {
        if (word.length > 2 && itemText.includes(word)) {
          score += 10;
        }
      }
    }
    
    // Restaurant goals boost
    const goals = restaurant.metadata?.goals || [];
    
    if (goals.includes('increase_visibility')) {
      score += 3;
    }
    
    if (goals.includes('highlight_specialties') && normalizedItem.tags?.includes('signature')) {
      score += 15;
    }
    
    if (goals.includes('attract_dietary') && context.dietary?.length > 0) {
      const matchesDietary = context.dietary.some(d => normalizedItem.dietary?.[d.replace('-','_')]);
      if (matchesDietary) score += 12;
    }
    
    // Data source boost (prefer Firebase data)
    if (restaurant.data_source === 'firebase') {
      score += 5;
    }
    
    return score;
  }

  sortResults(results, sortBy) {
    if (sortBy === 'distance' && results.some(r => r.distance_km !== null)) {
      results.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    } else if (sortBy === 'hidden_gem') {
      results.sort((a, b) => b.hidden_gem_score - a.hidden_gem_score);
    } else {
      // Default: relevance (match_score)
      results.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  calculateHiddenGemScore(restaurant, item) {
    let score = 0;
    const normalizedItem = this.normalizeMenuItem(item);
    
    // Limited availability
    if (normalizedItem.availability === 'weekends_only') score += 30;
    if (normalizedItem.availability === 'seasonal') score += 25;
    if (normalizedItem.availability === 'chef_special') score += 20;
    
    // Small batch
    if (normalizedItem.daily_limit && normalizedItem.daily_limit < 20) score += 25;
    
    // Family recipe / traditional
    if (normalizedItem.tags?.includes('family_recipe')) score += 20;
    if (normalizedItem.tags?.includes('traditional')) score += 10;
    if (normalizedItem.tags?.includes('secret_recipe')) score += 25;
    
    // Restaurant metadata boost
    const goals = restaurant.metadata?.goals || [];
    if (!goals.includes('increase_visibility')) {
      score += 12;
    }
    if (goals.includes('highlight_specialties') && normalizedItem.tags?.includes('signature')) {
      score += 10;
    }

    const metrics = restaurant.metrics || restaurant.metadata?.metrics || {};
    const reviews = restaurant.reviews || restaurant.metadata?.reviews || {};
    const avgRating = Number(metrics.average_rating || reviews.average_rating || reviews.avg || 0);
    const reviewCount = Number(metrics.review_count || reviews.count || reviews.total || 0);

    if (avgRating) {
      // Reward high-rated but still under-the-radar spots
      score += Math.max(0, (avgRating - 4) * 12);
    }

    if (reviewCount) {
      if (reviewCount < 25) score += 8; // quieter gems
      else if (reviewCount > 200) score -= 6; // likely mainstream
    }

    if (restaurant.media?.hero_image || restaurant.media?.gallery?.length) {
      score += 5;
    }

    if (metrics.popularity_score) {
      score += Math.max(0, 18 - metrics.popularity_score);
    }

    if (typeof restaurant.metadata?.hidden_gem_override === 'number') {
      score += restaurant.metadata.hidden_gem_override;
    }

    if (restaurant.metadata?.hidden_gem_tier === 'legendary') {
      score = Math.max(score, 90);
    }
    
    return Math.min(Math.max(score, 0), 100);
  }

  getHiddenGemBadge(score) {
    if (score >= 90) return { emoji: '🏆', label: 'Legendary Find', color: '#FFD700' };
    if (score >= 70) return { emoji: '💎', label: 'Hidden Gem', color: '#9B59B6' };
    if (score >= 50) return { emoji: '⭐', label: 'Local Favorite', color: '#3498DB' };
    if (score >= 30) return { emoji: '🔍', label: 'Worth Discovering', color: '#95A5A6' };
    return null;
  }

  buildRestaurantLink(restaurant) {
    const platforms = restaurant.delivery_platforms || {};
    const media = restaurant.media || {};

    if (media.reservation_url) {
      return {
        url: media.reservation_url,
        type: 'reservation',
        label: 'Book a Table'
      };
    }

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
    
    // Fallback to Google Maps
    const address = restaurant.location?.address || 
                   `${restaurant.restaurant_name}, ${restaurant.location?.city}`;
    return {
      url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      type: 'map',
      label: 'View on Map'
    };
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

    const itemNames = items.map(item => {
      const normalized = this.normalizeMenuItem(item);
      return normalized.name;
    }).join(' ').toLowerCase();
    
    for (const [cuisine, pattern] of Object.entries(cuisineIndicators)) {
      if (pattern.test(itemNames)) {
        return cuisine;
      }
    }
    
    return 'international';
  }

  detectMealPeriod(item) {
    const normalized = this.normalizeMenuItem(item);
    const name = (normalized.name || '').toLowerCase();
    const tags = (normalized.tags || []).join(' ').toLowerCase();
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
    
    return 'all_day';
  }

  generateSearchTags(item) {
    const normalized = this.normalizeMenuItem(item);
    const tags = [...(normalized.tags || [])];
    const name = (normalized.name || '').toLowerCase();
    const description = (normalized.description || '').toLowerCase();
    const text = `${name} ${description}`;
    
    // Add cuisine tags
    if (/curry|tikka|masala|biryani|dal|naan/i.test(text)) tags.push('indian');
    if (/sushi|ramen|tempura|teriyaki|miso/i.test(text)) tags.push('japanese');
    if (/pasta|pizza|risotto|italian/i.test(text)) tags.push('italian');
    
    // Add dietary tags
    if (/vegan|plant.*based/i.test(text)) tags.push('vegan');
    if (/vegetarian|veggie/i.test(text)) tags.push('vegetarian');
    if (/gluten.*free/i.test(text)) tags.push('gluten-free');
    
    return [...new Set(tags)];
  }

  getEmoji(item) {
    const normalized = this.normalizeMenuItem(item);
    const name = (normalized.name || '').toLowerCase();
    const category = (normalized.category || '').toLowerCase();
    
    if (/pizza/i.test(name)) return '🍕';
    if (/burger/i.test(name)) return '🍔';
    if (/pasta|spaghetti/i.test(name)) return '🍝';
    if (/sushi/i.test(name)) return '🍣';
    if (/ramen|noodle/i.test(name)) return '🍜';
    if (/curry|rice/i.test(name)) return '🍛';
    if (/salad/i.test(name)) return '🥗';
    
    const categoryEmojis = {
      'appetizer': '🥗',
      'main': '🍽️',
      'dessert': '🍰',
      'drink': '🥤'
    };
    
    return categoryEmojis[category] || normalized.emoji || '🍽️';
  }

  // ===============================
  // STATS AND UTILITIES
  // ===============================

  async getStats() {
    try {
      const stats = { local: this.getLocalStats() };
      
      if (this.useFirebase && adminDb) {
        try {
          const firebaseStats = await this.getFirebaseStatsAdmin();
          stats.firebase = firebaseStats;
          stats.combined = {
            total_restaurants: (firebaseStats?.total_restaurants || 0) + stats.local.total_restaurants,
            total_menu_items: (firebaseStats?.total_menu_items || 0) + stats.local.total_menu_items,
            data_sources: ['firebase', 'local']
          };
        } catch (error) {
          console.error('Firebase stats error:', error);
          stats.firebase = null;
          stats.combined = stats.local;
        }
      } else {
        stats.firebase = null;
        stats.combined = stats.local;
      }
      
      return stats;
    } catch (error) {
      console.error('Stats error:', error);
      return { local: this.getLocalStats() };
    }
  }

  getLocalStats() {
    return {
      ...this.menuStats,
      restaurants_by_country: this.getRestaurantsByCountry(),
      top_cuisines: this.getTopCuisines()
    };
  }

  getRestaurantsByCountry() {
    const byCountry = {};
    for (const [, menu] of this.localMenus) {
      const cc = menu.location.country_code;
      byCountry[cc] = (byCountry[cc] || 0) + 1;
    }
    return byCountry;
  }

  getTopCuisines() {
    const cuisines = {};
    for (const [, menu] of this.localMenus) {
      const cuisine = menu.cuisine_type || 'unknown';
      cuisines[cuisine] = (cuisines[cuisine] || 0) + 1;
    }
    return Object.entries(cuisines)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cuisine, count]) => ({ cuisine, count }));
  }

  getAllMenuItems() {
    const allItems = [];
    for (const [, menu] of this.localMenus) {
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
}

// Create singleton instance
export const menuManager = new EnhancedMenuManager();

// Enhanced recommendation function with Firebase integration
export async function recommendFromMenus(params) {
  const {
    location,
    target_location,
    search_radius = 5,
    mood_text,
    dietary,
    meal_period,
    cravingAttributes,
    timeContext,
    prioritize_hidden_gems = false,
    data_source = 'firebase'
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
      limit: 10,
      sort_by: prioritize_hidden_gems ? 'hidden_gem' : 'relevance',
      data_source
    });

    console.log(`🔍 Menu search found ${menuItems.length} matching items (source: ${data_source})`);

    if (menuItems.length === 0) {
      console.log('🔍 No menu items found matching criteria');
      return null;
    }

    const formatted = menuItems.slice(0, 6).map(item => ({
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
      source: `restaurant_menu_${item.data_source || 'local'}`,
      cuisine_type: item.cuisine_type,
      dietary_info: item.dietary_info,
      availability: item.availability
    }));
    
    console.log(`🍽️ Returning ${formatted.length} restaurant recommendations`);
    return formatted;
    
  } catch (error) {
    console.error('❌ Menu recommendation error:', error);
    return null;
  }
}

// Sample data function with Firebase integration
export async function addSampleRestaurants() {
  const samples = [
    {
      restaurant_id: 'dishoom_covent_garden',
      restaurant_name: 'Dishoom Covent Garden',
      location: {
        city: 'London',
        country_code: 'GB',
        address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
        coordinates: { lat: 51.5101, lng: -0.1280 }
      },
      delivery_platforms: {
        deliveroo_id: 'dishoom-covent-garden',
        ubereats_id: 'dishoom-london'
      },
      metadata: {
        goals: ['highlight_specialties', 'attract_dietary'],
        menu_size: '51-100 items',
        pos_systems: ['square'],
        target_audience: ['young_professionals', 'tourists']
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
          tags: ['comfort', 'vegetarian', 'signature', 'curry', 'family_recipe'],
          meal_period: 'all_day',
          dietary: { vegetarian: true, vegan: false }
        }
      ]
    }
  ];

  for (const sample of samples) {
    await menuManager.addRestaurantMenu(sample);
  }
  
  console.log('✅ Added sample restaurants to both Firebase and local storage');
  return { success: true, added: samples.length };
}

console.log('📋 Enhanced Menu Manager with Firebase Admin Integration initialized');
