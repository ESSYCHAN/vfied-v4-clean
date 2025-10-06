// setup-firestore-collections.js
// Script to populate initial Firestore collections for VFIED

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const sampleRestaurants = [
  {
    restaurant_id: 'dishoom_covent_garden',
    basic_info: {
      name: 'Dishoom Covent Garden',
      cuisine_type: 'indian',
      description: 'Bombay-style cafe serving Indian street food',
      website: 'https://www.dishoom.com',
      phone: '+44 20 7420 9320'
    },
    location: {
      city: 'London',
      country_code: 'GB',
      address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
      coordinates: new admin.firestore.GeoPoint(51.5101, -0.1280)
    },
    verification: {
      admin_approved: true,
      data_source: 'sample_data'
    },
    business_info: {
      opening_hours: {
        monday: { open: '08:00', close: '23:00', closed: false },
        tuesday: { open: '08:00', close: '23:00', closed: false },
        wednesday: { open: '08:00', close: '23:00', closed: false },
        thursday: { open: '08:00', close: '23:00', closed: false },
        friday: { open: '08:00', close: '23:00', closed: false },
        saturday: { open: '09:00', close: '23:00', closed: false },
        sunday: { open: '09:00', close: '22:00', closed: false }
      },
      delivery_platforms: {
        deliveroo_id: 'dishoom-covent-garden',
        ubereats_id: 'dishoom-london'
      },
      price_range: '$$'
    },
    metadata: {
      goals: ['highlight_specialties', 'attract_dietary']
    },
    metrics: {
      total_menu_items: 0,
      views: 0,
      recommendations_count: 0
    },
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    restaurant_id: 'the_breakfast_club_soho',
    basic_info: {
      name: 'The Breakfast Club Soho',
      cuisine_type: 'american',
      description: 'All-day breakfast and American comfort food',
      website: 'https://thebreakfastclubcafes.com',
      phone: '+44 20 7434 2571'
    },
    location: {
      city: 'London',
      country_code: 'GB',
      address: '33 D\'Arblay Street, London W1F 8EU',
      coordinates: new admin.firestore.GeoPoint(51.5154, -0.1371)
    },
    verification: {
      admin_approved: true,
      data_source: 'sample_data'
    },
    business_info: {
      opening_hours: {
        monday: { open: '07:00', close: '21:00', closed: false },
        tuesday: { open: '07:00', close: '21:00', closed: false },
        wednesday: { open: '07:00', close: '21:00', closed: false },
        thursday: { open: '07:00', close: '21:00', closed: false },
        friday: { open: '07:00', close: '22:00', closed: false },
        saturday: { open: '08:00', close: '22:00', closed: false },
        sunday: { open: '08:00', close: '21:00', closed: false }
      },
      price_range: '$'
    },
    metadata: {
      goals: ['increase_visibility']
    },
    metrics: {
      total_menu_items: 0,
      views: 0,
      recommendations_count: 0
    },
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  }
];

const sampleMenuItems = [
  {
    restaurant_id: 'dishoom_covent_garden',
    basic_info: {
      name: 'Bacon Naan Roll',
      price: '£7.50',
      category: 'breakfast',
      description: 'Crispy bacon in fresh naan with cream cheese and herbs',
      emoji: '🥓'
    },
    classification: {
      meal_period: 'breakfast',
      cuisine_tags: ['indian', 'fusion', 'signature'],
      dietary: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        dairy_free: false,
        halal: false
      }
    },
    availability: {
      available: true,
      seasonal: false
    },
    restaurant_link: {
      website: 'https://www.dishoom.com/menu',
      delivery_url: 'https://deliveroo.co.uk/menu/london/dishoom-covent-garden',
      booking_url: 'https://www.dishoom.com/book'
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    restaurant_id: 'dishoom_covent_garden',
    basic_info: {
      name: 'House Black Daal',
      price: '£8.90',
      category: 'main',
      description: '24-hour slow-cooked black lentils, rich and creamy',
      emoji: '🍛'
    },
    classification: {
      meal_period: 'all_day',
      cuisine_tags: ['indian', 'traditional', 'comfort_food', 'signature'],
      dietary: {
        vegetarian: true,
        vegan: false,
        gluten_free: true,
        dairy_free: false,
        halal: true
      }
    },
    availability: {
      available: true,
      seasonal: false
    },
    restaurant_link: {
      website: 'https://www.dishoom.com/menu',
      delivery_url: 'https://deliveroo.co.uk/menu/london/dishoom-covent-garden'
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    restaurant_id: 'the_breakfast_club_soho',
    basic_info: {
      name: 'Full Monty Breakfast',
      price: '£12.95',
      category: 'breakfast',
      description: 'Two eggs, bacon, sausage, baked beans, grilled tomato, mushrooms, toast',
      emoji: '🍳'
    },
    classification: {
      meal_period: 'breakfast',
      cuisine_tags: ['british', 'hearty', 'traditional'],
      dietary: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        dairy_free: false,
        halal: false
      }
    },
    availability: {
      available: true,
      seasonal: false
    },
    restaurant_link: {
      website: 'https://thebreakfastclubcafes.com/menu',
      delivery_url: 'https://deliveroo.co.uk/menu/london/the-breakfast-club-soho'
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    restaurant_id: 'the_breakfast_club_soho',
    basic_info: {
      name: 'Buttermilk Pancakes',
      price: '£9.50',
      category: 'breakfast',
      description: 'Stack of fluffy pancakes with maple syrup and butter',
      emoji: '🥞'
    },
    classification: {
      meal_period: 'all_day',
      cuisine_tags: ['american', 'sweet', 'comfort_food'],
      dietary: {
        vegetarian: true,
        vegan: false,
        gluten_free: false,
        dairy_free: false,
        halal: false
      }
    },
    availability: {
      available: true,
      seasonal: false
    },
    restaurant_link: {
      website: 'https://thebreakfastclubcafes.com/menu'
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }
];

const sampleEvents = [
  {
    basic_info: {
      title: 'London Food Festival 2025',
      description: 'Annual celebration of London\'s diverse culinary scene with tastings, chef demos, and local vendors',
      type: 'food_festival',
      category: 'community'
    },
    event_details: {
      start_date: new Date('2025-06-15T10:00:00Z'),
      end_date: new Date('2025-06-15T18:00:00Z'),
      duration_hours: 8,
      recurring: true,
      recurrence_pattern: 'annual'
    },
    location: {
      venue_name: 'Hyde Park',
      address: 'Hyde Park, London W2 2UH',
      city: 'London',
      country_code: 'GB',
      coordinates: new admin.firestore.GeoPoint(51.5074, -0.1658)
    },
    contact: {
      contact_name: 'London Food Festival Team',
      contact_email: 'info@londonfoodfest.com',
      website: 'https://londonfoodfestival.com',
      phone: '+44 20 1234 5678',
      social_media: {
        instagram: '@londonfoodfest',
        twitter: '@londonfoodfest'
      }
    },
    restaurant_connection: {
      restaurant_id: null,
      hosted_by_restaurant: false,
      participating_restaurants: ['dishoom_covent_garden', 'the_breakfast_club_soho']
    },
    pricing: {
      entry_fee: '£15',
      currency: 'GBP',
      early_bird_price: '£12',
      group_discount: true
    },
    moderation: {
      status: 'approved',
      priority: 'high'
    },
    visibility: {
      public: true,
      featured: true,
      target_audience: ['food_lovers', 'families', 'tourists']
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  },
  {
    basic_info: {
      title: 'Dishoom Cooking Class: Perfect Naan',
      description: 'Learn to make authentic naan bread with Dishoom chefs',
      type: 'cooking_class',
      category: 'educational'
    },
    event_details: {
      start_date: new Date('2025-05-20T18:00:00Z'),
      end_date: new Date('2025-05-20T20:00:00Z'),
      duration_hours: 2,
      recurring: true,
      recurrence_pattern: 'monthly'
    },
    location: {
      venue_name: 'Dishoom Covent Garden',
      address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
      city: 'London',
      country_code: 'GB',
      coordinates: new admin.firestore.GeoPoint(51.5101, -0.1280)
    },
    contact: {
      contact_name: 'Dishoom Events',
      contact_email: 'events@dishoom.com',
      website: 'https://www.dishoom.com/events',
      phone: '+44 20 7420 9320'
    },
    restaurant_connection: {
      restaurant_id: 'dishoom_covent_garden',
      hosted_by_restaurant: true,
      participating_restaurants: ['dishoom_covent_garden']
    },
    pricing: {
      entry_fee: '£35',
      currency: 'GBP',
      early_bird_price: '£30',
      group_discount: false
    },
    moderation: {
      status: 'pending',
      priority: 'normal'
    },
    visibility: {
      public: true,
      featured: false,
      target_audience: ['cooking_enthusiasts', 'couples']
    },
    created_at: admin.firestore.FieldValue.serverTimestamp()
  }
];

async function setupCollections() {
  try {
    console.log('Setting up Firestore collections...');

    // Create restaurants
    console.log('Creating restaurants...');
    for (const restaurant of sampleRestaurants) {
      await adminDb.collection('restaurants').doc(restaurant.restaurant_id).set(restaurant);
      console.log(`✅ Created restaurant: ${restaurant.basic_info.name}`);
    }

    // Create menu items
    console.log('Creating menu items...');
    for (const item of sampleMenuItems) {
      await adminDb.collection('menu_items').add(item);
      console.log(`✅ Created menu item: ${item.basic_info.name}`);
    }

    // Update restaurant menu counts
    console.log('Updating restaurant menu counts...');
    for (const restaurant of sampleRestaurants) {
      const menuCount = sampleMenuItems.filter(item => item.restaurant_id === restaurant.restaurant_id).length;
      await adminDb.collection('restaurants').doc(restaurant.restaurant_id).update({
        'metrics.total_menu_items': menuCount
      });
      console.log(`✅ Updated menu count for ${restaurant.basic_info.name}: ${menuCount} items`);
    }

    // Create events
    console.log('Creating events...');
    for (const event of sampleEvents) {
      await adminDb.collection('events').add(event);
      console.log(`✅ Created event: ${event.basic_info.title}`);
    }

    console.log('\n🎉 Firestore collections setup complete!');
    console.log('Summary:');
    console.log(`- ${sampleRestaurants.length} restaurants created`);
    console.log(`- ${sampleMenuItems.length} menu items created`);
    console.log(`- ${sampleEvents.length} events created`);
    
  } catch (error) {
    console.error('❌ Error setting up collections:', error);
  }
}

// Run the setup
setupCollections();