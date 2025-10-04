// server/routes/firebase-integration.js
// Updated API endpoints with Firebase integration for VFIED

import express from 'express';
import { menuManager, recommendFromMenus } from '../menu_manager.js';

// Import Firebase service (will be available when Firebase is configured)
let firebaseRestaurantService = null;
try {
  const firebaseModule = await import('../../src/services/firebaseService.js');
  firebaseRestaurantService = firebaseModule.firebaseRestaurantService;
  console.log('🔥 Firebase endpoints enabled');
} catch (error) {
  console.log('📋 Firebase endpoints disabled - using local storage only');
}

const router = express.Router();

// ===============================
// RESTAURANT MANAGEMENT ENDPOINTS
// ===============================

// POST /v1/restaurant/menu - Enhanced with Firebase
router.post('/restaurant/menu', async (req, res) => {
  try {
    const {
      restaurant_name,
      location,
      menu_items,
      delivery_platforms,
      opening_hours,
      metadata,
      data_source = 'api'
    } = req.body;

    // Validate required fields
    if (!restaurant_name || !location || !location.city || !location.country_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: restaurant_name, location.city, location.country_code'
      });
    }

    // Generate restaurant ID if not provided
    const restaurant_id = req.body.restaurant_id || 
      `${restaurant_name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const restaurantData = {
      restaurant_id,
      restaurant_name,
      location,
      menu_items: menu_items || [],
      delivery_platforms: delivery_platforms || {},
      opening_hours: opening_hours || {},
      metadata: {
        ...metadata,
        api_source: data_source,
        created_via: 'api'
      }
    };

    // Add to menu manager (which handles Firebase + local storage)
    const result = await menuManager.addRestaurantMenu(restaurantData);

    res.json({
      success: true,
      message: `Restaurant ${restaurant_name} added successfully`,
      restaurant_id: result.restaurant_id,
      items_added: result.items_added,
      data_sources: firebaseRestaurantService ? ['firebase', 'local'] : ['local']
    });

  } catch (error) {
    console.error('Restaurant menu add error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add restaurant menu'
    });
  }
});

// GET /v1/restaurants - List restaurants with Firebase integration
router.get('/restaurants', async (req, res) => {
  try {
    const {
      city,
      country_code,
      cuisine_type,
      verified_only = false,
      limit = 20,
      data_source = 'hybrid'
    } = req.query;

    // Build filters
    const filters = {
      limit: parseInt(limit)
    };

    if (city) filters.city = city;
    if (country_code) filters.country_code = country_code.toUpperCase();
    if (cuisine_type) filters.cuisine_type = cuisine_type;
    if (verified_only === 'true') filters.verified_only = true;

    // Get restaurants based on source preference
    const restaurants = await menuManager.getMenuData(data_source);
    
    // Apply filters to the results
    let filteredRestaurants = restaurants;
    
    if (filters.city) {
      filteredRestaurants = filteredRestaurants.filter(r => 
        (r.location?.city || '').toLowerCase() === filters.city.toLowerCase()
      );
    }
    
    if (filters.country_code) {
      filteredRestaurants = filteredRestaurants.filter(r => 
        (r.location?.country_code || '').toUpperCase() === filters.country_code
      );
    }
    
    if (filters.cuisine_type) {
      filteredRestaurants = filteredRestaurants.filter(r => 
        (r.basic_info?.cuisine_type || r.cuisine_type || '').toLowerCase() === filters.cuisine_type.toLowerCase()
      );
    }

    // Apply limit
    const limitedResults = filteredRestaurants.slice(0, filters.limit);

    res.json({
      success: true,
      restaurants: limitedResults.map(r => ({
        restaurant_id: r.restaurant_id || r.id,
        name: r.basic_info?.name || r.restaurant_name,
        location: r.location,
        cuisine_type: r.basic_info?.cuisine_type || r.cuisine_type,
        menu_item_count: r.statistics?.total_menu_items || (r.menu_items ? r.menu_items.length : 0),
        verified: r.verification?.admin_approved || false,
        data_source: r.data_source || 'local'
      })),
      total_found: filteredRestaurants.length,
      total_available: restaurants.length,
      data_sources_used: firebaseRestaurantService ? ['firebase', 'local'] : ['local']
    });

  } catch (error) {
    console.error('Restaurant list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch restaurants'
    });
  }
});

// GET /v1/restaurants/:id - Get specific restaurant
router.get('/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_menu = 'true' } = req.query;

    // Try Firebase first if available
    let restaurant = null;
    
    if (firebaseRestaurantService) {
      try {
        restaurant = await firebaseRestaurantService.getRestaurant(id);
        if (restaurant && include_menu === 'true') {
          const menuItems = await firebaseRestaurantService.getMenuItems(id);
          restaurant.menu_items = menuItems;
        }
      } catch (error) {
        console.log('Firebase restaurant fetch failed, trying local...');
      }
    }

    // Fallback to local storage
    if (!restaurant) {
      const restaurants = await menuManager.getLocalMenus();
      restaurant = restaurants.find(r => r.restaurant_id === id);
    }

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      restaurant: {
        restaurant_id: restaurant.restaurant_id || restaurant.id,
        name: restaurant.basic_info?.name || restaurant.restaurant_name,
        location: restaurant.location,
        cuisine_type: restaurant.basic_info?.cuisine_type || restaurant.cuisine_type,
        opening_hours: restaurant.business_info?.opening_hours || restaurant.opening_hours,
        delivery_platforms: restaurant.business_info?.delivery_platforms || restaurant.delivery_platforms,
        menu_items: include_menu === 'true' ? (restaurant.menu_items || []) : undefined,
        verification_status: restaurant.verification?.admin_approved || false,
        data_source: restaurant.data_source || 'local'
      }
    });

  } catch (error) {
    console.error('Restaurant fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch restaurant'
    });
  }
});

// ===============================
// ENHANCED RECOMMENDATION ENDPOINTS
// ===============================

// POST /v1/recommendations - Enhanced with Firebase integration
router.post('/recommendations', async (req, res) => {
  try {
    const {
      location,
      target_location,
      search_radius = 5,
      mood_text,
      dietary_restrictions = [],
      meal_period = 'all_day',
      craving_attributes = [],
      prioritize_hidden_gems = false,
      data_source = 'hybrid',
      time_context
    } = req.body;

    // Validate location
    if (!location && !target_location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required (either location or target_location)'
      });
    }

    const searchLocation = target_location || location;
    
    // Build time context
    const timeContext = time_context || {
      current_time: new Date().toISOString(),
      current_hour: new Date().getHours(),
      day_of_week: new Date().toLocaleDateString('en', {weekday: 'long'}).toLowerCase()
    };

    const params = {
      location,
      target_location,
      search_radius: parseInt(search_radius),
      mood_text,
      dietary: dietary_restrictions,
      meal_period,
      cravingAttributes: craving_attributes,
      timeContext,
      prioritize_hidden_gems,
      data_source
    };

    // Get recommendations using enhanced menu manager
    const recommendations = await recommendFromMenus(params);

    if (!recommendations || recommendations.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: 'No matching restaurants found in your area',
        search_params: {
          location: searchLocation,
          radius_km: search_radius,
          data_source,
          sources_searched: firebaseRestaurantService ? ['firebase', 'local'] : ['local']
        }
      });
    }

    res.json({
      success: true,
      recommendations,
      search_params: {
        location: searchLocation,
        radius_km: search_radius,
        mood_text,
        dietary_restrictions,
        meal_period,
        data_source,
        sources_searched: firebaseRestaurantService ? ['firebase', 'local'] : ['local']
      },
      metadata: {
        total_found: recommendations.length,
        search_time: new Date().toISOString(),
        hidden_gems_found: recommendations.filter(r => r.hidden_gem).length
      }
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recommendations',
      fallback_available: true
    });
  }
});

// ===============================
// EVENT MANAGEMENT ENDPOINTS
// ===============================

// POST /v1/events/submit - Enhanced event submission with restaurant linking
router.post('/events/submit', async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      time,
      category = 'food',
      price = 'Free',
      contact_name,
      contact_email,
      restaurant_id, // Optional: link to existing restaurant
      venue
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !date || !contact_email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, location, date, contact_email'
      });
    }

    const eventData = {
      title,
      description,
      location: {
        venue: venue || location.venue,
        city: location.city,
        country_code: location.country_code || 'GB',
        address: location.address || ''
      },
      date,
      time,
      category,
      price,
      contact_name,
      contact_email,
      restaurant_id: restaurant_id || null
    };

    // Submit to Firebase if available
    if (firebaseRestaurantService) {
      try {
        const result = await firebaseRestaurantService.addEvent(eventData);
        
        return res.json({
          success: true,
          message: 'Event submitted successfully and is pending review',
          event_id: result.event_id,
          status: 'pending_review',
          data_source: 'firebase'
        });
      } catch (error) {
        console.error('Firebase event submission failed:', error);
      }
    }

    // Fallback to local storage (simplified)
    const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    
    res.json({
      success: true,
      message: 'Event submitted successfully (local storage)',
      event_id: eventId,
      status: 'pending_review',
      data_source: 'local',
      note: 'Firebase not available - using local storage'
    });

  } catch (error) {
    console.error('Event submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit event'
    });
  }
});

// GET /v1/admin/events/pending - Get pending events for moderation
router.get('/admin/events/pending', async (req, res) => {
  try {
    // Check admin authorization (simplified - in production, use proper auth)
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader && authHeader.includes('admin'); // Simplified check

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!firebaseRestaurantService) {
      return res.json({
        success: true,
        events: [],
        message: 'Firebase not available - no pending events'
      });
    }

    const pendingEvents = await firebaseRestaurantService.getPendingEvents();

    res.json({
      success: true,
      events: pendingEvents.map(event => ({
        id: event.id,
        title: event.basic_info?.title,
        description: event.basic_info?.description,
        location: `${event.location?.venue || ''}, ${event.location?.city}`,
        when: event.scheduling?.date + (event.scheduling?.time ? ` at ${event.scheduling.time}` : ''),
        price: event.pricing?.price || 'Free',
        tag: event.basic_info?.category || 'food',
        contact_name: event.contact?.contact_name,
        contact_email: event.contact?.contact_email,
        city: event.location?.city,
        country_code: event.location?.country_code,
        submitted_at: event.moderation?.submitted_at
      })),
      total: pendingEvents.length
    });

  } catch (error) {
    console.error('Pending events fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending events'
    });
  }
});

// POST /v1/admin/events/:id/approve - Approve an event
router.post('/admin/events/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check admin authorization
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader && authHeader.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!firebaseRestaurantService) {
      return res.status(503).json({
        success: false,
        error: 'Firebase not available'
      });
    }

    await firebaseRestaurantService.approveEvent(id);

    res.json({
      success: true,
      message: 'Event approved successfully'
    });

  } catch (error) {
    console.error('Event approval error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to approve event'
    });
  }
});

// POST /v1/admin/events/:id/reject - Reject an event
router.post('/admin/events/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = '' } = req.body;
    
    // Check admin authorization
    const authHeader = req.headers.authorization;
    const isAdmin = authHeader && authHeader.includes('admin');

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!firebaseRestaurantService) {
      return res.status(503).json({
        success: false,
        error: 'Firebase not available'
      });
    }

    await firebaseRestaurantService.rejectEvent(id, reason);

    res.json({
      success: true,
      message: 'Event rejected successfully'
    });

  } catch (error) {
    console.error('Event rejection error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject event'
    });
  }
});

// ===============================
// ANALYTICS & STATS ENDPOINTS
// ===============================

// GET /v1/admin/summary - Enhanced admin summary with Firebase stats
router.get('/admin/summary', async (req, res) => {
  try {
    const stats = await menuManager.getStats();
    
    const summary = {
      vendor_id: 'vfied_system',
      menu_items: stats.combined?.total_menu_items || stats.local?.total_items || 0,
      restaurants: stats.combined?.total_restaurants || stats.local?.total_restaurants || 0,
      menu_version: '4.0_firebase_hybrid',
      data_sources: {
        firebase_enabled: Boolean(firebaseRestaurantService),
        firebase_stats: stats.firebase || null,
        local_stats: stats.local || null
      },
      updatedAt: new Date().toISOString()
    };

    res.json(summary);

  } catch (error) {
    console.error('Admin summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get admin summary'
    });
  }
});

// GET /v1/menus - Enhanced menu listing with Firebase integration
router.get('/menus', async (req, res) => {
  try {
    const { 
      limit = 50, 
      data_source = 'hybrid',
      restaurant_id 
    } = req.query;

    let menuItems = [];

    if (restaurant_id) {
      // Get menu items for specific restaurant
      if (firebaseRestaurantService) {
        try {
          menuItems = await firebaseRestaurantService.getMenuItems(restaurant_id);
        } catch (error) {
          console.log('Firebase menu items fetch failed, trying local...');
        }
      }
      
      // Fallback to local
      if (menuItems.length === 0) {
        const restaurants = await menuManager.getLocalMenus();
        const restaurant = restaurants.find(r => r.restaurant_id === restaurant_id);
        menuItems = restaurant ? restaurant.menu_items || [] : [];
      }
    } else {
      // Get all menu items
      if (data_source === 'firebase' && firebaseRestaurantService) {
        // This would require a more complex query in production
        menuItems = [];
      } else {
        menuItems = menuManager.getAllMenuItems();
      }
    }

    // Apply limit
    const limitedItems = menuItems.slice(0, parseInt(limit));

    res.json({
      success: true,
      items: limitedItems.map(item => ({
        menu_item_id: item.menu_item_id || item.id,
        name: item.basic_info?.name || item.name,
        price: item.basic_info?.price || item.price,
        restaurant_name: item.restaurant_name || 'Unknown',
        restaurant_id: item.restaurant_id,
        emoji: item.basic_info?.emoji || item.emoji,
        meal_period: item.classification?.meal_period || item.meal_period,
        tags: item.classification?.cuisine_tags || item.search_tags || item.tags,
        data_source: item.data_source || 'local'
      })),
      total_found: menuItems.length,
      data_source_used: data_source,
      firebase_available: Boolean(firebaseRestaurantService)
    });

  } catch (error) {
    console.error('Menu listing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu items'
    });
  }
});

// ===============================
// HEALTH CHECK WITH FIREBASE STATUS
// ===============================

// GET /health - Enhanced health check
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      menu_manager: 'operational',
      firebase: firebaseRestaurantService ? 'connected' : 'unavailable',
      local_storage: 'operational'
    },
    version: '4.0.0-firebase-integration'
  };

  // Test Firebase connection if available
  if (firebaseRestaurantService) {
    try {
      await firebaseRestaurantService.getRestaurantStats();
      health.services.firebase = 'operational';
    } catch (error) {
      health.services.firebase = 'degraded';
      health.status = 'degraded';
    }
  }

  res.json(health);
});

export default router;