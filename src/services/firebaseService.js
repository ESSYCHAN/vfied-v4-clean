// src/services/firebaseService.js
// Enhanced Firebase service for restaurant and event data management

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  geoPoint,
  serverTimestamp,
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase.js';

// Extended collections for restaurant system
export const RESTAURANT_COLLECTIONS = {
  ...COLLECTIONS,
  RESTAURANTS: 'restaurants',
  MENU_ITEMS: 'menu_items',
  EVENTS: 'events',
  RESTAURANT_OWNERS: 'restaurant_owners',
  RESTAURANT_REVIEWS: 'restaurant_reviews'
};

export class FirebaseRestaurantService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
  }

  // ===============================
  // RESTAURANT MANAGEMENT
  // ===============================

  async addRestaurant(restaurantData) {
    try {
      const batch = writeBatch(db);
      
      // Prepare restaurant document
      const restaurantRef = doc(collection(db, RESTAURANT_COLLECTIONS.RESTAURANTS));
      const restaurantId = restaurantRef.id;

      const restaurantDoc = {
        restaurant_id: restaurantId,
        basic_info: {
          name: restaurantData.restaurant_name,
          cuisine_type: restaurantData.cuisine_type || 'international',
          description: restaurantData.description || '',
          website: restaurantData.website || '',
          phone: restaurantData.phone || ''
        },
        location: {
          city: restaurantData.location.city,
          country_code: restaurantData.location.country_code,
          address: restaurantData.location.address || '',
          coordinates: restaurantData.location.coordinates ? 
            geoPoint(restaurantData.location.coordinates.lat, restaurantData.location.coordinates.lng) : null,
          neighborhood: restaurantData.location.neighborhood || ''
        },
        business_info: {
          opening_hours: restaurantData.opening_hours || {},
          delivery_platforms: restaurantData.delivery_platforms || {},
          price_range: restaurantData.price_range || '$$',
          seating_capacity: restaurantData.seating_capacity || null,
          accepts_reservations: restaurantData.accepts_reservations || false
        },
        media: {
          hero_image: restaurantData.media?.hero_image || '',
          gallery: restaurantData.media?.gallery || [],
          logo: restaurantData.media?.logo || '',
          banner: restaurantData.media?.banner || ''
        },
        metadata: {
          goals: restaurantData.metadata?.goals || [],
          menu_size: restaurantData.metadata?.menu_size || '21-50 items',
          pos_systems: restaurantData.metadata?.pos_systems || [],
          target_audience: restaurantData.metadata?.target_audience || [],
          signup_source: restaurantData.metadata?.signup_source || 'dashboard',
          hidden_gem_override: restaurantData.metadata?.hidden_gem_override ?? null,
          hidden_gem_tier: restaurantData.metadata?.hidden_gem_tier || '',
          reviews: restaurantData.metadata?.reviews || null
        },
        verification: {
          owner_verified: false,
          claimed_by: null,
          verification_date: null,
          admin_approved: false,
          data_source: 'admin_upload'
        },
        statistics: {
          total_menu_items: 0,
          view_count: 0,
          recommendation_count: 0,
          last_menu_update: serverTimestamp(),
          hidden_gem_override: restaurantData.metadata?.hidden_gem_override ?? null,
          community_rating: restaurantData.metadata?.reviews?.average_rating ?? null,
          review_count: restaurantData.metadata?.reviews?.count ?? 0
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      if (restaurantData.metrics) {
        restaurantDoc.statistics = {
          ...restaurantDoc.statistics,
          ...restaurantData.metrics
        };
      }

      batch.set(restaurantRef, restaurantDoc);

      // Add menu items if provided
      if (restaurantData.menu_items && restaurantData.menu_items.length > 0) {
        for (const item of restaurantData.menu_items) {
          const menuItemRef = doc(collection(db, RESTAURANT_COLLECTIONS.MENU_ITEMS));
          const menuItemDoc = {
            menu_item_id: menuItemRef.id,
            restaurant_id: restaurantId,
            basic_info: {
              name: item.name,
              description: item.description || '',
              price: item.price || '',
              category: item.category || 'main',
              emoji: item.emoji || '🍽️'
            },
            classification: {
              meal_period: item.meal_period || 'all_day',
              cuisine_tags: item.search_tags || item.tags || [],
              dietary: {
                vegetarian: Boolean(item.dietary?.vegetarian),
                vegan: Boolean(item.dietary?.vegan),
                gluten_free: Boolean(item.dietary?.gluten_free),
                dairy_free: Boolean(item.dietary?.dairy_free),
                halal: Boolean(item.dietary?.halal),
                kosher: Boolean(item.dietary?.kosher)
              },
              spice_level: item.spice_level || 0,
              allergens: item.allergens || []
            },
            availability: {
              available: item.available !== false,
              seasonal: item.seasonal || false,
              daily_limit: item.daily_limit || null,
              availability_note: item.availability_note || ''
            },
            marketing: {
              signature_dish: item.tags?.includes('signature') || false,
              chef_recommendation: item.tags?.includes('chef_special') || false,
              popular: item.tags?.includes('popular') || false,
              new_item: item.tags?.includes('new') || false
            },
            hidden_gem_factors: {
              family_recipe: item.tags?.includes('family_recipe') || false,
              secret_recipe: item.tags?.includes('secret_recipe') || false,
              limited_availability: item.availability === 'limited_daily' || false,
              traditional_method: item.cooking_method === 'traditional' || false,
              preparation_time: item.preparation_time || null
            },
            media: {
              image: item.image || item.image_url || null,
              gallery: item.gallery || []
            },
            statistics: {
              view_count: 0,
              order_count: 0,
              recommendation_count: 0,
              rating_sum: 0,
              rating_count: 0
            },
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          };

          batch.set(menuItemRef, menuItemDoc);
        }

        // Update restaurant menu item count
        batch.update(restaurantRef, {
          'statistics.total_menu_items': restaurantData.menu_items.length
        });
      }

      await batch.commit();

      console.log(`Firebase: Added restaurant ${restaurantId} with ${restaurantData.menu_items?.length || 0} menu items`);
      
      return {
        success: true,
        restaurant_id: restaurantId,
        items_added: restaurantData.menu_items?.length || 0
      };

    } catch (error) {
      console.error('Firebase: Error adding restaurant:', error);
      throw error;
    }
  }

  async getRestaurant(restaurantId) {
    try {
      const docRef = doc(db, RESTAURANT_COLLECTIONS.RESTAURANTS, restaurantId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Firebase: Error getting restaurant:', error);
      throw error;
    }
  }

  async searchRestaurants(filters = {}) {
    try {
      let q = collection(db, RESTAURANT_COLLECTIONS.RESTAURANTS);
      const constraints = [];

      // Location filtering
      if (filters.city) {
        constraints.push(where('location.city', '==', filters.city));
      }
      if (filters.country_code) {
        constraints.push(where('location.country_code', '==', filters.country_code));
      }

      // Cuisine filtering
      if (filters.cuisine_type) {
        constraints.push(where('basic_info.cuisine_type', '==', filters.cuisine_type));
      }

      // Business filters
      if (filters.price_range) {
        constraints.push(where('business_info.price_range', '==', filters.price_range));
      }

      // Verification status
      if (filters.verified_only) {
        constraints.push(where('verification.admin_approved', '==', true));
      }

      // Add ordering and limit
      constraints.push(orderBy('statistics.recommendation_count', 'desc'));
      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const querySnapshot = await getDocs(q);
      const restaurants = [];
      
      querySnapshot.forEach((doc) => {
        restaurants.push({ id: doc.id, ...doc.data() });
      });

      return restaurants;
    } catch (error) {
      console.error('Firebase: Error searching restaurants:', error);
      throw error;
    }
  }

  // ===============================
  // MENU ITEM MANAGEMENT
  // ===============================

  async getMenuItems(restaurantId, filters = {}) {
    try {
      let q = collection(db, RESTAURANT_COLLECTIONS.MENU_ITEMS);
      const constraints = [where('restaurant_id', '==', restaurantId)];

      // Availability filter
      if (filters.available_only !== false) {
        constraints.push(where('availability.available', '==', true));
      }

      // Meal period filter
      if (filters.meal_period && filters.meal_period !== 'all_day') {
        constraints.push(where('classification.meal_period', 'in', [filters.meal_period, 'all_day']));
      }

      // Dietary filters
      if (filters.dietary && filters.dietary.length > 0) {
        for (const restriction of filters.dietary) {
          constraints.push(where(`classification.dietary.${restriction}`, '==', true));
        }
      }

      // Category filter
      if (filters.category) {
        constraints.push(where('basic_info.category', '==', filters.category));
      }

      // Ordering
      constraints.push(orderBy('statistics.recommendation_count', 'desc'));

      if (filters.limit) {
        constraints.push(limit(filters.limit));
      }

      q = query(q, ...constraints);
      const querySnapshot = await getDocs(q);
      const menuItems = [];
      
      querySnapshot.forEach((doc) => {
        menuItems.push({ id: doc.id, ...doc.data() });
      });

      return menuItems;
    } catch (error) {
      console.error('Firebase: Error getting menu items:', error);
      throw error;
    }
  }

  async searchMenuItemsForRecommendations(filters) {
    try {
      // First get restaurants in the target location
      const restaurants = await this.searchRestaurants({
        city: filters.location?.city,
        country_code: filters.location?.country_code,
        verified_only: true,
        limit: 50
      });

      if (restaurants.length === 0) {
        return [];
      }

      const restaurantIds = restaurants.map(r => r.restaurant_id || r.id);
      
      // Get menu items from these restaurants
      // Note: Firestore 'in' queries are limited to 10 items, so we might need to batch this
      const batchSize = 10;
      const allMenuItems = [];

      for (let i = 0; i < restaurantIds.length; i += batchSize) {
        const batch = restaurantIds.slice(i, i + batchSize);
        
        let q = collection(db, RESTAURANT_COLLECTIONS.MENU_ITEMS);
        const constraints = [
          where('restaurant_id', 'in', batch),
          where('availability.available', '==', true)
        ];

        // Add dietary filters
        if (filters.dietary && filters.dietary.length > 0) {
          for (const restriction of filters.dietary) {
            constraints.push(where(`classification.dietary.${restriction.replace('-', '_')}`, '==', true));
          }
        }

        // Add meal period filter
        if (filters.meal_period && filters.meal_period !== 'all_day') {
          constraints.push(where('classification.meal_period', 'in', [filters.meal_period, 'all_day']));
        }

        constraints.push(orderBy('statistics.recommendation_count', 'desc'));
        constraints.push(limit(20));

        q = query(q, ...constraints);
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach((doc) => {
          const menuItem = { id: doc.id, ...doc.data() };
          // Find matching restaurant data
          const restaurant = restaurants.find(r => (r.restaurant_id || r.id) === menuItem.restaurant_id);
          if (restaurant) {
            menuItem.restaurant_data = restaurant;
          }
          allMenuItems.push(menuItem);
        });
      }

      return allMenuItems;
    } catch (error) {
      console.error('Firebase: Error searching menu items for recommendations:', error);
      throw error;
    }
  }

  // ===============================
  // EVENT MANAGEMENT
  // ===============================

  async addEvent(eventData) {
    try {
      const eventRef = doc(collection(db, RESTAURANT_COLLECTIONS.EVENTS));
      const eventDoc = {
        event_id: eventRef.id,
        basic_info: {
          title: eventData.title,
          description: eventData.description,
          category: eventData.category || 'food'
        },
        scheduling: {
          date: eventData.date,
          time: eventData.time || null,
          duration: eventData.duration || null,
          recurring: eventData.recurring || false
        },
        location: {
          venue: eventData.location?.venue || eventData.venue,
          city: eventData.location?.city || eventData.city,
          country_code: eventData.location?.country_code || eventData.country,
          address: eventData.location?.address || '',
          coordinates: eventData.location?.coordinates ? 
            geoPoint(eventData.location.coordinates.lat, eventData.location.coordinates.lng) : null
        },
        pricing: {
          price: eventData.price || 'Free',
          currency: eventData.currency || 'GBP',
          price_range: eventData.price_range || null
        },
        contact: {
          contact_name: eventData.contact_name,
          contact_email: eventData.contact_email,
          website: eventData.website || '',
          phone: eventData.phone || ''
        },
        restaurant_connection: {
          restaurant_id: eventData.restaurant_id || null,
          hosted_by_restaurant: Boolean(eventData.restaurant_id)
        },
        moderation: {
          status: 'pending',
          submitted_at: serverTimestamp(),
          reviewed_at: null,
          reviewed_by: null,
          rejection_reason: null
        },
        statistics: {
          view_count: 0,
          interest_count: 0,
          attendance_count: 0
        },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      await addDoc(collection(db, RESTAURANT_COLLECTIONS.EVENTS), eventDoc);
      
      console.log(`Firebase: Added event ${eventRef.id}`);
      return { success: true, event_id: eventRef.id };

    } catch (error) {
      console.error('Firebase: Error adding event:', error);
      throw error;
    }
  }

  async getPendingEvents() {
    try {
      const q = query(
        collection(db, RESTAURANT_COLLECTIONS.EVENTS),
        where('moderation.status', '==', 'pending'),
        orderBy('moderation.submitted_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const events = [];
      
      querySnapshot.forEach((doc) => {
        events.push({ id: doc.id, ...doc.data() });
      });

      return events;
    } catch (error) {
      console.error('Firebase: Error getting pending events:', error);
      throw error;
    }
  }

  async approveEvent(eventId) {
    try {
      const eventRef = doc(db, RESTAURANT_COLLECTIONS.EVENTS, eventId);
      await updateDoc(eventRef, {
        'moderation.status': 'approved',
        'moderation.reviewed_at': serverTimestamp(),
        'updated_at': serverTimestamp()
      });

      console.log(`Firebase: Approved event ${eventId}`);
      return { success: true };
    } catch (error) {
      console.error('Firebase: Error approving event:', error);
      throw error;
    }
  }

  async rejectEvent(eventId, reason = '') {
    try {
      const eventRef = doc(db, RESTAURANT_COLLECTIONS.EVENTS, eventId);
      await updateDoc(eventRef, {
        'moderation.status': 'rejected',
        'moderation.reviewed_at': serverTimestamp(),
        'moderation.rejection_reason': reason,
        'updated_at': serverTimestamp()
      });

      console.log(`Firebase: Rejected event ${eventId}`);
      return { success: true };
    } catch (error) {
      console.error('Firebase: Error rejecting event:', error);
      throw error;
    }
  }

  // ===============================
  // ANALYTICS & STATISTICS
  // ===============================

  async updateRecommendationStats(menuItemId, restaurantId) {
    try {
      const batch = writeBatch(db);

      // Update menu item stats
      const menuItemRef = doc(db, RESTAURANT_COLLECTIONS.MENU_ITEMS, menuItemId);
      batch.update(menuItemRef, {
        'statistics.recommendation_count': increment(1),
        'updated_at': serverTimestamp()
      });

      // Update restaurant stats
      const restaurantRef = doc(db, RESTAURANT_COLLECTIONS.RESTAURANTS, restaurantId);
      batch.update(restaurantRef, {
        'statistics.recommendation_count': increment(1),
        'updated_at': serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error('Firebase: Error updating recommendation stats:', error);
    }
  }

  async getRestaurantStats() {
    try {
      const restaurantsSnapshot = await getDocs(collection(db, RESTAURANT_COLLECTIONS.RESTAURANTS));
      const menuItemsSnapshot = await getDocs(collection(db, RESTAURANT_COLLECTIONS.MENU_ITEMS));
      const eventsSnapshot = await getDocs(collection(db, RESTAURANT_COLLECTIONS.EVENTS));

      const stats = {
        total_restaurants: restaurantsSnapshot.size,
        total_menu_items: menuItemsSnapshot.size,
        total_events: eventsSnapshot.size,
        pending_events: 0,
        approved_events: 0,
        restaurants_by_city: {},
        restaurants_by_cuisine: {}
      };

      // Process events for moderation stats
      eventsSnapshot.forEach((doc) => {
        const event = doc.data();
        if (event.moderation?.status === 'pending') {
          stats.pending_events++;
        } else if (event.moderation?.status === 'approved') {
          stats.approved_events++;
        }
      });

      // Process restaurants for location and cuisine stats
      restaurantsSnapshot.forEach((doc) => {
        const restaurant = doc.data();
        const city = restaurant.location?.city || 'Unknown';
        const cuisine = restaurant.basic_info?.cuisine_type || 'Unknown';

        stats.restaurants_by_city[city] = (stats.restaurants_by_city[city] || 0) + 1;
        stats.restaurants_by_cuisine[cuisine] = (stats.restaurants_by_cuisine[cuisine] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Firebase: Error getting restaurant stats:', error);
      throw error;
    }
  }

  // ===============================
  // REAL-TIME LISTENERS
  // ===============================

  listenToRestaurantUpdates(restaurantId, callback) {
    const unsubscribe = onSnapshot(
      doc(db, RESTAURANT_COLLECTIONS.RESTAURANTS, restaurantId),
      (doc) => {
        if (doc.exists()) {
          callback({ id: doc.id, ...doc.data() });
        }
      },
      (error) => {
        console.error('Firebase: Restaurant listener error:', error);
      }
    );

    this.listeners.set(`restaurant_${restaurantId}`, unsubscribe);
    return unsubscribe;
  }

  listenToPendingEvents(callback) {
    const q = query(
      collection(db, RESTAURANT_COLLECTIONS.EVENTS),
      where('moderation.status', '==', 'pending'),
      orderBy('moderation.submitted_at', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const events = [];
        querySnapshot.forEach((doc) => {
          events.push({ id: doc.id, ...doc.data() });
        });
        callback(events);
      },
      (error) => {
        console.error('Firebase: Pending events listener error:', error);
      }
    );

    this.listeners.set('pending_events', unsubscribe);
    return unsubscribe;
  }

  // Clean up listeners
  removeListener(key) {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  removeAllListeners() {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }
}

// Create singleton instance
export const firebaseRestaurantService = new FirebaseRestaurantService();

// Helper function for backwards compatibility
export async function addRestaurantToFirebase(restaurantData) {
  return firebaseRestaurantService.addRestaurant(restaurantData);
}

export async function getFirebaseRestaurants(filters = {}) {
  return firebaseRestaurantService.searchRestaurants(filters);
}

export async function getFirebaseMenuItems(restaurantId, filters = {}) {
  return firebaseRestaurantService.getMenuItems(restaurantId, filters);
}
// Add these exports for compatibility with menu_manager expectations
export const RestaurantCollections = {
  createRestaurant: (data) => firebaseRestaurantService.addRestaurant(data),
  getRestaurantWithMenu: (id) => firebaseRestaurantService.getRestaurant(id)
};

export const MenuItemCollections = {
  createMenuItem: async (data) => {
    // This would need to be implemented in your FirebaseRestaurantService
    // For now, return a placeholder
    console.warn('MenuItemCollections.createMenuItem not implemented');
    return { success: false, message: 'Not implemented' };
  },
  getMenuByRestaurant: (restaurantId, filters) => firebaseRestaurantService.getMenuItems(restaurantId, filters)
};

export const CollectionHelpers = {
  getRestaurantsSummary: () => firebaseRestaurantService.getRestaurantStats()
};
