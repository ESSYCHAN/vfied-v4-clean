// migrate-to-firebase.js
// Migrate existing restaurant data from JSON to Firebase

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateToFirebase() {
  try {
    console.log('🚀 Starting migration from JSON to Firebase...\n');

    // Read existing restaurant data
    const menusPath = path.resolve(__dirname, 'data/restaurant_menus.json');
    const menusData = JSON.parse(await fs.readFile(menusPath, 'utf8'));

    const restaurants = menusData.menus;
    let restaurantCount = 0;
    let menuItemCount = 0;

    for (const [key, restaurant] of Object.entries(restaurants)) {
      console.log(`📍 Migrating: ${restaurant.restaurant_name}...`);

      // Create restaurant document
      const restaurantDoc = {
        restaurant_id: restaurant.restaurant_id,
        basic_info: {
          name: restaurant.restaurant_name,
          cuisine_type: restaurant.cuisine_type || 'international',
          description: '',
          website: restaurant.website || '',
          phone: restaurant.phone || ''
        },
        location: {
          city: restaurant.location.city,
          country_code: restaurant.location.country_code,
          address: restaurant.location.address || '',
          coordinates: null,
          neighborhood: ''
        },
        business_info: {
          opening_hours: restaurant.opening_hours || {},
          delivery_platforms: restaurant.delivery_platforms || {},
          price_range: '$$',
          seating_capacity: null,
          accepts_reservations: false
        },
        media: {
          hero_image: '',
          gallery: [],
          logo: '',
          banner: ''
        },
        metadata: {
          goals: restaurant.metadata?.goals || [],
          menu_size: `${restaurant.menu_items.length} items`,
          pos_systems: restaurant.metadata?.pos_systems || [],
          target_audience: [],
          signup_source: 'migration',
          hidden_gem_override: null,
          hidden_gem_tier: '',
          reviews: null
        },
        verification: {
          owner_verified: false,
          claimed_by: null,
          verification_date: null,
          admin_approved: true, // Auto-approve migrated restaurants
          data_source: 'migration'
        },
        statistics: {
          total_menu_items: restaurant.menu_items.length,
          view_count: 0,
          recommendation_count: 0,
          last_menu_update: admin.firestore.FieldValue.serverTimestamp(),
          hidden_gem_override: null,
          community_rating: null,
          review_count: 0
        },
        created_at: restaurant.created_at ? new Date(restaurant.created_at) : admin.firestore.FieldValue.serverTimestamp(),
        updated_at: restaurant.updated_at ? new Date(restaurant.updated_at) : admin.firestore.FieldValue.serverTimestamp()
      };

      // Save restaurant to Firestore
      await adminDb.collection('restaurants').doc(restaurant.restaurant_id).set(restaurantDoc);
      restaurantCount++;
      console.log(`  ✅ Restaurant created`);

      // Migrate menu items
      for (const item of restaurant.menu_items) {
        const menuItemDoc = {
          menu_item_id: item.menu_item_id,
          restaurant_id: restaurant.restaurant_id,
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
            spice_level: 0,
            allergens: []
          },
          availability: {
            available: item.available !== false,
            seasonal: false,
            daily_limit: null,
            availability_note: ''
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
            limited_availability: false,
            traditional_method: false,
            preparation_time: null
          },
          media: {
            image: null,
            gallery: []
          },
          statistics: {
            view_count: 0,
            order_count: 0,
            recommendation_count: 0,
            rating_sum: 0,
            rating_count: 0
          },
          created_at: item.created_at ? new Date(item.created_at) : admin.firestore.FieldValue.serverTimestamp(),
          updated_at: item.updated_at ? new Date(item.updated_at) : admin.firestore.FieldValue.serverTimestamp()
        };

        await adminDb.collection('menu_items').add(menuItemDoc);
        menuItemCount++;
      }

      console.log(`  ✅ ${restaurant.menu_items.length} menu items migrated\n`);
    }

    console.log('\n🎉 Migration complete!');
    console.log(`Summary:`);
    console.log(`  - ${restaurantCount} restaurants migrated`);
    console.log(`  - ${menuItemCount} menu items migrated`);
    console.log(`\nTotal in Firebase:`);
    console.log(`  - ${restaurantCount + 2} restaurants (including 2 sample)`);
    console.log(`  - ${menuItemCount + 4} menu items (including 4 sample)`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Run migration
migrateToFirebase();
