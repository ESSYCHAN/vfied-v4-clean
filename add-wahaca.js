// add-wahaca.js
// Add Wahaca Mexican restaurant to Firebase

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const wahacaData = {
  restaurant_name: "Wahaca",
  location: {
    address: "66 Chandos Place, Covent Garden, London WC2N 4HG",
    city: "London",
    country_code: "GB",
    coordinates: {
      lat: 51.5101,
      lng: -0.1247
    },
    phone: "020 7240 1883",
    email: "hello@wahaca.co.uk"
  },
  metadata: {
    goals: ["mexican_cuisine", "sustainable_sourcing", "vibrant_atmosphere"],
    cuisine_type: "Mexican",
    working_hours: {
      monday: "12:00 PM - 10:00 PM",
      tuesday: "12:00 PM - 10:00 PM",
      wednesday: "12:00 PM - 10:00 PM",
      thursday: "12:00 PM - 10:00 PM",
      friday: "12:00 PM - 10:30 PM",
      saturday: "12:00 PM - 10:30 PM",
      sunday: "12:00 PM - 9:00 PM"
    },
    dietary_notes: "Vegan and non-gluten menus available. Free range chicken and pork, sustainably sourced fish."
  },
  menu_items: [
    // ENTRADAS (Starters)
    {
      name: "Guacamole",
      price: "£6.95",
      description: "Avocado, lime and coriander, served with tortilla chips",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "fresh", "signature"],
      dietary_options: ["vegetarian", "vegan"],
      allergens: [],
      emoji: "🥑"
    },
    {
      name: "Black Bean Nachos",
      price: "£10.50",
      description: "Black beans, crema, guacamole, pink pickled onions, queso cheese sauce, fresh tomato salsa and jalapeño",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "sharing", "popular"],
      dietary_options: ["vegetarian"],
      allergens: ["milk"],
      emoji: "🧀"
    },
    {
      name: "Pico de Gallo",
      price: "£6.50",
      description: "Tomato, onion, lime and fresh herbs, served with tortilla chips",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "fresh", "light"],
      dietary_options: ["vegetarian", "vegan"],
      allergens: [],
      emoji: "🍅"
    },

    // TACOS
    {
      name: "Pork Pibil Tacos",
      price: "£7.95",
      description: "Free range, slow-cooked in citrus and achiote, a Mexican classic. Two soft corn tortillas",
      category: "tacos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "signature", "slow_cooked"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🌮"
    },
    {
      name: "Grilled Chicken & Avocado Tacos",
      price: "£7.95",
      description: "Free range, with a warming Yucatecan salsa. Two soft corn tortillas",
      category: "tacos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "grilled", "fresh"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🌮"
    },
    {
      name: "Beef Gringa Tacos",
      price: "£8.50",
      description: "Grass-fed, slow-cooked, with grilled cheese and salsa fresca. Two soft corn tortillas",
      category: "tacos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "beef", "cheese"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🌮"
    },
    {
      name: "Baja Fish Tacos",
      price: "£8.50",
      description: "Crisp, panko-crumbed pollock, with chipotle mayo and pickles. Two soft flour tortillas",
      category: "tacos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "fish", "crispy"],
      dietary_options: [],
      allergens: ["gluten", "fish", "egg"],
      emoji: "🐟"
    },
    {
      name: "Plantain Tacos",
      price: "£6.95",
      description: "Chipotle hibiscus glaze, crema and crumbled feta. Two soft corn tortillas",
      category: "tacos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "sweet"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk"],
      emoji: "🍌"
    },

    // BURRITOS
    {
      name: "Free Range Chicken Burrito",
      price: "£16.50",
      description: "Ancho rub, black beans, rice, cheese, salsas, and slaw. Topped with guacamole and pico de gallo",
      category: "burritos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "filling", "popular"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🌯"
    },
    {
      name: "Slow-Cooked Beef Burrito",
      price: "£16.50",
      description: "Grass-fed, with chipotle, ancho, herbs and spices. Black beans, rice, cheese, salsas, and slaw",
      category: "burritos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "beef", "hearty"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🌯"
    },
    {
      name: "Griddled Cactus & Courgette Burrito",
      price: "£15.95",
      description: "Sautéed sweetcorn, black beans, rice, cheese, salsas, and slaw. Topped with guacamole and pico de gallo",
      category: "burritos",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "unique"],
      dietary_options: ["vegetarian", "vegan_available"],
      allergens: ["gluten"],
      emoji: "🌯"
    },

    // QUESADILLAS
    {
      name: "Grilled Brindisa Chorizo Quesadilla",
      price: "£7.95",
      description: "With caramelised red onion. Cheese-filled, toasted flour tortilla",
      category: "quesadillas",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "chorizo", "grilled"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🧀"
    },
    {
      name: "Black Bean & Three Cheese Quesadilla",
      price: "£6.95",
      description: "With avocado leaf. Cheese-filled, toasted flour tortilla",
      category: "quesadillas",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "cheese"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk"],
      emoji: "🧀"
    },

    // SUNSHINE BOWLS
    {
      name: "Sunshine Bowl with Halloumi Al Pastor",
      price: "£14.50",
      description: "A vibrant bowl of 30 plants, with avocado, sautéed corn, spinach, quinoa, black beans and coconut-lime dressing",
      category: "bowls",
      meal_period: ["lunch", "dinner"],
      tags: ["healthy", "vegetarian", "colorful"],
      dietary_options: ["vegetarian"],
      allergens: ["milk", "nuts"],
      emoji: "🥗"
    },
    {
      name: "Sunshine Bowl with Free Range Chicken",
      price: "£14.50",
      description: "A vibrant bowl of 30 plants, with avocado, sautéed corn, spinach, quinoa, black beans and coconut-lime dressing",
      category: "bowls",
      meal_period: ["lunch", "dinner"],
      tags: ["healthy", "chicken", "colorful"],
      dietary_options: [],
      allergens: ["nuts"],
      emoji: "🥗"
    },

    // LARGER PLATES
    {
      name: "Smoky Caramelised Pork Belly",
      price: "£16.95",
      description: "Free range, with tamarind sauce, crispy leeks and rice or tortillas",
      category: "mains",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "pork", "signature"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🍖"
    },
    {
      name: "Grilled Achiote Seabass",
      price: "£17.95",
      description: "Fillet of seabass, charred pineapple salsa, salsa macha and rice or tortillas",
      category: "mains",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "fish", "premium"],
      dietary_options: [],
      allergens: ["fish", "nuts"],
      emoji: "🐟"
    },
    {
      name: "Hibiscus Glazed Aubergine",
      price: "£15.95",
      description: "Avocado purée, salsa macha, lime and coconut quinoa",
      category: "mains",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "vegan"],
      dietary_options: ["vegetarian", "vegan"],
      allergens: ["nuts"],
      emoji: "🍆"
    },

    // SIDES
    {
      name: "Sweet Potato 'Bravas'",
      price: "£6.50",
      description: "Smoky caramelised garlic mojo de ajo, jalapeño allioli and hibiscus salsa",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "spicy"],
      dietary_options: ["vegetarian"],
      allergens: [],
      emoji: "🍠"
    },
    {
      name: "Frijoles Crema",
      price: "£4.50",
      description: "Creamy black beans, crumbled cheese and crema",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "vegetarian", "creamy"],
      dietary_options: ["vegetarian"],
      allergens: ["milk"],
      emoji: "🫘"
    },
    {
      name: "Grilled Tenderstem Broccoli",
      price: "£5.95",
      description: "Garlic herb oil, toasted nuts and seeds",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["healthy", "vegetarian", "vegan"],
      dietary_options: ["vegetarian", "vegan"],
      allergens: ["nuts"],
      emoji: "🥦"
    },

    // DESSERTS
    {
      name: "Churros",
      price: "£6.95",
      description: "Crisp Mexican doughnuts, with a rich chocolate sauce or dulce de leche caramel",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "sweet", "signature"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍩"
    },
    {
      name: "Tres Leches Tiramisu",
      price: "£7.50",
      description: "Cream, espresso, and Cazcabel coffee tequila-soaked sponge, topped with whipped cream",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["mexican", "sweet", "boozy"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk", "egg"],
      emoji: "🍰"
    },
    {
      name: "Chocolate & Pecan Brownie",
      price: "£6.95",
      description: "Salted caramel ice cream and dulce de leche",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["chocolate", "sweet", "nuts"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk", "egg", "nuts"],
      emoji: "🍫"
    }
  ]
};

async function addWahaca() {
  try {
    console.log('🌮 Adding Wahaca to Firebase...\n');

    const restaurantId = 'wahaca_covent_garden';

    // Create restaurant document
    const restaurantDoc = {
      restaurant_id: restaurantId,
      basic_info: {
        name: wahacaData.restaurant_name,
        cuisine_type: wahacaData.metadata.cuisine_type.toLowerCase(),
        description: 'Mexican street food restaurant serving fresh, sustainable tacos, burritos and more',
        website: 'https://www.wahaca.co.uk',
        phone: wahacaData.location.phone,
        email: wahacaData.location.email
      },
      location: {
        city: wahacaData.location.city,
        country_code: wahacaData.location.country_code,
        address: wahacaData.location.address,
        coordinates: new admin.firestore.GeoPoint(
          wahacaData.location.coordinates.lat,
          wahacaData.location.coordinates.lng
        ),
        neighborhood: 'Covent Garden'
      },
      business_info: {
        opening_hours: {
          monday: { open: '12:00', close: '22:00', closed: false },
          tuesday: { open: '12:00', close: '22:00', closed: false },
          wednesday: { open: '12:00', close: '22:00', closed: false },
          thursday: { open: '12:00', close: '22:00', closed: false },
          friday: { open: '12:00', close: '22:30', closed: false },
          saturday: { open: '12:00', close: '22:30', closed: false },
          sunday: { open: '12:00', close: '21:00', closed: false }
        },
        delivery_platforms: {
          deliveroo_id: 'wahaca-covent-garden',
          ubereats_id: 'wahaca-london'
        },
        price_range: '$$'
      },
      metadata: {
        goals: wahacaData.metadata.goals,
        dietary_notes: wahacaData.metadata.dietary_notes
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
    for (const item of wahacaData.menu_items) {
      const mealPeriod = Array.isArray(item.meal_period) ? item.meal_period[0] : item.meal_period || 'all_day';

      const menuItemDoc = {
        menu_item_id: `${restaurantId}_${itemCount}_${Date.now()}`,
        restaurant_id: restaurantId,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'main',
          emoji: item.emoji || '🌮'
        },
        classification: {
          meal_period: mealPeriod,
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: item.dietary_options?.includes('vegetarian') || false,
            vegan: item.dietary_options?.includes('vegan') || item.dietary_options?.includes('vegan_available') || false,
            gluten_free: !item.allergens?.includes('gluten'),
            dairy_free: !item.allergens?.includes('milk'),
            halal: false,
            kosher: false
          },
          spice_level: item.tags?.includes('spicy') ? 2 : 0,
          allergens: item.allergens || []
        },
        availability: {
          available: true,
          seasonal: item.tags?.includes('seasonal') || false,
          daily_limit: null,
          availability_note: ''
        },
        marketing: {
          signature_dish: item.tags?.includes('signature') || false,
          chef_recommendation: item.tags?.includes('chef_special') || false,
          popular: item.tags?.includes('popular') || false,
          new_item: false
        },
        hidden_gem_factors: {
          family_recipe: false,
          secret_recipe: false,
          limited_availability: false,
          traditional_method: item.tags?.includes('slow_cooked') || false,
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

    console.log('🎉 Wahaca successfully added to Firebase!');
    console.log(`\nSummary:`);
    console.log(`  - Restaurant: ${wahacaData.restaurant_name}`);
    console.log(`  - Location: ${wahacaData.location.address}`);
    console.log(`  - Cuisine: ${wahacaData.metadata.cuisine_type}`);
    console.log(`  - Menu Items: ${itemCount}`);

  } catch (error) {
    console.error('❌ Error adding Wahaca:', error);
  }
}

// Run the script
addWahaca();
