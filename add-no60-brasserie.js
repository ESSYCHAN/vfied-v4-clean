// add-no60-brasserie.js
// Add No60 Brasserie to Firebase

import dotenv from 'dotenv';
dotenv.config();

import admin from 'firebase-admin';
import { adminDb } from './server/firebase-admin.js';

const no60Data = {
  "restaurant_name": "No60 Brasserie",
  "location": {
    "address": "60 Newington Green, Mildmay Ward, N16 9PX",
    "city": "London",
    "country_code": "GB",
    "coordinates": {
      "lat": 51.5462,
      "lng": -0.0885
    },
    "phone": "020 7288 1235",
    "email": "hello@no60brasserie.co.uk"
  },
  "metadata": {
    "goals": ["mediterranean_cuisine", "fresh_ingredients", "casual_dining"],
    "cuisine_type": "Mediterranean",
    "working_hours": {
      "monday": "8:00 AM - 10:00 PM",
      "tuesday": "8:00 AM - 10:00 PM",
      "wednesday": "8:00 AM - 10:00 PM",
      "thursday": "8:00 AM - 10:00 PM",
      "friday": "8:00 AM - 10:00 PM",
      "saturday": "8:00 AM - 10:00 PM",
      "sunday": "8:00 AM - 9:00 PM"
    },
    "allergen_info": "Please speak with your server as our foods may contain 14 allergens: gluten, crustaceans, egg, fish, soya beans, milk, peanuts, celery & celeriac, nuts, mustard, sesame, sulphur dioxide, molluscs & lupin.",
    "dietary_notes": "Most dishes can be prepared as VEGAN"
  },
  "menu_items": [
    {
      "name": "Soup Of the Day",
      "price": "£8.0",
      "description": "With bread & olives",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["comfort_food"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🍲"
    },
    {
      "name": "Hummus",
      "price": "£7.5",
      "description": "with bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "middle_eastern"],
      "dietary_options": ["vegetarian", "vegan_available"],
      "allergens": ["gluten"],
      "emoji": "🧄"
    },
    {
      "name": "Tzatziki",
      "price": "£7.5",
      "description": "with bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["greek", "yogurt"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🥒"
    },
    {
      "name": "Mixed Sicilian Olives",
      "price": "£7.5",
      "description": "Feta, artichoke, rustic tomatoes, pickled chillies, garlic and bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "sicilian"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🫒"
    },
    {
      "name": "Baba Ganoush",
      "price": "£7.5",
      "description": "with bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["middle_eastern", "aubergine"],
      "dietary_options": ["vegetarian", "vegan_available"],
      "allergens": ["gluten"],
      "emoji": "🍆"
    },
    {
      "name": "Quinoa Tabbouleh",
      "price": "£8.0",
      "description": "Fresh quinoa salad with herbs",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["healthy", "middle_eastern"],
      "dietary_options": ["vegetarian", "vegan_available", "gluten_free"],
      "allergens": [],
      "emoji": "🌿"
    },
    {
      "name": "Broad Beans with Olive Oil",
      "price": "£8.0",
      "description": "Boiled broad beans on yoghurt, parsley, spring onion, dill, garlic with olive oil",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["healthy", "beans"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🫘"
    },
    {
      "name": "Padron Peppers",
      "price": "£8.0",
      "description": "Toasted bread, balsamic vinegar & olive oil",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["spanish", "peppers"],
      "dietary_options": ["vegetarian", "vegan_available"],
      "allergens": ["gluten"],
      "emoji": "🌶️"
    },
    {
      "name": "Falafel",
      "price": "£8.0",
      "description": "With hummus, pesto, tahini sauce, flat lopez bread & salad",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["middle_eastern", "chickpeas"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "nuts"],
      "emoji": "🧆"
    },
    {
      "name": "Mucver",
      "price": "£8.5",
      "description": "Courgette fritters with feta, eggs, parmesan, spring onions, shallots, flour garlic & dill with knob of tzatziki, chilli jam",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["turkish", "fritters"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "egg", "milk"],
      "emoji": "🥒"
    },
    {
      "name": "Burrata & Tomatoes",
      "price": "£9.0",
      "description": "Extra virgin olive oil, basil aged balsamico IGP, Maldon sea salt",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "cheese", "tomatoes"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🍅"
    },
    {
      "name": "Bruschetta",
      "price": "£8.5",
      "description": "Tomatoes, olives, parsley & basil on garlic bread with shaved parmesan",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "bread"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🍞"
    },
    {
      "name": "Muska Boregi",
      "price": "£8.5",
      "description": "Filo parcels with spinach & creamy feta, sweet chilli sauce",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["turkish", "pastry"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🥟"
    },
    {
      "name": "King Prawns",
      "price": "£11.5",
      "description": "Sauteed in butter with peppers, shallots, mini tomatoes, chillies, garlic, spring, white wine, lemon juice, seasoning & parsley. With toasted bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["seafood", "signature"],
      "dietary_options": [],
      "allergens": ["gluten", "crustaceans", "milk"],
      "emoji": "🦐"
    },
    {
      "name": "Salt & Pepper Calamari",
      "price": "£10.5",
      "description": "Crispy salad, with homemade tartar sauce",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["seafood", "fried"],
      "dietary_options": [],
      "allergens": ["gluten", "molluscs", "egg"],
      "emoji": "🦑"
    },
    {
      "name": "Salmon Fish Cakes",
      "price": "£10.5",
      "description": "With salad & homemade tartar sauce",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["seafood", "fish_cakes"],
      "dietary_options": [],
      "allergens": ["gluten", "fish", "egg"],
      "emoji": "🐟"
    },
    {
      "name": "Chorizo with Wine",
      "price": "£9.0",
      "description": "Cooked with Pomodoro, tomato, pepper, and onion sauce. Served with bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["spanish", "meat", "sausage"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🌭"
    },
    {
      "name": "Lamb Koftas",
      "price": "£11.0",
      "description": "Homemade chilli sauce, tomato, red onion, parsley & sumac relish & bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "middle_eastern", "grilled"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🥩"
    },
    {
      "name": "Humus Kavurma",
      "price": "£11.0",
      "description": "Small cube lamb with pine nuts served on hummus with hot Turkish pide bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "turkish"],
      "dietary_options": [],
      "allergens": ["gluten", "nuts"],
      "emoji": "🥩"
    },
    {
      "name": "Roasted Figs, Goat Cheese and Walnuts",
      "price": "£9.5",
      "description": "With rosemary honey & balsamic reduction",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["seasonal", "cheese", "fruit"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk", "nuts"],
      "emoji": "🍯"
    },
    {
      "name": "Char-Grilled Halloumi",
      "price": "£9.0",
      "description": "Salad, cherry tomatoes, olives",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "cheese", "grilled"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🧀"
    },
    {
      "name": "Baked Normandy Camembert",
      "price": "£9.5",
      "description": "With rosemary springs, seasoning, Tiptree jam, crusty bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["french", "cheese", "baked"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🧀"
    },
    {
      "name": "Portobello Mushrooms & Stilton",
      "price": "£9.0",
      "description": "Baked with thyme and garlic with sourdough bread",
      "category": "starters",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mushrooms", "cheese"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🍄"
    },
    {
      "name": "No60 Mix Grill",
      "price": "£26.0",
      "description": "Lamb chops, lamb kofta, chicken fillet, lamb fillet, with chilli sauce, grilled capia peppers, rice and salad. For 1: £26 | For 2: £49",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["signature", "sharing", "mixed_grill"],
      "dietary_options": [],
      "allergens": [],
      "emoji": "🍖"
    },
    {
      "name": "Lamb Chops",
      "price": "£24.5",
      "description": "Cut from the best end, char-grilled with rice and salad or desired potato mash, extra fine French beans, red wine and thyme gravy",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "signature", "grilled"],
      "dietary_options": [],
      "allergens": [],
      "emoji": "🥩"
    },
    {
      "name": "Lamb Fillet & Vegetable Skewers",
      "price": "£21.5",
      "description": "Char-grilled lamb fillet and Mediterranean vegetables on skewers with rice, tzatziki, chilli sauce & salad",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "mediterranean", "grilled", "skewers"],
      "dietary_options": [],
      "allergens": ["milk"],
      "emoji": "🍢"
    },
    {
      "name": "Lamb Koftas Main",
      "price": "£18.0",
      "description": "Rice, house salad relish, homemade chilli sauce, tzatziki with rice",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "middle_eastern"],
      "dietary_options": [],
      "allergens": ["milk"],
      "emoji": "🥩"
    },
    {
      "name": "Slow Roasted Lamb Keshkek",
      "price": "£19.5",
      "description": "Slow cooked lamb, red onions with sumac, tomatoes parsley & pomegranate molasses salad, chilli sauce & bread",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "slow_cooked", "middle_eastern"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🍖"
    },
    {
      "name": "Chicken Casserole",
      "price": "£17.5",
      "description": "Turkish style chicken cooked in a stone bowl with melted cheese & rice",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "turkish", "comfort_food"],
      "dietary_options": [],
      "allergens": ["milk"],
      "emoji": "🐔"
    },
    {
      "name": "Chicken Skewers",
      "price": "£17.5",
      "description": "Grilled marinated cube cut style chicken breast with skewers, homemade chilli sauce tzatziki. Served with rice and salad",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "grilled", "skewers"],
      "dietary_options": [],
      "allergens": ["milk"],
      "emoji": "🍢"
    },
    {
      "name": "Pan-Fried Breast of Chicken",
      "price": "£18.5",
      "description": "Grilled chicken, mushrooms, shallots, tarragon white wine & cream sauce with truffle parmesan chips",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "premium", "truffle"],
      "dietary_options": [],
      "allergens": ["milk"],
      "emoji": "🐔"
    },
    {
      "name": "Iskender Kebab",
      "price": "£21.5",
      "description": "Grilled lamb skewers, pepper and tomato on turkish pide, with tomato sauce, yoghurt and drizzled butter",
      "category": "meat_poultry",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "turkish", "signature"],
      "dietary_options": [],
      "allergens": ["gluten", "milk"],
      "emoji": "🥩"
    },
    {
      "name": "Classic Cheese Burger",
      "price": "£14.5",
      "description": "British beef 8 Oz, pickled gherkin, glaze onions, mild mustard mayo & house relish salad",
      "category": "burgers",
      "meal_period": ["lunch", "dinner"],
      "tags": ["beef", "classic"],
      "dietary_options": [],
      "allergens": ["gluten", "milk", "egg"],
      "emoji": "🍔"
    },
    {
      "name": "Pulled Lamb Burger",
      "price": "£15.5",
      "description": "Slow-roasted lamb with gherkin, onion, tomato, BBQ and garlic sauce and lettuce served with handmade chips",
      "category": "burgers",
      "meal_period": ["lunch", "dinner"],
      "tags": ["lamb", "slow_cooked"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🍔"
    },
    {
      "name": "Grilled Chicken Burger",
      "price": "£14.5",
      "description": "Chicken breast, gem lettuce, red onions, tomato, harissa mayo & avocado smash",
      "category": "burgers",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "healthy"],
      "dietary_options": [],
      "allergens": ["gluten", "egg"],
      "emoji": "🍔"
    },
    {
      "name": "Halloumi Burger",
      "price": "£13.5",
      "description": "Char-grilled marinated Mediterranean vegetables with baba ganoush & basil pesto",
      "category": "burgers",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "grilled"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🍔"
    },
    {
      "name": "Falafel Burger",
      "price": "£13.5",
      "description": "Homemade falafel patty, gem lettuce, red onions, beetroot, chilli sauce, hummus and avocado",
      "category": "burgers",
      "meal_period": ["lunch", "dinner"],
      "tags": ["middle_eastern"],
      "dietary_options": ["vegetarian", "vegan_available"],
      "allergens": ["gluten"],
      "emoji": "🍔"
    },
    {
      "name": "Healthy Mezze Platter",
      "price": "£15.0",
      "description": "Hummus, Tzatziki, Shakshuka, Halloumi, Muska Borek, Broad Beans, Potato Salad, Falafel, Padron Peppers. For 1: £15 | For 2: £28",
      "category": "premium",
      "meal_period": ["lunch", "dinner"],
      "tags": ["sharing", "mediterranean", "healthy"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk", "egg"],
      "emoji": "🥗"
    },
    {
      "name": "Mediterranean Medley",
      "price": "£15.5",
      "description": "Char-grilled vegetables, rustic tomatoes with goat cheese, homemade pomodorina sauce and bread",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "grilled"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🍅"
    },
    {
      "name": "Mucver Main",
      "price": "£15.5",
      "description": "White courgette fritters with feta parmesan, eggs, shallots, spring onions, flour, garlic, dill with knob of tzatziki, sweet tomato & chilli chutney",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["turkish", "fritters"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "egg", "milk"],
      "emoji": "🥒"
    },
    {
      "name": "Falafel Main",
      "price": "£14.5",
      "description": "Hummus, pesto & tahini sauce, potato salad, broad beans, flatbread & salad",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["middle_eastern"],
      "dietary_options": ["vegetarian", "vegan_available"],
      "allergens": ["gluten"],
      "emoji": "🧆"
    },
    {
      "name": "Parmigiana di Melanzane",
      "price": "£15.5",
      "description": "Baked aubergines with fresh tomato & basil sauce, parmesan, mozzarella and bread crumbs with bread",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "aubergine"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk", "nuts"],
      "emoji": "🍆"
    },
    {
      "name": "Moussaka",
      "price": "£15.5",
      "description": "In tomato sauce served with rice & salad",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["greek"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🥘"
    },
    {
      "name": "Risotto",
      "price": "£15.5",
      "description": "Dry sherry shallots & thyme, rocket, asparagus, porcini mushroom, parmesan salad",
      "category": "vegetarian",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "rice", "mushroom"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🍚"
    },
    {
      "name": "Salmon Fish Cakes Main",
      "price": "£16.5",
      "description": "With vegetables & tartar sauce",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["salmon", "fish_cakes"],
      "dietary_options": [],
      "allergens": ["gluten", "fish", "egg"],
      "emoji": "🐟"
    },
    {
      "name": "King Prawns Main",
      "price": "£21.5",
      "description": "Sauteed in butter with peppers, shallots, mini tomatoes, chillies, garlic, spring, white wine, lemon juice, seasoning & parsley. With rice",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["signature"],
      "dietary_options": [],
      "allergens": ["crustaceans", "milk"],
      "emoji": "🦐"
    },
    {
      "name": "Sea Bass Fillet",
      "price": "£21.5",
      "description": "With portobello mushroom & asparagus risotto, baby gem arugula, piccolo cherry tomatoes & red onions",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["premium", "fish"],
      "dietary_options": [],
      "allergens": ["fish", "milk"],
      "emoji": "🐟"
    },
    {
      "name": "Salt & Pepper Calamari Main",
      "price": "£17.5",
      "description": "With crispy salad and homemade tartar sauce",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["fried"],
      "dietary_options": [],
      "allergens": ["gluten", "molluscs", "egg"],
      "emoji": "🦑"
    },
    {
      "name": "Salmon Fillet",
      "price": "£21.5",
      "description": "With fresh vegetables, baby desiree potatoes & lime-herb-butter",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["salmon", "healthy"],
      "dietary_options": [],
      "allergens": ["fish", "milk"],
      "emoji": "🐟"
    },
    {
      "name": "Fresh Tuna Steak",
      "price": "£21.5",
      "description": "With lemon pepper butter and seasoning, stem broccoli and baby desire potatoes",
      "category": "seafood",
      "meal_period": ["lunch", "dinner"],
      "tags": ["tuna", "premium"],
      "dietary_options": [],
      "allergens": ["fish", "milk"],
      "emoji": "🐟"
    },
    {
      "name": "Char-grilled Artichoke Salad",
      "price": "£15.5",
      "description": "Artichokes, char-grilled peppers & courgettes, rustic tomatoes, burrata, arugula, olives & pesto",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "large", "grilled"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk"],
      "emoji": "🥗"
    },
    {
      "name": "Roasted Beetroot & Butternut Squash Salad",
      "price": "£14.5",
      "description": "With goat cheese, walnuts, dukkah & French dressing",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["healthy", "roasted"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk", "nuts"],
      "emoji": "🥗"
    },
    {
      "name": "Warm Halloumi Salad",
      "price": "£15.0",
      "description": "With roasted root vegetables, crispy, roasted pine kernels, arugula & pomegranate molasses",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["mediterranean", "warm"],
      "dietary_options": ["vegetarian"],
      "allergens": ["milk", "nuts"],
      "emoji": "🥗"
    },
    {
      "name": "Avocado Quinoa Salad",
      "price": "£15.0",
      "description": "Tomato, parsley, red onion dill, green mint, quinoa, avocado. Served with pomegranate sauce and oil olive sumac",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["healthy", "superfood"],
      "dietary_options": ["vegetarian", "vegan", "gluten_free"],
      "allergens": [],
      "emoji": "🥗"
    },
    {
      "name": "Warm Chicken Salad",
      "price": "£16.0",
      "description": "Char-grilled chicken. Premium avocado, goats cheese, croutons, crispy bacon, with caesar dressing",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "bacon", "caesar"],
      "dietary_options": [],
      "allergens": ["gluten", "milk", "egg"],
      "emoji": "🥗"
    },
    {
      "name": "Tuna Steak Nicoise Salad",
      "price": "£20.5",
      "description": "Classic Nicoise salad with fresh tuna steak",
      "category": "salads",
      "meal_period": ["lunch", "dinner"],
      "tags": ["tuna", "french", "classic"],
      "dietary_options": [],
      "allergens": ["fish", "egg"],
      "emoji": "🥗"
    },
    {
      "name": "Spaghetti Bolognese",
      "price": "£15.5",
      "description": "Minced beef, onion, garlic, tomato paste and basil with tomato sauce",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "beef", "classic"],
      "dietary_options": [],
      "allergens": ["gluten"],
      "emoji": "🍝"
    },
    {
      "name": "Seafood Linguine",
      "price": "£17.5",
      "description": "Calamari, mussels, prawns, salmon, white clam with garlic, onion and tomato sauce",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["premium", "mixed_seafood"],
      "dietary_options": [],
      "allergens": ["gluten", "molluscs", "crustaceans", "fish"],
      "emoji": "🍝"
    },
    {
      "name": "Chicken Milanese",
      "price": "£17.5",
      "description": "Chicken schnitzel on buttered spaghetti with steam broccoli",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "chicken", "schnitzel"],
      "dietary_options": [],
      "allergens": ["gluten", "egg", "milk"],
      "emoji": "🍝"
    },
    {
      "name": "Porcini Chicken Penne",
      "price": "£16.0",
      "description": "Chicken breast with cream tomato and basil sauce",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["chicken", "mushroom", "creamy"],
      "dietary_options": [],
      "allergens": ["gluten", "milk"],
      "emoji": "🍝"
    },
    {
      "name": "Pesto Fettuccine",
      "price": "£15.5",
      "description": "Fresh pesto, fettuccine pasta, creamy sauce, served buffalo mozzarella cheese",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["pesto", "creamy"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "milk"],
      "emoji": "🍝"
    },
    {
      "name": "Spinach & Ricotta Ravioli",
      "price": "£14.5",
      "description": "In fresh tomato & cream sauce, parmesan shavings",
      "category": "pasta",
      "meal_period": ["lunch", "dinner"],
      "tags": ["italian", "stuffed_pasta"],
      "dietary_options": ["vegetarian"],
      "allergens": ["gluten", "egg", "milk"],
      "emoji": "🍝"
    }
  ]
};

async function addNo60Brasserie() {
  try {
    console.log('🚀 Adding No60 Brasserie to Firebase...\n');

    const restaurantId = 'no60_brasserie_newington_green';

    // Create restaurant document
    const restaurantDoc = {
      restaurant_id: restaurantId,
      basic_info: {
        name: no60Data.restaurant_name,
        cuisine_type: no60Data.metadata.cuisine_type.toLowerCase(),
        description: 'Mediterranean brasserie serving fresh, seasonal dishes',
        website: '',
        phone: no60Data.location.phone
      },
      location: {
        city: no60Data.location.city,
        country_code: no60Data.location.country_code,
        address: no60Data.location.address,
        coordinates: new admin.firestore.GeoPoint(
          no60Data.location.coordinates.lat,
          no60Data.location.coordinates.lng
        ),
        neighborhood: 'Newington Green'
      },
      business_info: {
        opening_hours: no60Data.metadata.working_hours,
        delivery_platforms: {},
        price_range: '££',
        seating_capacity: null,
        accepts_reservations: true
      },
      media: {
        hero_image: '',
        gallery: [],
        logo: '',
        banner: ''
      },
      metadata: {
        goals: no60Data.metadata.goals,
        menu_size: `${no60Data.menu_items.length} items`,
        pos_systems: [],
        target_audience: ['mediterranean_lovers', 'families', 'casual_diners'],
        signup_source: 'manual_import',
        hidden_gem_override: null,
        hidden_gem_tier: '',
        reviews: null,
        allergen_info: no60Data.metadata.allergen_info,
        dietary_notes: no60Data.metadata.dietary_notes
      },
      verification: {
        owner_verified: false,
        claimed_by: null,
        verification_date: null,
        admin_approved: true,
        data_source: 'manual_import'
      },
      statistics: {
        total_menu_items: no60Data.menu_items.length,
        view_count: 0,
        recommendation_count: 0,
        last_menu_update: admin.firestore.FieldValue.serverTimestamp(),
        hidden_gem_override: null,
        community_rating: null,
        review_count: 0
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    // Save restaurant
    await adminDb.collection('restaurants').doc(restaurantId).set(restaurantDoc);
    console.log(`✅ Restaurant created: ${no60Data.restaurant_name}`);

    // Add menu items
    let itemCount = 0;
    for (const item of no60Data.menu_items) {
      const mealPeriod = Array.isArray(item.meal_period) ? item.meal_period[0] : item.meal_period || 'all_day';

      const menuItemDoc = {
        menu_item_id: `${restaurantId}_${itemCount}_${Date.now()}`,
        restaurant_id: restaurantId,
        basic_info: {
          name: item.name,
          description: item.description || '',
          price: item.price || '',
          category: item.category || 'main',
          emoji: item.emoji || '🍽️'
        },
        classification: {
          meal_period: mealPeriod,
          cuisine_tags: item.tags || [],
          dietary: {
            vegetarian: item.dietary_options?.includes('vegetarian') || false,
            vegan: item.dietary_options?.includes('vegan') || false,
            gluten_free: item.dietary_options?.includes('gluten_free') || false,
            dairy_free: false,
            halal: false,
            kosher: false
          },
          spice_level: 0,
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
          chef_recommendation: false,
          popular: false,
          new_item: false
        },
        hidden_gem_factors: {
          family_recipe: false,
          secret_recipe: false,
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
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await adminDb.collection('menu_items').add(menuItemDoc);
      itemCount++;
    }

    console.log(`✅ ${itemCount} menu items added\n`);

    console.log('🎉 No60 Brasserie successfully added to Firebase!');
    console.log(`\nSummary:`);
    console.log(`  - Restaurant: ${no60Data.restaurant_name}`);
    console.log(`  - Location: ${no60Data.location.address}`);
    console.log(`  - Cuisine: ${no60Data.metadata.cuisine_type}`);
    console.log(`  - Menu Items: ${itemCount}`);

  } catch (error) {
    console.error('❌ Error adding No60 Brasserie:', error);
  }
}

// Run the script
addNo60Brasserie();
