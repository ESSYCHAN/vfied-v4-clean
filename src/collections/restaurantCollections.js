// src/collections/restaurantCollections.js
// Optimized Firestore collection structures for VFIED Restaurant System

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.js';

// ===============================
// RESTAURANT COLLECTION STRUCTURE
// ===============================

export const RestaurantCollections = {
  
  // Main restaurant document structure
  createRestaurant: async (restaurantData) => {
    const restaurantRef = doc(collection(db, COLLECTIONS.RESTAURANTS));
    
    const restaurant = {
      // Basic Information
      basic_info: {
        name: restaurantData.name,
        description: restaurantData.description || '',
        cuisine_type: restaurantData.cuisine_type || [],
        price_range: restaurantData.price_range || 'moderate', // budget, moderate, upscale, fine_dining
        website: restaurantData.website || '',
        phone: restaurantData.phone || ''
      },
      
      // Location Data
      location: {
        address: restaurantData.address || '',
        city: restaurantData.city,
        country_code: restaurantData.country_code,
        postal_code: restaurantData.postal_code || '',
        coordinates: restaurantData.coordinates || null, // { lat: number, lng: number }
        timezone: restaurantData.timezone || 'Europe/London'
      },
      
      // Operating Hours
      hours: {
        monday: restaurantData.hours?.monday || { open: '09:00', close: '22:00', closed: false },
        tuesday: restaurantData.hours?.tuesday || { open: '09:00', close: '22:00', closed: false },
        wednesday: restaurantData.hours?.wednesday || { open: '09:00', close: '22:00', closed: false },
        thursday: restaurantData.hours?.thursday || { open: '09:00', close: '22:00', closed: false },
        friday: restaurantData.hours?.friday || { open: '09:00', close: '23:00', closed: false },
        saturday: restaurantData.hours?.saturday || { open: '09:00', close: '23:00', closed: false },
        sunday: restaurantData.hours?.sunday || { open: '10:00', close: '21:00', closed: false }
      },
      
      // Verification & Status
      verification: {
        admin_approved: false,
        claimed_by: restaurantData.claimed_by || null,
        claim_date: restaurantData.claim_date || null,
        data_source: restaurantData.data_source || 'user_submission', // user_submission, admin_import, api_import
        verified_email: restaurantData.verified_email || false,
        verification_date: null
      },
      
      // Metrics & Analytics
      metrics: {
        total_menu_items: 0,
        views: 0,
        recommendations_count: 0,
        last_menu_update: null,
        popularity_score: 0
      },
      
      // Social & Marketing
      social: {
        instagram: restaurantData.social?.instagram || '',
        facebook: restaurantData.social?.facebook || '',
        twitter: restaurantData.social?.twitter || '',
        tiktok: restaurantData.social?.tiktok || ''
      },
      
      // System Fields
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: restaurantData.created_by || null
    };
    
    await setDoc(restaurantRef, restaurant);
    return restaurantRef.id;
  },

  // Get restaurant with menu items
  getRestaurantWithMenu: async (restaurantId) => {
    const restaurantDoc = await getDoc(doc(db, COLLECTIONS.RESTAURANTS, restaurantId));
    if (!restaurantDoc.exists()) return null;
    
    const menuItems = await getDocs(
      query(
        collection(db, COLLECTIONS.MENU_ITEMS),
        where('restaurant_id', '==', restaurantId),
        orderBy('category'),
        orderBy('name')
      )
    );
    
    return {
      id: restaurantDoc.id,
      ...restaurantDoc.data(),
      menu_items: menuItems.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  }
};

// ===============================
// MENU ITEMS COLLECTION STRUCTURE
// ===============================

export const MenuItemCollections = {
  
  // Create menu item
  createMenuItem: async (menuItemData) => {
    const menuItemRef = doc(collection(db, COLLECTIONS.MENU_ITEMS));
    
    const menuItem = {
      // Basic Information
      basic_info: {
        name: menuItemData.name,
        description: menuItemData.description || '',
        price: menuItemData.price || '',
        currency: menuItemData.currency || 'GBP',
        category: menuItemData.category || 'main', // starter, main, dessert, beverage, side
        subcategory: menuItemData.subcategory || '',
        emoji: menuItemData.emoji || '🍽️'
      },
      
      // Restaurant Association
      restaurant_id: menuItemData.restaurant_id,
      
      // Dietary & Preferences
      dietary: {
        vegetarian: menuItemData.dietary?.vegetarian || false,
        vegan: menuItemData.dietary?.vegan || false,
        gluten_free: menuItemData.dietary?.gluten_free || false,
        dairy_free: menuItemData.dietary?.dairy_free || false,
        nut_free: menuItemData.dietary?.nut_free || false,
        halal: menuItemData.dietary?.halal || false,
        kosher: menuItemData.dietary?.kosher || false
      },
      
      // Availability
      availability: {
        meal_periods: menuItemData.availability?.meal_periods || ['all_day'], // breakfast, lunch, dinner, all_day
        days_available: menuItemData.availability?.days_available || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        seasonal: menuItemData.availability?.seasonal || false,
        limited_time: menuItemData.availability?.limited_time || false,
        available_until: menuItemData.availability?.available_until || null
      },
      
      // Nutrition & Details
      nutrition: {
        calories: menuItemData.nutrition?.calories || null,
        spice_level: menuItemData.nutrition?.spice_level || 0, // 0-5 scale
        portion_size: menuItemData.nutrition?.portion_size || 'regular',
        allergens: menuItemData.nutrition?.allergens || []
      },
      
      // Tags & Classification
      tags: menuItemData.tags || [], // popular, signature, chef_special, healthy, comfort_food
      
      // Metrics
      metrics: {
        views: 0,
        orders: 0,
        ratings_sum: 0,
        ratings_count: 0,
        average_rating: 0,
        recommendation_count: 0
      },
      
      // System Fields
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: menuItemData.created_by || null,
      data_source: menuItemData.data_source || 'user_submission'
    };
    
    await setDoc(menuItemRef, menuItem);
    
    // Update restaurant menu count
    const restaurantRef = doc(db, COLLECTIONS.RESTAURANTS, menuItemData.restaurant_id);
    await updateDoc(restaurantRef, {
      'metrics.total_menu_items': menuItemData.increment || 1,
      'metrics.last_menu_update': serverTimestamp(),
      updated_at: serverTimestamp()
    });
    
    return menuItemRef.id;
  },

  // Get menu items by restaurant
  getMenuByRestaurant: async (restaurantId, filters = {}) => {
    let menuQuery = query(
      collection(db, COLLECTIONS.MENU_ITEMS),
      where('restaurant_id', '==', restaurantId)
    );
    
    // Add filters
    if (filters.category) {
      menuQuery = query(menuQuery, where('basic_info.category', '==', filters.category));
    }
    
    if (filters.meal_period) {
      menuQuery = query(menuQuery, where('availability.meal_periods', 'array-contains', filters.meal_period));
    }
    
    // Add ordering
    menuQuery = query(menuQuery, orderBy('basic_info.category'), orderBy('basic_info.name'));
    
    const menuItems = await getDocs(menuQuery);
    return menuItems.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

// ===============================
// EVENTS COLLECTION STRUCTURE
// ===============================

export const EventCollections = {
  
  // Create event
  createEvent: async (eventData) => {
    const eventRef = doc(collection(db, COLLECTIONS.EVENTS));
    
    const event = {
      // Basic Information
      basic_info: {
        title: eventData.title,
        description: eventData.description || '',
        type: eventData.type || 'general', // menu_update, new_restaurant, special_offer, community_event
        category: eventData.category || 'announcement'
      },
      
      // Restaurant Connection
      restaurant_connection: {
        restaurant_id: eventData.restaurant_id || null,
        restaurant_name: eventData.restaurant_name || null,
        affects_menu: eventData.affects_menu || false
      },
      
      // Event Details
      event_details: {
        start_date: eventData.start_date || null,
        end_date: eventData.end_date || null,
        recurring: eventData.recurring || false,
        recurrence_pattern: eventData.recurrence_pattern || null, // daily, weekly, monthly
        all_day: eventData.all_day || false,
        timezone: eventData.timezone || 'Europe/London'
      },
      
      // Location (if different from restaurant)
      location: {
        venue_name: eventData.location?.venue_name || '',
        address: eventData.location?.address || '',
        city: eventData.location?.city || '',
        coordinates: eventData.location?.coordinates || null
      },
      
      // Contact Information
      contact: {
        contact_name: eventData.contact?.contact_name || '',
        contact_email: eventData.contact?.contact_email || '',
        contact_phone: eventData.contact?.contact_phone || '',
        website: eventData.contact?.website || ''
      },
      
      // Moderation & Status
      moderation: {
        status: 'pending', // pending, approved, rejected, archived
        reviewed_by: null,
        review_date: null,
        review_notes: '',
        auto_approved: false
      },
      
      // Visibility & Targeting
      visibility: {
        public: true,
        target_audience: eventData.target_audience || ['general'], // general, restaurant_owners, local_community
        featured: false,
        priority: eventData.priority || 'normal' // low, normal, high, urgent
      },
      
      // Metrics
      metrics: {
        views: 0,
        clicks: 0,
        shares: 0,
        attendees: 0,
        interested: 0
      },
      
      // System Fields
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: eventData.created_by || null,
      submitted_by_ip: eventData.submitted_by_ip || null
    };
    
    await setDoc(eventRef, event);
    return eventRef.id;
  },

  // Get pending events for moderation
  getPendingEvents: async (limitCount = 50) => {
    const eventsQuery = query(
      collection(db, COLLECTIONS.EVENTS),
      where('moderation.status', '==', 'pending'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    
    const events = await getDocs(eventsQuery);
    return events.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Approve event
  approveEvent: async (eventId, reviewedBy, notes = '') => {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      'moderation.status': 'approved',
      'moderation.reviewed_by': reviewedBy,
      'moderation.review_date': serverTimestamp(),
      'moderation.review_notes': notes,
      updated_at: serverTimestamp()
    });
  },

  // Reject event
  rejectEvent: async (eventId, reviewedBy, notes = '') => {
    const eventRef = doc(db, COLLECTIONS.EVENTS, eventId);
    await updateDoc(eventRef, {
      'moderation.status': 'rejected',
      'moderation.reviewed_by': reviewedBy,
      'moderation.review_date': serverTimestamp(),
      'moderation.review_notes': notes,
      updated_at: serverTimestamp()
    });
  }
};

// ===============================
// HELPER FUNCTIONS
// ===============================

export const CollectionHelpers = {
  
  // Get restaurants summary for dashboard
  getRestaurantsSummary: async () => {
    const restaurantsQuery = query(collection(db, COLLECTIONS.RESTAURANTS));
    const menuItemsQuery = query(collection(db, COLLECTIONS.MENU_ITEMS));
    const eventsQuery = query(
      collection(db, COLLECTIONS.EVENTS),
      where('moderation.status', '==', 'pending')
    );
    
    const [restaurants, menuItems, pendingEvents] = await Promise.all([
      getDocs(restaurantsQuery),
      getDocs(menuItemsQuery),
      getDocs(eventsQuery)
    ]);
    
    return {
      total_restaurants: restaurants.size,
      total_menu_items: menuItems.size,
      pending_events: pendingEvents.size,
      approved_restaurants: restaurants.docs.filter(doc => 
        doc.data().verification?.admin_approved === true
      ).length
    };
  },

  // Search across collections
  searchCollections: async (searchTerm, collections = ['restaurants', 'menu_items']) => {
    const results = {};
    
    if (collections.includes('restaurants')) {
      const restaurantsQuery = query(
        collection(db, COLLECTIONS.RESTAURANTS),
        where('basic_info.name', '>=', searchTerm),
        where('basic_info.name', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      const restaurants = await getDocs(restaurantsQuery);
      results.restaurants = restaurants.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    if (collections.includes('menu_items')) {
      const menuQuery = query(
        collection(db, COLLECTIONS.MENU_ITEMS),
        where('basic_info.name', '>=', searchTerm),
        where('basic_info.name', '<=', searchTerm + '\uf8ff'),
        limit(20)
      );
      const menuItems = await getDocs(menuQuery);
      results.menu_items = menuItems.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    return results;
  }
};

// Export collection references for direct use
export const Collections = {
  restaurants: () => collection(db, COLLECTIONS.RESTAURANTS),
  menuItems: () => collection(db, COLLECTIONS.MENU_ITEMS),
  events: () => collection(db, COLLECTIONS.EVENTS),
  restaurantOwners: () => collection(db, COLLECTIONS.RESTAURANT_OWNERS),
  adminUsers: () => collection(db, COLLECTIONS.ADMIN_USERS),
  moderators: () => collection(db, COLLECTIONS.MODERATORS)
};