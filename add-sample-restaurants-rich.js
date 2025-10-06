// add-sample-restaurants-rich.js
// Add sample restaurants with rich metadata for UI demonstration

import { menuManager } from './server/menu_manager.js';

const sampleRestaurantsWithPhotos = [
  {
    restaurant_id: 'dishoom_covent_garden',
    restaurant_name: 'Dishoom',
    location: {
      city: 'London',
      country_code: 'GB',
      address: '12 Upper St Martin\'s Lane, London WC2H 9FB',
      neighborhood: 'Covent Garden',
      coordinates: { lat: 51.5101, lng: -0.1280 }
    },
    opening_hours: {
      monday: { open: '08:00', close: '23:00' },
      tuesday: { open: '08:00', close: '23:00' },
      wednesday: { open: '08:00', close: '23:00' },
      thursday: { open: '08:00', close: '23:00' },
      friday: { open: '08:00', close: '00:00' },
      saturday: { open: '09:00', close: '00:00' },
      sunday: { open: '09:00', close: '23:00' }
    },
    delivery_platforms: {
      deliveroo_id: 'dishoom-covent-garden'
    },
    metadata: {
      goals: ['highlight_specialties', 'attract_dietary'],
      menu_size: '51-100 items',
      vibe_tags: ['Indian', 'Cocktails', 'Date Night', 'Cozy'],
      price_range: '££',
      reviews: {
        average_rating: 4.8,
        count: 3247
      }
    },
    media: {
      hero_image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
        'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800'
      ]
    },
    menu_items: [
      {
        name: 'Bacon Naan Roll',
        emoji: '🥓',
        price: '£7.50',
        description: 'Smoked bacon, cream cheese, chili jam',
        category: 'breakfast',
        tags: ['signature', 'breakfast', 'meat'],
        meal_period: 'breakfast',
        dietary: { vegetarian: false, vegan: false, gluten_free: false }
      },
      {
        name: 'House Black Daal',
        emoji: '🍛',
        price: '£8.90',
        description: '24-hour slow-cooked black lentils',
        category: 'main',
        tags: ['signature', 'comfort', 'vegetarian', 'family_recipe'],
        meal_period: 'all_day',
        dietary: { vegetarian: true, vegan: false, gluten_free: true }
      },
      {
        name: 'Kejriwal',
        emoji: '🥚',
        price: '£8.50',
        description: 'Fried eggs on chili cheese toast',
        category: 'breakfast',
        tags: ['breakfast', 'vegetarian'],
        meal_period: 'breakfast',
        dietary: { vegetarian: true, vegan: false, gluten_free: false }
      }
    ]
  },
  {
    restaurant_id: 'the_laughing_heart',
    restaurant_name: 'The Laughing Heart',
    location: {
      city: 'London',
      country_code: 'GB',
      address: '277 Hackney Road, London E2 8NA',
      neighborhood: 'Hackney',
      coordinates: { lat: 51.5310, lng: -0.0703 }
    },
    opening_hours: {
      monday: 'closed',
      tuesday: { open: '17:00', close: '23:00' },
      wednesday: { open: '17:00', close: '23:00' },
      thursday: { open: '17:00', close: '23:00' },
      friday: { open: '17:00', close: '00:00' },
      saturday: { open: '12:00', close: '00:00' },
      sunday: { open: '12:00', close: '22:00' }
    },
    delivery_platforms: {},
    metadata: {
      goals: ['highlight_specialties'],
      menu_size: '26-50 items',
      vibe_tags: ['Wine Bar', 'Small Plates', 'European', 'Natural Wine', 'Romantic'],
      price_range: '£££',
      reviews: {
        average_rating: 4.9,
        count: 856
      },
      hidden_gem_override: 20
    },
    media: {
      hero_image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',
        'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800'
      ]
    },
    menu_items: [
      {
        name: 'Sourdough Toast',
        emoji: '🍞',
        price: '£6.00',
        description: 'With cultured butter',
        category: 'appetizer',
        tags: ['vegetarian', 'sharing'],
        meal_period: 'all_day',
        dietary: { vegetarian: true, vegan: false, gluten_free: false }
      },
      {
        name: 'Eggs Benedict',
        emoji: '🥚',
        price: '£12.00',
        description: 'Poached eggs, hollandaise',
        category: 'brunch',
        tags: ['brunch', 'weekend'],
        meal_period: 'breakfast',
        dietary: { vegetarian: true, vegan: false, gluten_free: false }
      },
      {
        name: 'Burrata',
        emoji: '🧀',
        price: '£14.00',
        description: 'Heirloom tomatoes, basil',
        category: 'appetizer',
        tags: ['vegetarian', 'signature', 'seasonal'],
        meal_period: 'all_day',
        dietary: { vegetarian: true, vegan: false, gluten_free: true }
      }
    ]
  },
  {
    restaurant_id: 'bright_hackney',
    restaurant_name: 'Bright',
    location: {
      city: 'London',
      country_code: 'GB',
      address: '1 Westgate St, London E8 3RL',
      neighborhood: 'Hackney',
      coordinates: { lat: 51.5429, lng: -0.0564 }
    },
    opening_hours: {
      monday: 'closed',
      tuesday: { open: '18:00', close: '23:00' },
      wednesday: { open: '18:00', close: '23:00' },
      thursday: { open: '18:00', close: '23:00' },
      friday: { open: '18:00', close: '23:30' },
      saturday: { open: '10:00', close: '23:30' },
      sunday: { open: '10:00', close: '22:00' }
    },
    delivery_platforms: {},
    metadata: {
      goals: [],
      menu_size: '26-50 items',
      vibe_tags: ['British', 'Seasonal', 'Hidden Gem', 'Small Plates'],
      price_range: '£££',
      reviews: {
        average_rating: 4.7,
        count: 412
      },
      hidden_gem_override: 35
    },
    media: {
      hero_image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'
      ]
    },
    menu_items: [
      {
        name: 'Full English',
        emoji: '🍳',
        price: '£14.50',
        description: 'Sausage, bacon, eggs, beans, toast',
        category: 'breakfast',
        tags: ['breakfast', 'british', 'traditional'],
        meal_period: 'breakfast',
        dietary: { vegetarian: false, vegan: false, gluten_free: false }
      },
      {
        name: 'Porridge',
        emoji: '🥣',
        price: '£7.00',
        description: 'With seasonal fruit',
        category: 'breakfast',
        tags: ['breakfast', 'healthy', 'vegetarian'],
        meal_period: 'breakfast',
        dietary: { vegetarian: true, vegan: true, gluten_free: true }
      },
      {
        name: 'Scotch Egg',
        emoji: '🥚',
        price: '£8.50',
        description: 'Free-range pork',
        category: 'appetizer',
        tags: ['signature', 'british', 'meat'],
        meal_period: 'all_day',
        dietary: { vegetarian: false, vegan: false, gluten_free: false }
      }
    ]
  },
  {
    restaurant_id: 'padella_borough',
    restaurant_name: 'Padella',
    location: {
      city: 'London',
      country_code: 'GB',
      address: '6 Southwark St, London SE1 1TQ',
      neighborhood: 'Borough Market',
      coordinates: { lat: 51.5054, lng: -0.0912 }
    },
    opening_hours: {
      monday: { open: '12:00', close: '22:00' },
      tuesday: { open: '12:00', close: '22:00' },
      wednesday: { open: '12:00', close: '22:00' },
      thursday: { open: '12:00', close: '22:00' },
      friday: { open: '12:00', close: '22:00' },
      saturday: { open: '12:00', close: '22:00' },
      sunday: { open: '12:00', close: '21:00' }
    },
    delivery_platforms: {},
    metadata: {
      goals: ['increase_visibility'],
      menu_size: '11-25 items',
      vibe_tags: ['Italian', 'Pasta', 'Casual', 'No Reservations'],
      price_range: '££',
      reviews: {
        average_rating: 4.6,
        count: 2891
      }
    },
    media: {
      hero_image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
        'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800'
      ]
    },
    menu_items: [
      {
        name: 'Pici Cacio e Pepe',
        emoji: '🍝',
        price: '£9.00',
        description: 'Hand-rolled pasta, pecorino, black pepper',
        category: 'main',
        tags: ['signature', 'vegetarian', 'pasta'],
        meal_period: 'lunch',
        dietary: { vegetarian: true, vegan: false, gluten_free: false }
      },
      {
        name: 'Pappardelle Beef Shin Ragu',
        emoji: '🍝',
        price: '£11.50',
        description: '8-hour slow-cooked beef',
        category: 'main',
        tags: ['signature', 'comfort', 'pasta'],
        meal_period: 'lunch',
        dietary: { vegetarian: false, vegan: false, gluten_free: false }
      },
      {
        name: 'Tiramisu',
        emoji: '🍰',
        price: '£6.00',
        description: 'Classic Italian dessert',
        category: 'dessert',
        tags: ['dessert', 'italian'],
        meal_period: 'all_day',
        dietary: { vegetarian: true, vegan: false, gluten_free: false }
      }
    ]
  }
];

async function addSampleRestaurants() {
  console.log('🚀 Adding sample restaurants with rich metadata...\n');

  for (const restaurant of sampleRestaurantsWithPhotos) {
    try {
      await menuManager.addRestaurantMenu(restaurant);
      console.log(`✅ Added ${restaurant.restaurant_name}`);
    } catch (error) {
      console.error(`❌ Failed to add ${restaurant.restaurant_name}:`, error.message);
    }
  }

  console.log('\n✨ Sample restaurants added successfully!');
  console.log('\n📊 Summary:');
  const stats = await menuManager.getStats();
  console.log(JSON.stringify(stats, null, 2));
}

addSampleRestaurants().catch(console.error);
