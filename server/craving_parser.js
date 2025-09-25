// server/craving_parser.js
// Enhanced mood/craving parser with celebrations, fun moods, and complex emotional states

export const CRAVING_MAPPINGS = {
    // ============ CELEBRATIONS & WINS ============
    'birthday|bday': {
      suggests: ['cake', 'special dinner', 'favorite food', 'champagne', 'treat yourself meal'],
      attributes: ['celebratory', 'indulgent', 'special', 'festive'],
      vibe: 'celebration',
      response: "It's your special day! Time for your favorites"
    },
    
    'promotion|promoted|raise': {
      suggests: ['steak dinner', 'champagne', 'fancy restaurant', 'sushi', 'fine dining'],
      attributes: ['upscale', 'celebratory', 'premium', 'rewarding'],
      vibe: 'achievement',
      response: 'You earned this! Time for something special'
    },
    
    'small win|little victory|tiny achievement': {
      suggests: ['favorite snack', 'nice coffee', 'pastry', 'bubble tea', 'ice cream'],
      attributes: ['treat', 'reward', 'sweet', 'comforting'],
      vibe: 'mini-celebration',
      response: 'Every win counts! Treat yourself'
    },
    
    'friday|friyay|weekend vibes': {
      suggests: ['pizza', 'beer and wings', 'takeout', 'burger', 'cocktails'],
      attributes: ['relaxed', 'indulgent', 'social', 'unwinding'],
      vibe: 'weekend-mode',
      response: 'Weekend mode activated!'
    },
    
    'payday|got paid|money day': {
      suggests: ['restaurant meal', 'delivery feast', 'steakhouse', 'sushi', 'that expensive place'],
      attributes: ['splurge', 'treating yourself', 'no budget limits'],
      vibe: 'splurge-day',
      response: 'Payday feast time!'
    },
    
    // ============ FUN & PLAYFUL MOODS ============
    'chaos mode|feral|unhinged': {
      suggests: ['gas station sushi', 'weird food combo', 'midnight snacks', '3am kebab', 'questionable choices'],
      attributes: ['chaotic', 'random', 'no-rules', 'wild'],
      vibe: 'chaos',
      response: 'Embrace the chaos! No food rules today'
    },
    
    'main character|hot girl|hot boy|that girl': {
      suggests: ['aesthetic brunch', 'matcha latte', 'acai bowl', 'fancy salad', 'photogenic food'],
      attributes: ['instagram-worthy', 'aesthetic', 'trendy', 'healthy-ish'],
      vibe: 'main-character',
      response: 'Main character energy deserves main character food'
    },
    
    'goblin mode|gremlin|raccoon energy': {
      suggests: ['cheese straight from fridge', 'cereal at midnight', 'leftover pizza', 'instant noodles', 'snacks for dinner'],
      attributes: ['no-effort', 'comfort', 'guilty-pleasure', 'cozy-chaos'],
      vibe: 'goblin',
      response: 'Goblin mode: activated. Judgment-free zone'
    },
    
    'living large|bougie|fancy': {
      suggests: ['oysters', 'truffle anything', 'wagyu', 'champagne', 'caviar', 'fine dining'],
      attributes: ['luxury', 'expensive', 'fancy', 'sophisticated'],
      vibe: 'luxury',
      response: 'Living your best bougie life!'
    },
    
    'nostalgia|childhood|throwback': {
      suggests: ['mac and cheese', 'chicken nuggets', 'pb&j', 'cereal', 'childhood favorite'],
      attributes: ['nostalgic', 'comforting', 'simple', 'familiar'],
      vibe: 'nostalgic',
      response: 'Time machine to simpler days via food'
    },
    
    // ============ EMOTIONAL STATES ============
    'heartbreak|breakup|dumped|single again': {
      suggests: ['ice cream', 'chocolate', 'wine', 'comfort food', 'pizza', 'cookie dough'],
      attributes: ['comforting', 'indulgent', 'soothing', 'treat'],
      vibe: 'heartbreak',
      response: 'Food hug incoming. You deserve comfort'
    },
    
    'anxious|nervous|worried|stressed': {
      suggests: ['herbal tea', 'soup', 'comfort carbs', 'chocolate', 'warm foods'],
      attributes: ['calming', 'soothing', 'warm', 'comforting'],
      vibe: 'anxious',
      response: 'Something soothing to calm those nerves'
    },
    
    'angry|pissed|furious|rage': {
      suggests: ['crunchy foods', 'spicy food', 'chips', 'nuts', 'carrots', 'something to bite'],
      attributes: ['crunchy', 'spicy', 'intense', 'satisfying'],
      vibe: 'angry',
      response: 'Crunch away that anger!'
    },
    
    'sad|down|blue|depressed': {
      suggests: ['soup', 'mac and cheese', 'grilled cheese', 'hot chocolate', 'comfort classics'],
      attributes: ['comforting', 'warm', 'familiar', 'soothing'],
      vibe: 'sad',
      response: 'Comfort food prescription ready'
    },
    
    'lonely|alone|solo|by myself': {
      suggests: ['takeout feast', 'comfort meal', 'favorite restaurant', 'treat yourself dinner'],
      attributes: ['indulgent', 'special', 'comforting', 'satisfying'],
      vibe: 'solo-dining',
      response: 'Solo dining is self-care'
    },
    
    // ============ PHYSICAL STATES ============
    'hangover|hungover|rough morning|too much last night': {
      suggests: ['greasy breakfast', 'burger', 'fries', 'ramen', 'pho', 'full english', 'gatorade'],
      attributes: ['greasy', 'salty', 'hydrating', 'carby'],
      vibe: 'hangover',
      response: 'Hangover rescue mission initiated'
    },
    
    'pms|period|cramps|time of month': {
      suggests: ['chocolate', 'ice cream', 'salty snacks', 'comfort carbs', 'warm foods', 'iron-rich foods'],
      attributes: ['comforting', 'indulgent', 'warm', 'satisfying'],
      vibe: 'pms',
      response: 'Your body knows what it needs'
    },
    
    'sick|cold|flu|unwell|under weather': {
      suggests: ['chicken soup', 'pho', 'tea', 'toast', 'ginger tea', 'porridge'],
      attributes: ['healing', 'warm', 'liquid', 'gentle', 'soothing'],
      vibe: 'sick',
      response: 'Get well soon foods coming up'
    },
    
    'workout|gym|exercise|post-workout': {
      suggests: ['protein shake', 'grilled chicken', 'poke bowl', 'eggs', 'quinoa bowl', 'protein-rich'],
      attributes: ['protein', 'healthy', 'recovery', 'nutritious'],
      vibe: 'post-workout',
      response: 'Refuel those muscles!'
    },
    
    'tired|exhausted|sleepy|no energy': {
      suggests: ['coffee', 'energy foods', 'quick carbs', 'comfort food', 'easy meals'],
      attributes: ['energizing', 'easy', 'comforting', 'quick'],
      vibe: 'tired',
      response: 'Low energy = easy comfort food'
    },
    
    // ============ SOCIAL SITUATIONS ============
    'date night|romantic|anniversary': {
      suggests: ['italian', 'sushi', 'tapas', 'wine bar', 'fancy dinner', 'sharing plates'],
      attributes: ['romantic', 'shareable', 'intimate', 'special'],
      vibe: 'date',
      response: 'Romance on the menu tonight'
    },
    
    'girls night|squad|besties': {
      suggests: ['tapas', 'cocktails', 'bottomless brunch', 'sharing platters', 'wine and cheese'],
      attributes: ['social', 'shareable', 'fun', 'indulgent'],
      vibe: 'social',
      response: 'Squad feast mode!'
    },
    
    'family dinner|parents visiting': {
      suggests: ['traditional meal', 'roast', 'family restaurant', 'comfort classics', 'crowd pleasers'],
      attributes: ['traditional', 'safe choices', 'crowd-pleasing', 'generous portions'],
      vibe: 'family',
      response: 'Family-approved choices'
    },
    
    // ============ TIME-BASED MOODS ============
    '3am|late night|midnight|cant sleep': {
      suggests: ['cereal', 'instant noodles', '24hr diner', 'kebab', 'cheese toast', 'delivery'],
      attributes: ['available-now', 'quick', 'comforting', 'no-judgment'],
      vibe: 'late-night',
      response: '3am food hits different'
    },
    
    'monday blues|case of mondays': {
      suggests: ['coffee', 'comfort breakfast', 'treat pastry', 'easy lunch', 'mood-boost foods'],
      attributes: ['comforting', 'mood-lifting', 'easy', 'treat'],
      vibe: 'monday',
      response: 'Monday survival food'
    },
    
    'sunday scaries|sunday blues': {
      suggests: ['comfort food', 'meal prep', 'roast dinner', 'takeout', 'ice cream'],
      attributes: ['comforting', 'preparatory', 'soothing', 'indulgent'],
      vibe: 'sunday',
      response: 'Sunday comfort to ease into the week'
    },
    
    // ============ ACTIVITY-BASED ============
    'studying|exam|finals|cramming': {
      suggests: ['brain food', 'snacks', 'coffee', 'energy bars', 'nuts', 'dark chocolate'],
      attributes: ['brain-boosting', 'energizing', 'snackable', 'focus-friendly'],
      vibe: 'studying',
      response: 'Brain fuel for the grind'
    },
    
    'working late|overtime|deadline': {
      suggests: ['delivery', 'quick meals', 'coffee', 'energy foods', 'desk-friendly food'],
      attributes: ['convenient', 'energizing', 'quick', 'satisfying'],
      vibe: 'work-mode',
      response: 'Fuel for the hustle'
    },
    
    'netflix|binge watching|movie night': {
      suggests: ['popcorn', 'pizza', 'snacks', 'ice cream', 'comfort food', 'finger foods'],
      attributes: ['snackable', 'comforting', 'easy-to-eat', 'indulgent'],
      vibe: 'couch-mode',
      response: 'Couch feast activated'
    },
    
    // ============ WEATHER/SEASONAL ============
    'rainy|gloomy|grey day': {
      suggests: ['soup', 'stew', 'hot chocolate', 'comfort food', 'warm dishes'],
      attributes: ['warming', 'comforting', 'cozy', 'hearty'],
      vibe: 'rainy-day',
      response: 'Rainy day comfort incoming'
    },
    
    'hot|scorching|heatwave|melting': {
      suggests: ['ice cream', 'salad', 'cold noodles', 'smoothie', 'poke bowl', 'gazpacho'],
      attributes: ['cooling', 'refreshing', 'light', 'cold'],
      vibe: 'hot-weather',
      response: 'Cooling foods to beat the heat'
    },
    
    'beach day|pool day|summer vibes': {
      suggests: ['fresh fruit', 'fish tacos', 'poke', 'smoothie bowl', 'light foods'],
      attributes: ['fresh', 'light', 'tropical', 'refreshing'],
      vibe: 'summer',
      response: 'Summer vibes on a plate'
    },
    
    // ============ SPECIFIC CRAVINGS ============
    'spicy|heat|fire|burn': {
      suggests: ['curry', 'hot wings', 'szechuan', 'mexican', 'korean', 'hot sauce everything'],
      attributes: ['spicy', 'hot', 'fiery', 'bold'],
      vibe: 'spicy',
      response: 'Bring on the heat!'
    },
    
    'sweet tooth|sugar rush|dessert': {
      suggests: ['cake', 'cookies', 'ice cream', 'chocolate', 'pastries', 'candy'],
      attributes: ['sweet', 'dessert', 'sugary', 'indulgent'],
      vibe: 'sweet',
      response: 'Sweet tooth demands satisfaction'
    },
    
    'cheese|cheesy': {
      suggests: ['mac and cheese', 'pizza', 'grilled cheese', 'cheese board', 'quesadilla', 'fondue'],
      attributes: ['cheesy', 'rich', 'indulgent', 'melty'],
      vibe: 'cheese',
      response: 'Cheese mode: activated'
    },
    
    'healthy|clean|detox|diet': {
      suggests: ['salad', 'poke bowl', 'smoothie', 'grilled fish', 'quinoa', 'vegetables'],
      attributes: ['healthy', 'light', 'nutritious', 'clean'],
      vibe: 'healthy',
      response: 'Healthy choices that still taste good'
    },
    
    'drunk|tipsy|buzzed|drinking': {
      suggests: ['kebab', 'pizza', 'chips', 'burger', 'drunk food', 'carbs'],
      attributes: ['absorbent', 'greasy', 'carby', 'satisfying'],
      vibe: 'drunk',
      response: 'Drunk food to the rescue'
    }
  };
  
  // Main parsing function
  export function parseCravings(userInput) {
    if (!userInput) return getDefaultSuggestion();
    
    const normalized = userInput.toLowerCase();
    const detected = {
      cravings: [],
      attributes: [],
      suggestions: [],
      vibes: [],
      responses: []
    };
    
    // Check each pattern
    Object.entries(CRAVING_MAPPINGS).forEach(([pattern, data]) => {
      const regex = new RegExp(pattern);
      if (regex.test(normalized)) {
        detected.suggestions.push(...(data.suggests || []));
        detected.attributes.push(...(data.attributes || []));
        detected.cravings.push(pattern.split('|')[0]);
        if (data.vibe) detected.vibes.push(data.vibe);
        if (data.response) detected.responses.push(data.response);
      }
    });
    
    // Remove duplicates
    detected.suggestions = [...new Set(detected.suggestions)];
    detected.attributes = [...new Set(detected.attributes)];
    detected.cravings = [...new Set(detected.cravings)];
    detected.vibes = [...new Set(detected.vibes)];
    
    // If nothing detected, try to infer
    if (detected.suggestions.length === 0) {
      return inferFromContext(normalized);
    }
    
    return detected;
  }
  
  // Infer mood from context when no direct match
  function inferFromContext(text) {
    const detected = {
      cravings: [],
      attributes: [],
      suggestions: [],
      vibes: [],
      responses: []
    };
    
    // Check for general positive mood
    if (/happy|good|great|amazing|wonderful/.test(text)) {
      detected.suggestions = ['favorite meal', 'treat yourself', 'something special'];
      detected.attributes = ['satisfying', 'enjoyable'];
      detected.vibes = ['positive'];
      detected.responses = ['Good vibes deserve good food!'];
    }
    
    // Check for general negative mood
    else if (/bad|terrible|awful|horrible/.test(text)) {
      detected.suggestions = ['comfort food', 'favorite snack', 'ice cream'];
      detected.attributes = ['comforting', 'soothing'];
      detected.vibes = ['needs-comfort'];
      detected.responses = ['Food hug coming right up'];
    }
    
    // Check for indecision
    else if (/dont know|unsure|whatever|anything|surprise/.test(text)) {
      detected.suggestions = ['chef special', 'popular choice', 'local favorite'];
      detected.attributes = ['popular', 'safe-choice'];
      detected.vibes = ['indecisive'];
      detected.responses = ["Let's pick something good for you"];
    }
    
    return detected;
  }
  
  // Default suggestion when no input
  function getDefaultSuggestion() {
    return {
      cravings: ['general'],
      attributes: ['satisfying', 'popular'],
      suggestions: ['local favorite', 'comfort food', 'popular choice'],
      vibes: ['neutral'],
      responses: ['Let me pick something good for you']
    };
  }
  
  // Enhanced mood text builder for GPT
  export function enhanceMoodText(userInput) {
    const cravingData = parseCravings(userInput);
    
    const enhanced = {
      original_input: userInput,
      detected_cravings: cravingData.cravings,
      food_attributes: cravingData.attributes,
      suggested_categories: cravingData.suggestions,
      vibes: cravingData.vibes,
      
      // Generate GPT-friendly description
      gpt_context: `User says: "${userInput}". 
                    They want: ${cravingData.attributes.join(', ')} food.
                    Mood/Vibe: ${cravingData.vibes.join(', ') || 'general hunger'}.
                    Consider these types: ${cravingData.suggestions.slice(0, 5).join(', ')}.`,
      
      // Fun response for UI
      friendly_response: cravingData.responses[0] || "Let's find you something perfect!"
    };
    
    return enhanced;
  }
  
  // Special occasion detector
  export function detectSpecialOccasion(userInput) {
    const occasions = {
      birthday: /birthday|bday|born day/i,
      anniversary: /anniversary|years together/i,
      promotion: /promotion|new job|raise/i,
      graduation: /graduation|graduated|degree/i,
      date: /date night|romantic|anniversary/i,
      celebration: /celebration|party|special/i
    };
    
    for (const [occasion, pattern] of Object.entries(occasions)) {
      if (pattern.test(userInput)) {
        return {
          type: occasion,
          special: true,
          suggestion: 'This calls for something special!'
        };
      }
    }
    
    return { type: null, special: false };
  }