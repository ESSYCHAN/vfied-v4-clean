// add-no60-breakfast-menu.js
// Add breakfast/brunch menu items to existing No60 Brasserie

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const breakfastMenu = [
  {
    "name": "Full English",
    "price": "£13.9",
    "description": "Smoked bacon, cumberland sausage, sautéed mushrooms poached eggs, hash brown, confit tomato, house beans, and artisan bread. ADD HOME STYLE CHIPS FOR £3.5",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["classic", "hearty"],
    "dietary_options": [],
    "allergens": ["gluten", "egg"],
    "emoji": "🍳"
  },
  {
    "name": "Vegetarian Breakfast",
    "price": "£13.9",
    "description": "Halloumi, poached eggs, vegetarian sausage, spinach tarator, mushrooms, tomato confit, house beans & home style chips & bread. ADD HASH BROWNS FOR £2",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["hearty"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Healthy Breakfast",
    "price": "£14.9",
    "description": "Stack of portobello mushroom, grilled Mediterranean vegetables, with sunblush tomatoes & goat cheese, scrambled eggs & avocado, tomatoes, artichokes, feta, olives & herbs salad, walnuts and artisan bread",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["healthy", "mediterranean"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk", "nuts"],
    "emoji": "🥗"
  },
  {
    "name": "No 60 Classic",
    "price": "£13.9",
    "description": "Premium avocado, flavoursome tomatoes with Maldon sea salt, ext. virgin olive oil, aged balsamic, portobello mushrooms with thyme & garlic, poached eggs, french toast with artisan bread. ADD TWO RUSHES OF SMOKED BACON FOR £3. ADD BURRATA £4",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["signature", "premium"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🥑"
  },
  {
    "name": "Mediterranean Breakfast",
    "price": "£14.5",
    "description": "Char-grilled halloumi, scrambled eggs, merguez lamb sausage, avocado with flavoursome tomatoes, artichokes, basil, feta, olives, shaksuka sauce, artisan bread",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["mediterranean", "lamb"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🧀"
  },
  {
    "name": "Classic Turkish Breakfast",
    "price": "£14.5",
    "description": "Full fat feta, halloumi, free range eggs, olives, flavoursome tomatoes, cucumbers, sucuk, jam, honey, butter, borek, wood fired Turkish bread",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["turkish", "traditional"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🇹🇷"
  },
  {
    "name": "Breakfast Bun",
    "price": "£12.5",
    "description": "Smoked bacon, cumberland sausage, hash brown, fried eggs, american cheese & harissa ketchup, salad & chips",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["casual", "handheld"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🥪"
  },
  {
    "name": "Breakfast Burrito",
    "price": "£12.9",
    "description": "In 12' tortilla with scrambled eggs, chives, chorizo, roasted peppers, crushed avocado, with spring onions, chillies, parsley, harissa mayo, potato, cheddar cheese & spicy chips",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["mexican", "spicy"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🌯"
  },
  {
    "name": "Salmon Breakfast",
    "price": "£14.5",
    "description": "Smoked salmon, scrambled eggs, dill, grilled halloumi, avocado, fresh tomato, portobello mushroom with toasted artisan bread",
    "category": "big_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["salmon", "premium"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "fish", "milk"],
    "emoji": "🐟"
  },
  {
    "name": "Vegan Feast",
    "price": "£13.5",
    "description": "Roasted root vegetables in a savoury fashion, with dried plums & figs, Portobello mushroom, rustic tomatoes, avocado, seeds, house beans and artisan bread",
    "category": "vegan_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["vegan", "healthy"],
    "dietary_options": ["vegan"],
    "allergens": ["gluten"],
    "emoji": "🌱"
  },
  {
    "name": "Vegan Bruschetta",
    "price": "£14.5",
    "description": "Artisan bread with crushed avocado, served with grilled aubergine, courgette, portobello mushroom, confit tomato, beans & hash brown",
    "category": "vegan_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["vegan", "grilled"],
    "dietary_options": ["vegan"],
    "allergens": ["gluten"],
    "emoji": "🍞"
  },
  {
    "name": "Vegan Mediterranean",
    "price": "£13.5",
    "description": "Artichoke sun blushed tomato, olives, avocado, fresh tomato, Portobello mushroom, vegan sausage, pomodorina tomato, sauce, hummus, falafel, potato salad with artisan bread",
    "category": "vegan_breakfast",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["vegan", "mediterranean"],
    "dietary_options": ["vegan"],
    "allergens": ["gluten"],
    "emoji": "🥗"
  },
  {
    "name": "Crushed Avocado",
    "price": "£12.0",
    "description": "With spring onions, chillies, extra virgin olive oil & lemon juice & poached eggs. ADD TWO RUSHES OF SMOKED BACON FOR £3",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["avocado", "healthy"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg"],
    "emoji": "🥑"
  },
  {
    "name": "NO 60 Special",
    "price": "£13.9",
    "description": "Crushed avocado with spring onions, lemon, parsley, chillies, chargrilled marinated Mediterranean vegetables, portobello mushrooms, rustic tomatoes & poached eggs on wholemeal sourdough with feta and pesto. ADD SWEET POTATO FRIES FOR £3",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["signature", "mediterranean"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk", "nuts"],
    "emoji": "🍞"
  },
  {
    "name": "Eggs on Fire",
    "price": "£12.5",
    "description": "Poached eggs & avocado on sautéed julian cut potatoes, courgettes, mix peppers, chillies, carrots, onions and spices. ADD GOAT CHEESE FOR £3 ADD BAKED BEANS FOR £2",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["spicy", "vegetables"],
    "dietary_options": ["vegetarian"],
    "allergens": ["egg", "nuts"],
    "emoji": "🌶️"
  },
  {
    "name": "Scottish Smoked Salmon Benny",
    "price": "£13.9",
    "description": "Smoked salmon, asparagus, poached eggs, Hollandaise sauce homemade beetroot relish on wholemeal sourdough with crème cheese, avocado, red onion, cherry tomatoes, chillies & parsley",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["salmon", "premium"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "fish", "milk"],
    "emoji": "🐟"
  },
  {
    "name": "Menemen / Shakshuka",
    "price": "£13.5",
    "description": "Traditional sautéed middle eastern brunch in a skillet, special pomodorina sauce with peppers & eggs, feta, za'atar served with stonebaked Turkish toasted bread. ADD 'SUCUK' SPICY GARLIC. SAUSAGES FOR £3. ADD HALLOUMI £3",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["middle_eastern", "traditional"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Healthy Salad",
    "price": "£14.0",
    "description": "Boiled egg, olive, avocado, feta cheese, grilled chicken, baby mix leaves salad, olive oil, pomegranate dressing",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["healthy", "salad"],
    "dietary_options": [],
    "allergens": ["egg", "milk"],
    "emoji": "🥗"
  },
  {
    "name": "Chicken Wrap",
    "price": "£14.5",
    "description": "Pan cooked chicken, red onions, peppers, tomato, crushed avocado, garlic mayo with spicy potato chips",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["chicken", "wrap"],
    "dietary_options": [],
    "allergens": ["gluten", "egg"],
    "emoji": "🌯"
  },
  {
    "name": "Kofte Wrap",
    "price": "£14.5",
    "description": "Grilled kofte, tomato, onions, parsley, tzatziki sauce with spicy potato chips",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["lamb", "turkish"],
    "dietary_options": [],
    "allergens": ["gluten", "milk"],
    "emoji": "🌯"
  },
  {
    "name": "Falafel Wrap",
    "price": "£12.5",
    "description": "Hummus, tahini sauce, gem lettuce, cucumber, turnips, red onions, home-made chilli sauce with spicy potato chips",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["middle_eastern"],
    "dietary_options": ["vegetarian", "vegan_available"],
    "allergens": ["gluten"],
    "emoji": "🌯"
  },
  {
    "name": "Halloumi Wrap",
    "price": "£12.5",
    "description": "Grilled halloumi, grilled aubergine, sun dried tomato, crushed avocado, rocket with spicy potato chips",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["mediterranean"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "milk"],
    "emoji": "🌯"
  },
  {
    "name": "Hangover Cure Burger",
    "price": "£16.5",
    "description": "Our Scottish steak burger, smoked bacon, hash brown, jalapeños, gherkins, fried egg, American cheese, harissa mayo & ketchup served with hand-cut spicy chips",
    "category": "brunch_sourdough",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["indulgent", "spicy"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍔"
  },
  {
    "name": "Benedict",
    "price": "£11.5",
    "description": "with honey roast ham. Served on toasted savoury English muffin with poached eggs & Hollandaise sauce",
    "category": "bennies",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["classic", "ham"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Florentine",
    "price": "£11.5",
    "description": "with buttered spinach & garlic. Served on toasted savoury English muffin with poached eggs & Hollandaise sauce",
    "category": "bennies",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["spinach"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Royal",
    "price": "£12.5",
    "description": "with smoked salmon. Served on toasted savoury English muffin with poached eggs & Hollandaise sauce",
    "category": "bennies",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["salmon", "premium"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "fish", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Popeyes Royal Treat",
    "price": "£12.9",
    "description": "with smoked salmon & spinach. Served on toasted savoury English muffin with poached eggs & Hollandaise sauce",
    "category": "bennies",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["salmon", "spinach"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "fish", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "English Sandwich",
    "price": "£12.0",
    "description": "Fried eggs, bacon, cheddar, cheese, crushed avocado, fresh tomato & lettuce. Served with hand-cut chips",
    "category": "club_sandwiches",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["classic", "bacon"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🥪"
  },
  {
    "name": "Vegetables Sandwich",
    "price": "£12.0",
    "description": "Grilled aubergine, courgette, red peppers, sun blushed tomato & goat cheese. Served with hand-cut chips",
    "category": "club_sandwiches",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["grilled", "vegetables"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "milk"],
    "emoji": "🥪"
  },
  {
    "name": "Chicken Club Sandwich",
    "price": "£12.5",
    "description": "Grilled chicken, tomato, lettuce, pesto sauce, garlic mayo made with brown bloomer bread. Served with hand-cut chips",
    "category": "club_sandwiches",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["chicken", "pesto"],
    "dietary_options": [],
    "allergens": ["gluten", "egg"],
    "emoji": "🥪"
  },
  {
    "name": "Ciabatta Deluxe",
    "price": "£12.5",
    "description": "Smoked Scottish salmon, cream cheese, beetroot relish, rocket & sun blushed tomato. Served with hand-cut chips",
    "category": "club_sandwiches",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["salmon", "premium"],
    "dietary_options": [],
    "allergens": ["gluten", "fish", "milk"],
    "emoji": "🥪"
  },
  {
    "name": "Eggs On Sourdough Toast",
    "price": "£8.5",
    "description": "Scrambled or poached eggs, butter & strawberry jam. Served with crispy salad and bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["simple", "classic"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍞"
  },
  {
    "name": "Chorizo Omelette",
    "price": "£13.0",
    "description": "Peppers, onions, tomatoes, potatoes, bread & salad. Served with crispy salad and bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["spanish", "spicy"],
    "dietary_options": [],
    "allergens": ["gluten", "egg"],
    "emoji": "🍳"
  },
  {
    "name": "Honey Roast Ham Omelette",
    "price": "£12.5",
    "description": "Served with cheese, salad and sourdough bread. Served with crispy salad and bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["ham", "cheese"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Vegetable Omelette",
    "price": "£12.5",
    "description": "Served with courgette, potato, onion, aubergine, mushroom, salad with sourdough bread. Served with crispy salad and bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["vegetables"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg"],
    "emoji": "🍳"
  },
  {
    "name": "Spinach Cheese Omelette",
    "price": "£12.5",
    "description": "Spinach, cheese with free-range eggs, salad & sourdough bread. Served with crispy salad and bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["spinach", "cheese"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Turkish Eggs",
    "price": "£10.9",
    "description": "Poached eggs on spinach tarator, with house dukkah, herbs, tahini sauce and wood fired flat bread. ADD SUCUK FOR £3.00. ADD HALLOUMI FOR £3.00",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["turkish", "traditional"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍳"
  },
  {
    "name": "Sucuklu Yumurta",
    "price": "£11.5",
    "description": "Fried Turkish sucuk on bulls eye egg with toasted Turkish bread",
    "category": "free_range_eggs",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["turkish", "traditional"],
    "dietary_options": [],
    "allergens": ["gluten", "egg"],
    "emoji": "🍳"
  },
  {
    "name": "Banana Pancakes",
    "price": "£13.5",
    "description": "Caramelised bananas, Nutella, walnuts, creme fraiche & pure Canadian maple syrup. Homemade buttermilk pancakes",
    "category": "pancakes",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["sweet", "indulgent"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk", "nuts"],
    "emoji": "🥞"
  },
  {
    "name": "Berry Classic Pancakes",
    "price": "£13.5",
    "description": "Fresh berries, creme fraiche & Canadian maple syrup. Homemade buttermilk pancakes",
    "category": "pancakes",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["sweet", "berries"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🥞"
  },
  {
    "name": "The Ultimate American Pancakes",
    "price": "£14.5",
    "description": "Smoked crispy bacon, Cumberland sausage, scrambled eggs, fresh berries, crème fraiche & maple syrup. Homemade buttermilk pancakes",
    "category": "pancakes",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["hearty", "american"],
    "dietary_options": [],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🥞"
  },
  {
    "name": "French Toast",
    "price": "£13.5",
    "description": "Brioche bread, creme fraiche served with mixed berry and maple syrup",
    "category": "pancakes",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["sweet", "brioche"],
    "dietary_options": ["vegetarian"],
    "allergens": ["gluten", "egg", "milk"],
    "emoji": "🍞"
  },
  {
    "name": "Granola",
    "price": "£8.5",
    "description": "Natural yoghurt, fresh berries, apricot, figs served with honey",
    "category": "grains_fruits",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["healthy", "yogurt"],
    "dietary_options": ["vegetarian"],
    "allergens": ["milk", "nuts"],
    "emoji": "🥣"
  },
  {
    "name": "Porridge",
    "price": "£8.5",
    "description": "Soya milk, banana, fresh berries served with honey",
    "category": "grains_fruits",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["healthy", "oats"],
    "dietary_options": ["vegetarian", "vegan_available"],
    "allergens": ["soya"],
    "emoji": "🥣"
  },
  {
    "name": "Sourdough Bread",
    "price": "£3.5",
    "description": "Artisan sourdough bread",
    "category": "grains_fruits",
    "meal_period": ["breakfast", "brunch"],
    "tags": ["simple", "bread"],
    "dietary_options": ["vegetarian", "vegan"],
    "allergens": ["gluten"],
    "emoji": "🍞"
  }
];

async function addBreakfastMenu() {
  try {
    console.log('🚀 Adding breakfast/brunch menu to No60 Brasserie...\n');

    const restaurantId = 'no60_brasserie_newington_green';

    // Update restaurant metadata
    await adminDb.collection('restaurants').doc(restaurantId).update({
      'metadata.cuisine_type': 'mediterranean & international breakfast',
      'metadata.dietary_notes': 'Most dishes can be prepared as VEGAN. Gluten free bread available for extra £1.5',
      'metadata.goals': admin.firestore.FieldValue.arrayUnion('breakfast_brunch', 'all_day_dining'),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Updated restaurant metadata');

    // Add breakfast menu items
    let itemCount = 0;
    for (const item of breakfastMenu) {
      const mealPeriod = Array.isArray(item.meal_period) ? item.meal_period[0] : item.meal_period || 'breakfast';

      const menuItemDoc = {
        menu_item_id: `${restaurantId}_breakfast_${itemCount}_${Date.now()}`,
        restaurant_id: restaurantId,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'breakfast',
          emoji: item.emoji || '🍽️'
        },
        classification: {
          meal_period: mealPeriod,
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: item.dietary_options?.includes('vegetarian') || false,
            vegan: item.dietary_options?.includes('vegan') || item.dietary_options?.includes('vegan_available') || false,
            gluten_free: item.dietary_options?.includes('gluten_free') || false,
            dairy_free: false,
            halal: false,
            kosher: false
          },
          spice_level: item.tags?.includes('spicy') ? 2 : 0,
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
          chef_recommendation: item.tags?.includes('premium') || false,
          popular: item.tags?.includes('classic') || item.tags?.includes('hearty') || false,
          new_item: false
        },
        hidden_gem_factors: {
          family_recipe: item.tags?.includes('traditional') || false,
          secret_recipe: false,
          limited_availability: false,
          traditional_method: item.tags?.includes('traditional') || false,
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

      if (itemCount % 10 === 0) {
        console.log(`  Added ${itemCount}/${breakfastMenu.length} items...`);
      }
    }

    // Update restaurant total menu items count
    const currentMenuItemsSnapshot = await adminDb.collection('menu_items')
      .where('restaurant_id', '==', restaurantId)
      .get();

    await adminDb.collection('restaurants').doc(restaurantId).update({
      'statistics.total_menu_items': currentMenuItemsSnapshot.size,
      'statistics.last_menu_update': admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`\n🎉 Successfully added ${itemCount} breakfast/brunch items!`);
    console.log(`\nNo60 Brasserie now has:`);
    console.log(`  - Total Menu Items: ${currentMenuItemsSnapshot.size}`);
    console.log(`  - Breakfast/Brunch Items: ${itemCount}`);
    console.log(`  - Mediterranean Dinner Items: ${currentMenuItemsSnapshot.size - itemCount}`);

  } catch (error) {
    console.error('❌ Error adding breakfast menu:', error);
  }
}

// Run the script
addBreakfastMenu();
