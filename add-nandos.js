// add-nandos.js
// Add Nando's Peri-Peri Chicken restaurant to Firebase

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const nandosData = {
  restaurant_name: "Nando's",
  location: {
    address: "10 Frith Street, Soho, London W1D 3JF",
    city: "London",
    country_code: "GB",
    coordinates: {
      lat: 51.5140,
      lng: -0.1320
    },
    phone: "020 7287 6636",
    email: "hello@nandos.co.uk"
  },
  metadata: {
    goals: ["peri_peri_chicken", "south_african_cuisine", "flame_grilled"],
    cuisine_type: "Portuguese",
    working_hours: {
      monday: "11:30 AM - 10:00 PM",
      tuesday: "11:30 AM - 10:00 PM",
      wednesday: "11:30 AM - 10:00 PM",
      thursday: "11:30 AM - 10:00 PM",
      friday: "11:30 AM - 10:30 PM",
      saturday: "11:30 AM - 10:30 PM",
      sunday: "11:30 AM - 9:00 PM"
    },
    dietary_notes: "Fresh chicken marinated in PERi-PERi for 24 hours. Halal certified. Vegan and vegetarian options available."
  },
  menu_items: [
    // PERI-PERI CHICKEN - ON THE BONE
    {
      name: "1/4 Chicken",
      price: "£7.60",
      description: "For a real hands-on experience try to grips with... 1 chicken breast or 1 chicken leg",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "flame_grilled", "signature"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "1/2 Chicken",
      price: "£10.35",
      description: "1 chicken breast and 1 chicken leg, flame-grilled to perfection",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "flame_grilled", "popular"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Whole Chicken",
      price: "£12.75",
      description: "The full flame-grilled PERi-PERi chicken experience",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "flame_grilled", "sharing"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "10 Chicken Wings",
      price: "£9.95",
      description: "10 flame-grilled chicken wings with your choice of PERi-PERi spice",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "wings", "popular"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Wing Roulette",
      price: "£9.95",
      description: "10 randomly spiced wings - will you get mild, hot, or extra hot?",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "wings", "spicy"],
      dietary_options: [],
      allergens: [],
      emoji: "🌶️"
    },

    // OFF THE BONE
    {
      name: "Chicken Thighs",
      price: "£10.65",
      description: "Three boneless thighs, flame-grilled to perfection",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "boneless"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Chicken Butterfly",
      price: "£10.85",
      description: "Two succulent chicken breasts joined by crispy skin",
      category: "chicken",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "boneless", "popular"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },

    // BURGERS, PITTAS, WRAPS
    {
      name: "PERi-PERi Chicken Burger",
      price: "£9.20",
      description: "Chicken breast fillet in a Portuguese roll with lettuce, tomato and PERi-PERi sauce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "burger"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🍔"
    },
    {
      name: "Churrasco Thigh Burger",
      price: "£10.80",
      description: "Churrasco - a classic in Portugal. Two Chicken Thighs with Fino Coleslaw, Cheddar Cheese and Churrasco Lettuce",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "burger", "signature"],
      dietary_options: [],
      allergens: ["gluten", "milk"],
      emoji: "🍔"
    },
    {
      name: "Butterfly Burger",
      price: "£12.15",
      description: "Two succulent chicken breasts joined by crispy skin, topped with lettuce and tomato",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "burger", "premium"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🍔"
    },
    {
      name: "Grilled Chicken Pitta",
      price: "£9.15",
      description: "Chicken breast grilled to your favourite spiciness in a pitta",
      category: "wraps",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "pitta"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🥙"
    },
    {
      name: "Double Chicken Wrap",
      price: "£12.35",
      description: "Two PERi-PERi chicken breast fillets, lettuce and tomato in a wrap",
      category: "wraps",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "wrap", "double"],
      dietary_options: [],
      allergens: ["gluten"],
      emoji: "🌯"
    },

    // VEGGIE PERI-DISE
    {
      name: "Veggie Burger",
      price: "£9.10",
      description: "A spicy soya and tomato burger seasoned with garlic onion, green chilli and cayenne pepper",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegetarian", "burger"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "soya"],
      emoji: "🍔"
    },
    {
      name: "Veggie Pitta",
      price: "£9.70",
      description: "Grilled halloumi, roasted peppers and vegetables in a pitta",
      category: "wraps",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegetarian", "pitta"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk"],
      emoji: "🥙"
    },
    {
      name: "Portobello Mushroom & Halloumi Burger",
      price: "£10.25",
      description: "Portobello Mushroom, Fino Coleslaw and Grilled Halloumi Cheese team up beautifully",
      category: "burgers",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegetarian", "premium"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "milk"],
      emoji: "🍄"
    },

    // SHARING PLATTERS
    {
      name: "Whole Chicken Sharing Platter",
      price: "£19.95",
      description: "Whole Chicken, 1 large or 2 regular sides and 4 bottomless soft drinks",
      category: "platters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "sharing", "family"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Full Platter",
      price: "£19.95",
      description: "Whole Chicken, 2 large or 4 regular sides",
      category: "platters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "sharing", "family"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Wing Platter",
      price: "£17.45",
      description: "30 Chicken Wings, 2 large or 4 regular sides",
      category: "platters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "wings", "sharing"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },

    // APPETEASERS
    {
      name: "PERi-PERi Chicken Livers",
      price: "£3.50",
      description: "Chicken livers sautéed in PERi-PERi and oil over creamy hummus",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "appetizer"],
      dietary_options: [],
      allergens: [],
      emoji: "🍗"
    },
    {
      name: "Spicy Mixed Olives",
      price: "£3.45",
      description: "Try them once and it'll be a fan forever!",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegan", "spicy"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🫒"
    },
    {
      name: "Houmous with PERi-PERi Drizzle",
      price: "£3.55",
      description: "Houmous with PERi-PERi and oil over creamy houmous and dip in with warm strips of pitta",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegan", "dip"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: ["gluten"],
      emoji: "🫘"
    },
    {
      name: "Red Pepper Dip",
      price: "£3.55",
      description: "Flame-grilled red pepper and chilli spice dip with warm pitta strips",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegan", "dip"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: ["gluten"],
      emoji: "🫑"
    },
    {
      name: "Garlic Bread",
      price: "£2.40",
      description: "Toasted and deliciously garlicky, with a touch of PERi-Heat",
      category: "starters",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "garlic"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten"],
      emoji: "🍞"
    },

    // SIDES
    {
      name: "PERi-PERi Chips",
      price: "£4.40",
      description: "Crispy, golden and covered in PERi-PERi seasoning",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "peri_peri", "popular"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🍟"
    },
    {
      name: "Supergrain Salad",
      price: "£4.40",
      description: "Grains, seeds and a mix of beans with cos, cucumber, buttermilk dressing",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "healthy", "vegan"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🥗"
    },
    {
      name: "Spicy Rice",
      price: "£4.40",
      description: "Spiced basmati rice",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "spicy", "vegan"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🍚"
    },
    {
      name: "Coleslaw",
      price: "£4.40",
      description: "Creamy and refreshing Portuguese-style coleslaw",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "creamy"],
      dietary_options: ["vegetarian"],
      allergens: ["egg"],
      emoji: "🥗"
    },
    {
      name: "Macho Peas",
      price: "£4.40",
      description: "Mushy peas, blanched in pea mash, parsley, mint and chilli",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegan"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🫛"
    },
    {
      name: "Chargrilled Veg",
      price: "£2.95",
      description: "Chunky peppers, red onions and courgette, charred and brushed with PERi-PERi",
      category: "sides",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "vegan", "healthy"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🥬"
    },

    // SALADS
    {
      name: "Quinoa Salad",
      price: "£10.15",
      description: "Quinoa with mixed lettuce and avocado chunks, cucumber, mixed seeds, red onion and mixed leaves",
      category: "salads",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "healthy", "vegan"],
      dietary_options: ["vegan", "vegetarian"],
      allergens: [],
      emoji: "🥗"
    },
    {
      name: "Mediterranean Salad",
      price: "£8.95",
      description: "Mixed leaves with sweetcorn, cucumber, tomato, olives, feta cheese on a bed of mixed leaves",
      category: "salads",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "healthy", "mediterranean"],
      dietary_options: ["vegetarian"],
      allergens: ["milk"],
      emoji: "🥗"
    },
    {
      name: "Caesar Salad",
      price: "£9.75",
      description: "Cos lettuce sprinkled with shaved cheese, Caesar dressing and crunchy croutons",
      category: "salads",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "classic"],
      dietary_options: ["vegetarian"],
      allergens: ["milk", "gluten", "egg"],
      emoji: "🥗"
    },

    // SPECIAL GUESTS
    {
      name: "Fillet Steak Prego Roll",
      price: "£13.80",
      description: "Beef steak marinated in PERi-PERi and flame-grilled, served with wild garlic aioli mayonnaise in a Portuguese roll",
      category: "specials",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "steak", "premium"],
      dietary_options: [],
      allergens: ["gluten", "egg"],
      emoji: "🥩"
    },
    {
      name: "Fillet Steak & Chargrilled Veg",
      price: "£14.30",
      description: "Beef steak marinated in PERi-PERi and flame-grilled with juicy chargrilled veg and wild garlic aioli mayonnaise",
      category: "specials",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "steak", "premium"],
      dietary_options: [],
      allergens: ["egg"],
      emoji: "🥩"
    },

    // DESSERTS
    {
      name: "PERi-PERi Chocolate Brownie",
      price: "£2.45",
      description: "A chilli chocolate match made in brownie heaven!",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "chocolate", "spicy"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "egg", "milk"],
      emoji: "🍫"
    },
    {
      name: "Naughty Nata",
      price: "£1.95",
      description: "Tempting and traditional Portuguese custard tart, baked fresh each day",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "custard", "traditional"],
      dietary_options: ["vegetarian"],
      allergens: ["gluten", "egg", "milk"],
      emoji: "🥧"
    },
    {
      name: "Gelado",
      price: "£2.95",
      description: "Light, creamy and dangerously moreish. Coconut, Mango, Chocolate (Lactose free) or Vanilla",
      category: "desserts",
      meal_period: ["lunch", "dinner"],
      tags: ["portuguese", "ice_cream"],
      dietary_options: ["vegetarian"],
      allergens: ["milk"],
      emoji: "🍦"
    }
  ]
};

async function addNandos() {
  try {
    console.log('🔥 Adding Nando\'s to Firebase...\n');

    const restaurantId = 'nandos_soho';

    // Create restaurant document
    const restaurantDoc = {
      restaurant_id: restaurantId,
      basic_info: {
        name: nandosData.restaurant_name,
        cuisine_type: nandosData.metadata.cuisine_type.toLowerCase(),
        description: 'Flame-grilled PERi-PERi chicken marinated for 24 hours, inspired by South African Portuguese cuisine',
        website: 'https://www.nandos.co.uk',
        phone: nandosData.location.phone,
        email: nandosData.location.email
      },
      location: {
        city: nandosData.location.city,
        country_code: nandosData.location.country_code,
        address: nandosData.location.address,
        coordinates: new admin.firestore.GeoPoint(
          nandosData.location.coordinates.lat,
          nandosData.location.coordinates.lng
        ),
        neighborhood: 'Soho'
      },
      business_info: {
        opening_hours: {
          monday: { open: '11:30', close: '22:00', closed: false },
          tuesday: { open: '11:30', close: '22:00', closed: false },
          wednesday: { open: '11:30', close: '22:00', closed: false },
          thursday: { open: '11:30', close: '22:00', closed: false },
          friday: { open: '11:30', close: '22:30', closed: false },
          saturday: { open: '11:30', close: '22:30', closed: false },
          sunday: { open: '11:30', close: '21:00', closed: false }
        },
        delivery_platforms: {
          deliveroo_id: 'nandos-soho',
          ubereats_id: 'nandos-london'
        },
        price_range: '$$'
      },
      metadata: {
        goals: nandosData.metadata.goals,
        dietary_notes: nandosData.metadata.dietary_notes
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
    for (const item of nandosData.menu_items) {
      const mealPeriod = Array.isArray(item.meal_period) ? item.meal_period[0] : item.meal_period || 'all_day';

      const menuItemDoc = {
        menu_item_id: `${restaurantId}_${itemCount}_${Date.now()}`,
        restaurant_id: restaurantId,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'main',
          emoji: item.emoji || '🍗'
        },
        classification: {
          meal_period: mealPeriod,
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: item.dietary_options?.includes('vegetarian') || false,
            vegan: item.dietary_options?.includes('vegan') || false,
            gluten_free: !item.allergens?.includes('gluten'),
            dairy_free: !item.allergens?.includes('milk'),
            halal: true, // Nando's is halal certified
            kosher: false
          },
          spice_level: item.tags?.includes('spicy') ? 2 : 1,
          allergens: item.allergens || []
        },
        availability: {
          available: true,
          seasonal: false,
          daily_limit: null,
          availability_note: ''
        },
        marketing: {
          signature_dish: item.tags?.includes('signature') || false,
          chef_recommendation: false,
          popular: item.tags?.includes('popular') || false,
          new_item: false
        },
        hidden_gem_factors: {
          family_recipe: item.tags?.includes('traditional') || false,
          secret_recipe: item.tags?.includes('peri_peri') || false,
          limited_availability: false,
          traditional_method: item.tags?.includes('flame_grilled') || false,
          preparation_time: item.tags?.includes('flame_grilled') ? '24 hours marination' : null
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

    console.log('🎉 Nando\'s successfully added to Firebase!');
    console.log(`\nSummary:`);
    console.log(`  - Restaurant: ${nandosData.restaurant_name}`);
    console.log(`  - Location: ${nandosData.location.address}`);
    console.log(`  - Cuisine: ${nandosData.metadata.cuisine_type}`);
    console.log(`  - Menu Items: ${itemCount}`);
    console.log(`  - Specialty: Flame-grilled PERi-PERi chicken`);

  } catch (error) {
    console.error('❌ Error adding Nando\'s:', error);
  }
}

// Run the script
addNandos();
