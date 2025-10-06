// add-honest-burgers.js
// Add Honest Burgers to Firebase

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const honestBurgersData = {
  restaurant_name: "Honest Burgers",
  location: {
    address: "4-6 Meard Street, Soho, London W1F 0EF",
    city: "London",
    country_code: "GB",
    coordinates: {
      lat: 51.5134,
      lng: -0.1319
    },
    phone: "020 7494 2833",
    email: "hello@honestburgers.co.uk"
  },
  metadata: {
    goals: ["quality_beef", "local_sourcing", "british_burgers"],
    cuisine_type: "British",
    working_hours: {
      monday: "11:00 AM - 10:00 PM",
      tuesday: "11:00 AM - 10:00 PM",
      wednesday: "11:00 AM - 10:00 PM",
      thursday: "11:00 AM - 10:00 PM",
      friday: "11:00 AM - 10:30 PM",
      saturday: "11:00 AM - 10:30 PM",
      sunday: "11:00 AM - 9:00 PM"
    },
    dietary_notes: "Gluten-free options available. Vegan and vegetarian burgers. All burgers come with rosemary salted chips."
  },
  menu_items: [
    // BEEF BURGERS
    {
      name: "Honest Butcher's Beef Burger",
      price: "£10.50",
      description: "Honest beef, red onion relish and lettuce. Always with rosemary salted chips",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "signature", "gluten_free"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🍔"
    },
    {
      name: "Honest Burger",
      price: "£12.50",
      description: "Honest beef, red onion relish, smoked bacon, cheddar, lettuce and pickles. Always with chips",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "bacon", "popular"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🍔"
    },
    {
      name: "Tribute Burger",
      price: "£13.50",
      description: "Honest beef, bacon, American cheese, burger sauce, French's mustard, pickles, onion and lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "bacon", "signature"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍔"
    },
    {
      name: "Chilli Burger",
      price: "£14.50",
      description: "Honest beef, bacon, cheddar, Honest hot sauce, smoky shoestring fries, lettuce and pickled jalapeños",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "spicy", "bacon"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🌶️"
    },
    {
      name: "Smashed Burger",
      price: "£13.95",
      description: "Double smashed Honest beef, bacon, American cheese, burger sauce, French's mustard, pickles, onion and lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "double", "smashed"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍔"
    },

    // CHICKEN BURGERS
    {
      name: "BBQ Chicken Burger",
      price: "£13.50",
      description: "Honest fried chicken, American cheese, BBQ mayo, lettuce, homemade pickles",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "fried", "bbq"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍗"
    },
    {
      name: "Pesto H Burger",
      price: "£13.50",
      description: "Honest grilled chicken breast, basil pesto, brown butter mustard mayo, tomato and rocket",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "grilled", "pesto"],
      dietary_options: [],
      allergens: ["gluten", "milk", "nuts"],
      emoji: "🍗"
    },
    {
      name: "Buffalo Burger",
      price: "£14.50",
      description: "Honest fried chicken breast, American cheese, buffalo sauce, ranch mayo, lettuce and pickles",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "fried", "spicy"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🔥"
    },

    // VEGAN & VEGETARIAN
    {
      name: "Fritter Burger",
      price: "£12.50",
      description: "Southern fried fritter, cheddar, chipotle mayo, seasonal coleslaw",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "fried"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🥕"
    },
    {
      name: "Plant Burger",
      price: "£13.95",
      description: "Beyond Meat burger, Violife smoky cheddar, chipotle 'mayo', mustard, onion, pickles, lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegan", "plant_based"],
      dietary_options: ["vegan"],
      allergens: ["gluten"],
      emoji: "🌱"
    },
    {
      name: "Bacon Plant 2.0 Burger",
      price: "£15.50",
      description: "Beyond Meat burger, La Vie plant-based bacon, Violife smoky cheddar, bacon dust shoestring fries, vegan chipotle mayo, rocket and pickles",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegan", "plant_based", "premium"],
      dietary_options: ["vegan"],
      allergens: ["gluten"],
      emoji: "🌱"
    },

    // SIDES
    {
      name: "Rosemary Salted Chips",
      price: "£4.50",
      description: "Fresh, never frozen. Seasoned with rosemary salt",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegan", "gluten_free"],
      dietary_options: ["vegan", "vegetarian", "gluten_free"],
      allergens: [],
      emoji: "🍟"
    },
    {
      name: "Halloumi Fries",
      price: "£6.95",
      description: "Organic Welsh halloumi fries with chipotle jam",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "gluten_free"],
      dietary_options: ["vegetarian", "gluten_free"],
      allergens: ["milk"],
      emoji: "🧀"
    },
    {
      name: "Onion Rings",
      price: "£5.50",
      description: "Homemade light and crispy onion rings in a gluten-free batter",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "gluten_free"],
      dietary_options: ["vegetarian", "gluten_free"],
      allergens: [],
      emoji: "🧅"
    },
    {
      name: "Autumn/Winter Coleslaw",
      price: "£4.50",
      description: "Red cabbage, apple, beetroot and parsley with lemon mayo dressing",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "seasonal"],
      dietary_options: ["vegetarian"],
      allergens: ["egg"],
      emoji: "🥗"
    },
    {
      name: "House Green Salad",
      price: "£5.50",
      description: "Lettuce, rocket, pickled celery, crispy onions and ranch dressing",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "healthy"],
      dietary_options: ["vegetarian"],
      allergens: ["milk", "egg"],
      emoji: "🥗"
    },
    {
      name: "BBQ Chicken Tenders",
      price: "£7.95",
      description: "Fried chicken tenders with BBQ mayo and pickles",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "fried"],
      dietary_options: [],
      allergens: ["gluten", "egg"],
      emoji: "🍗"
    },
    {
      name: "Buffalo Wings",
      price: "£8.95",
      description: "Honest chicken wings with Frank's RedHot buffalo sauce, ranch mayo and pickled celery",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "spicy", "popular"],
      dietary_options: [],
      allergens: ["milk", "egg"],
      emoji: "🍗"
    },
    {
      name: "BBQ Sriracha Wings",
      price: "£8.95",
      description: "Honest chicken wings with BBQ Sriracha sauce",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "spicy", "bbq"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },

    // KIDS MENU
    {
      name: "Kids Chicken Tenders",
      price: "£7.50",
      description: "Honest fried chicken tenders with chips. Add BBQ mayo and pickles",
      category: "kids",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "kids"],
      dietary_options: [],
      allergens: ["gluten", "egg"],
      emoji: "🍗"
    },
    {
      name: "Kids Beef Burger",
      price: "£7.50",
      description: "100% Honest Butcher's smashed beef patty with chips. Add American cheese, pickles, sweet onions",
      category: "kids",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "kids"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🍔"
    },
    {
      name: "Kids Fritter",
      price: "£7.50",
      description: "Homemade southern fried vegetarian fritter. Add cheddar and chipotle mayo",
      category: "kids",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "vegetarian", "kids"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "egg"],
      emoji: "🥕"
    },

    // SPECIAL BURGERS (SEASONAL)
    {
      name: "Deep South: Fried Chicken",
      price: "£15.50",
      description: "Honest fried chicken, bacon, Homewrecker pimento cheese, BBQ mayo, Chow Chow pickle relish & lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "chicken", "special", "limited"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍗"
    },
    {
      name: "Deep South: Double Smashed",
      price: "£16.50",
      description: "Double smashed beef, bacon, Homewrecker pimento cheese, BBQ mayo, Chow Chow pickle relish & lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "special", "limited", "double"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍔"
    },
    {
      name: "Deep South: Honest Beef",
      price: "£15.50",
      description: "Honest beef, bacon, Homewrecker pimento cheese, BBQ mayo, Chow Chow pickle relish & lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["british", "beef", "special", "limited"],
      dietary_options: [],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍔"
    }
  ]
};

async function addHonestBurgers() {
  try {
    console.log('🍔 Adding Honest Burgers to Firebase...\n');

    const restaurantId = 'honest_burgers_soho';

    // Create restaurant document
    const restaurantDoc = {
      restaurant_id: restaurantId,
      basic_info: {
        name: honestBurgersData.restaurant_name,
        cuisine_type: honestBurgersData.metadata.cuisine_type.toLowerCase(),
        description: 'British burger restaurant using quality, locally-sourced beef and free-range chicken',
        website: 'https://www.honestburgers.co.uk',
        phone: honestBurgersData.location.phone,
        email: honestBurgersData.location.email
      },
      location: {
        city: honestBurgersData.location.city,
        country_code: honestBurgersData.location.country_code,
        address: honestBurgersData.location.address,
        coordinates: new admin.firestore.GeoPoint(
          honestBurgersData.location.coordinates.lat,
          honestBurgersData.location.coordinates.lng
        ),
        neighborhood: 'Soho'
      },
      business_info: {
        opening_hours: {
          monday: { open: '11:00', close: '22:00', closed: false },
          tuesday: { open: '11:00', close: '22:00', closed: false },
          wednesday: { open: '11:00', close: '22:00', closed: false },
          thursday: { open: '11:00', close: '22:00', closed: false },
          friday: { open: '11:00', close: '22:30', closed: false },
          saturday: { open: '11:00', close: '22:30', closed: false },
          sunday: { open: '11:00', close: '21:00', closed: false }
        },
        delivery_platforms: {
          deliveroo_id: 'honest-burgers-soho',
          ubereats_id: 'honest-burgers-london'
        },
        price_range: '$$'
      },
      metadata: {
        goals: honestBurgersData.metadata.goals,
        dietary_notes: honestBurgersData.metadata.dietary_notes
      },
      verification: {
        admin_approved: true,
        data_source: 'manual_entry'
      },
      metrics: {
        total_menu_items: 0,
        views: 0,
        recommendations_count: 0
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await adminDb.collection('restaurants').doc(restaurantId).set(restaurantDoc);
    console.log('✅ Restaurant created\n');

    // Add menu items
    let itemCount = 0;
    for (const item of honestBurgersData.menu_items) {
      const mealPeriod = Array.isArray(item.meal_period) ? item.meal_period[0] : item.meal_period || 'all_day';

      const menuItemDoc = {
        menu_item_id: `${restaurantId}_${itemCount}_${Date.now()}`,
        restaurant_id: restaurantId,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'main',
          emoji: item.emoji || '🍔'
        },
        classification: {
          meal_period: mealPeriod,
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: item.dietary_options?.includes('vegetarian') || false,
            vegan: item.dietary_options?.includes('vegan') || false,
            gluten_free: item.dietary_options?.includes('gluten_free') || !item.allergens?.includes('gluten'),
            dairy_free: !item.allergens?.includes('milk'),
            halal: false,
            kosher: false
          },
          spice_level: item.tags?.includes('spicy') ? 2 : 0,
          allergens: item.allergens || []
        },
        availability: {
          available: true,
          seasonal: item.tags?.includes('seasonal') || item.tags?.includes('limited') || false,
          daily_limit: null,
          availability_note: item.tags?.includes('limited') ? 'Limited time special' : ''
        },
        marketing: {
          signature_dish: item.tags?.includes('signature') || false,
          chef_recommendation: false,
          popular: item.tags?.includes('popular') || false,
          new_item: item.tags?.includes('special') || false
        },
        hidden_gem_factors: {
          family_recipe: false,
          secret_recipe: false,
          limited_availability: item.tags?.includes('limited') || false,
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
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await adminDb.collection('menu_items').add(menuItemDoc);
      itemCount++;
    }

    console.log(`✅ ${itemCount} menu items added\n`);

    console.log('🎉 Honest Burgers successfully added to Firebase!');
    console.log(`\nSummary:`);
    console.log(`  - Restaurant: ${honestBurgersData.restaurant_name}`);
    console.log(`  - Location: ${honestBurgersData.location.address}`);
    console.log(`  - Cuisine: ${honestBurgersData.metadata.cuisine_type}`);
    console.log(`  - Menu Items: ${itemCount}`);

  } catch (error) {
    console.error('❌ Error adding Honest Burgers:', error);
  }
}

// Run the script
addHonestBurgers();
