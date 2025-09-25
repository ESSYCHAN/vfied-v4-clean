// VFIED Complete AI Food Service - FIXED SETTINGS INTEGRATION
// ALL PHASES IMPLEMENTATION + PROPER SETTINGS SUPPORT

import { db, COLLECTIONS } from '../firebase.js';
import { collection, addDoc, query, where, orderBy, limit, getDocs, updateDoc, doc } from 'firebase/firestore';

class AIFoodService {
  constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.weatherApiKey = import.meta.env.VITE_WEATHER_API_KEY;
    this.userLocation = null;
    this.userCulture = null;
    this.personalHistory = [];
    this.contextData = {};
    this.interactionId = null;
    
    this.initializeService();
  }

  async initializeService() {
    console.log('🤖 VFIED AI Service initializing all phases...');
    
    // Phase 1: Location + Cultural Detection
    await this.detectLocation();
    await this.detectCulturalContext();
    
    // Phase 2: Personal Learning
    await this.loadPersonalHistory();
    await this.analyzePersonalPatterns();
    
    // Phase 3: MCP Integration
    await this.initializeContextSources();
    
    console.log('✅ VFIED AI Service ready with full intelligence!');
  }

  // ==================== SETTINGS INTEGRATION FIX ====================
  
  // NEW: Get current effective location (settings override or detected)
  getEffectiveLocation() {
    // FIRST: Check if user has overridden location in settings
    const userSettings = this.getUserSettings();
    
    if (userSettings && userSettings.location) {
      console.log('📍 Using settings location override:', userSettings.location);
      return userSettings.location;
    }
    
    // FALLBACK: Use detected location
    if (this.userLocation && this.userLocation.city !== 'Unknown') {
      console.log('📍 Using detected location:', this.userLocation);
      return this.userLocation;
    }
    
    // FINAL FALLBACK: Default
    console.log('📍 Using default location fallback');
    return { 
      city: 'Unknown', 
      country: 'Unknown',
      countryCode: 'US'
    };
  }

  // NEW: Get user settings from localStorage
  getUserSettings() {
    try {
      const saved = localStorage.getItem('vfied_user_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        console.log('⚙️ Loaded user settings:', settings);
        return settings;
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
    return null;
  }

  // NEW: Convert settings location format to our format
  parseSettingsLocation(settingsLocation) {
    if (!settingsLocation) return null;
    
    // Handle different location formats from settings
    if (typeof settingsLocation === 'object' && settingsLocation.city) {
      return settingsLocation;
    }
    
    // Handle string format like "nairobi,ke"
    if (typeof settingsLocation === 'string') {
      const locationMap = {
        'london,uk': { city: 'London', country: 'United Kingdom', countryCode: 'GB' },
        'nairobi,ke': { city: 'Nairobi', country: 'Kenya', countryCode: 'KE' },
        'tokyo,jp': { city: 'Tokyo', country: 'Japan', countryCode: 'JP' },
        'newyork,us': { city: 'New York', country: 'United States', countryCode: 'US' },
        'paris,fr': { city: 'Paris', country: 'France', countryCode: 'FR' },
        'mumbai,in': { city: 'Mumbai', country: 'India', countryCode: 'IN' },
        'lagos,ng': { city: 'Lagos', country: 'Nigeria', countryCode: 'NG' },
        'sydney,au': { city: 'Sydney', country: 'Australia', countryCode: 'AU' }
      };
      
      return locationMap[settingsLocation.toLowerCase()] || null;
    }
    
    return null;
  }

  // UPDATED: Detect cultural context with settings awareness
  async detectCulturalContext() {
    const effectiveLocation = this.getEffectiveLocation();
    
    if (!this.openaiApiKey) {
      console.log('🌍 Using fallback cultural context for:', effectiveLocation.city);
      this.userCulture = this.getFallbackCulture(effectiveLocation.countryCode);
      return;
    }

    try {
      console.log('🌍 Detecting cultural food context for:', effectiveLocation.city, effectiveLocation.country);
      
      const culturalPrompt = `
Location: ${effectiveLocation.city}, ${effectiveLocation.country}
Country Code: ${effectiveLocation.countryCode}

Analyze the food culture for this location. Return a JSON object with:
{
  "mainCuisine": "primary cuisine type",
  "popularFoods": ["5 most common local foods"],
  "comfortFoods": ["3 local comfort foods"],
  "streetFoods": ["3 popular street/quick foods"],
  "celebrationFoods": ["2 foods for celebrations"],
  "breakfastFoods": ["3 typical breakfast items"],
  "mealTiming": {
    "breakfast": "typical breakfast time",
    "lunch": "typical lunch time", 
    "dinner": "typical dinner time"
  },
  "culturalNotes": "2-3 sentences about local food culture",
  "weatherFoods": {
    "cold": ["2 foods for cold weather"],
    "hot": ["2 foods for hot weather"],
    "rainy": ["2 foods for rainy days"]
  }
}

Focus on authentic local foods, not just international chains.
      `;

      const culturalData = await this.callOpenAI(culturalPrompt, { 
        responseFormat: 'json',
        maxTokens: 800 
      });
      
      this.userCulture = JSON.parse(culturalData);
      console.log('🌍 Cultural context learned for', effectiveLocation.city, ':', this.userCulture.mainCuisine);
      
    } catch (error) {
      console.error('Cultural detection failed:', error);
      this.userCulture = this.getFallbackCulture(effectiveLocation.countryCode);
    }
  }

  // UPDATED: Fallback culture with proper country code support
  getFallbackCulture(countryCode = 'US') {
    const fallbacks = {
      'KE': { // Kenya
        mainCuisine: 'East African',
        popularFoods: ['ugali', 'nyama choma', 'sukuma wiki', 'pilau', 'chapati'],
        comfortFoods: ['ugali with stew', 'mandazi', 'chai'],
        streetFoods: ['roasted maize', 'samosa', 'mutura'],
        culturalNotes: 'Kenyan cuisine focuses on hearty staples like ugali, with grilled meats and fresh vegetables.'
      },
      'NG': { // Nigeria
        mainCuisine: 'West African',
        popularFoods: ['jollof rice', 'pounded yam', 'egusi soup', 'suya', 'plantain'],
        comfortFoods: ['jollof rice', 'pepper soup', 'puff puff'],
        streetFoods: ['suya', 'boli', 'akara'],
        culturalNotes: 'Nigerian food is bold and spicy, with jollof rice and various soups being central to the cuisine.'
      },
      'IN': { // India
        mainCuisine: 'Indian',
        popularFoods: ['dal rice', 'roti', 'biryani', 'curry', 'chapati'],
        comfortFoods: ['dal rice', 'khichdi', 'chai'],
        streetFoods: ['samosa', 'chaat', 'vada pav'],
        culturalNotes: 'Indian cuisine varies by region but commonly features spices, rice, lentils, and diverse vegetarian options.'
      },
      'GB': { // UK
        mainCuisine: 'British',
        popularFoods: ['fish and chips', 'shepherd\'s pie', 'bangers and mash', 'curry', 'roast dinner'],
        comfortFoods: ['fish and chips', 'pie and mash', 'tea and biscuits'],
        streetFoods: ['fish and chips', 'pasty', 'sandwich'],
        culturalNotes: 'British cuisine combines traditional comfort foods with influences from former colonies, especially Indian cuisine.'
      },
      'JP': { // Japan
        mainCuisine: 'Japanese',
        popularFoods: ['rice', 'miso soup', 'sushi', 'ramen', 'tempura'],
        comfortFoods: ['ramen', 'rice bowl', 'miso soup'],
        streetFoods: ['takoyaki', 'yakitori', 'onigiri'],
        culturalNotes: 'Japanese cuisine emphasizes fresh ingredients, seasonal eating, and careful presentation.'
      },
      'US': { // USA - Default
        mainCuisine: 'American',
        popularFoods: ['burger', 'pizza', 'sandwich', 'pasta', 'tacos'],
        comfortFoods: ['mac and cheese', 'pizza', 'ice cream'],
        streetFoods: ['hot dog', 'food truck tacos', 'bagel'],
        culturalNotes: 'American cuisine is diverse, combining influences from many cultures with a focus on convenience and variety.'
      }
    };

    return fallbacks[countryCode] || fallbacks['US'];
  }

  // ==================== EXISTING LOCATION DETECTION (UNCHANGED) ====================
  
  async detectLocation() {
    try {
      console.log('📍 Detecting location...');
      
      // Get precise location
      const position = await this.getCurrentPosition();
      this.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      // Reverse geocode for cultural context
      const locationData = await this.reverseGeocode(this.userLocation);
      this.userLocation = { ...this.userLocation, ...locationData };
      
      console.log('📍 Auto-detected location:', this.userLocation.city, this.userLocation.country);
      
    } catch (error) {
      console.log('📍 Using fallback location context');
      this.userLocation = { 
        city: 'Unknown', 
        country: 'Unknown',
        countryCode: 'US'
      };
    }
  }

  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      });
    });
  }

  async reverseGeocode(location) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Geocoding failed');
      
      const data = await response.json();
      
      return {
        city: data.address?.city || data.address?.town || data.address?.village || 'Unknown',
        country: data.address?.country || 'Unknown',
        countryCode: data.address?.country_code?.toUpperCase() || 'US',
        region: data.address?.state || data.address?.region,
        neighbourhood: data.address?.neighbourhood || data.address?.suburb,
        displayName: data.display_name
      };
      
    } catch (error) {
      console.error('Geocoding failed:', error);
      return {
        city: 'Unknown',
        country: 'Unknown',
        countryCode: 'US'
      };
    }
  }

  // ==================== UPDATED AI PERSONALIZATION WITH SETTINGS ====================

  async getPersonalizedFoodSuggestion(mood, context = {}) {
    if (!this.openaiApiKey) {
      return this.getFallbackSuggestion(mood);
    }

    try {
      // IMPORTANT: Use effective location (settings override or detected)
      const effectiveLocation = this.getEffectiveLocation();
      
      // Gather comprehensive context with proper location
      const fullContext = await this.gatherFullContext(mood, context, effectiveLocation);
      
      // Generate personalized prompt
      const prompt = this.buildPersonalizedPrompt(mood, fullContext);
      
      // Get AI suggestion
      const aiResponse = await this.callOpenAI(prompt, { 
        responseFormat: 'json',
        maxTokens: 1200 
      });
      
      // Parse and enhance response
      const suggestion = this.parseAIResponse(aiResponse, mood, fullContext);
      
      // Learn from this interaction
      this.interactionId = await this.recordInteraction(mood, suggestion, fullContext);
      suggestion.interactionId = this.interactionId;
      
      return suggestion;
      
    } catch (error) {
      console.error('AI suggestion failed:', error);
      return this.getFallbackSuggestion(mood);
    }
  }

  // UPDATED: Gather context with effective location
  async gatherFullContext(mood, context, effectiveLocation = null) {
    const now = new Date();
    const location = effectiveLocation || this.getEffectiveLocation();
    const userSettings = this.getUserSettings();
    
    return {
      time: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        date: now.toISOString().split('T')[0],
        isWeekend: [0, 6].includes(now.getDay()),
        timeOfDay: this.getTimeOfDay(now.getHours()),
        isWorkHours: this.isWorkHours(now)
      },
      
      location: location,
      culture: this.userCulture,
      personalHistory: this.getRecentHistory(),
      patterns: await this.getPersonalPatterns(mood),
      preferences: this.getUserPreferences(mood),
      
      // Include dietary restrictions from settings
      dietary: userSettings?.dietary || [],
      
      // Weather context
      weather: await this.getWeatherContext(),
      
      // Contextual hints
      isQuickDecision: context.quick || false,
      budget: context.budget || 'medium',
      socialSituation: context.social || 'solo',
      includeRestaurants: context.includeRestaurants || false,
      culturalPriority: context.culturalPriority !== false,
      
      // User provided context
      ...context
    };
  }

  // UPDATED: Build prompt with proper location context
  buildPersonalizedPrompt(mood, context) {
    const recentChoicesText = this.formatPersonalHistory(context.personalHistory);
    const patternsText = this.formatPersonalPatterns(context.patterns);
    const situationText = this.formatCurrentSituation(context);
    
    // Weather context
    const weatherText = context.weather 
      ? `Weather: ${context.weather.temperature}°C, ${context.weather.description}${context.weather.isRaining ? ' (raining)' : ''}${context.weather.isCold ? ' (cold day)' : ''}${context.weather.isHot ? ' (hot day)' : ''}`
      : 'Weather: unknown';

    // Dietary restrictions
    const dietaryText = context.dietary && context.dietary.length > 0
      ? `DIETARY RESTRICTIONS: User follows ${context.dietary.join(', ')}. ONLY suggest foods that are 100% compatible with these restrictions.`
      : '';
  
    return `
You are VFIED, a culturally-aware AI food friend who knows this person personally.

CURRENT SITUATION:
- Location: ${context.location?.city || 'Unknown'}, ${context.location?.country || 'Unknown'}
- Time: ${context.time?.timeOfDay || 'unknown'} on ${this.getDayName(context.time?.dayOfWeek || 0)}
- Mood: ${mood}
- ${weatherText}
- Social situation: ${context.socialSituation}

${dietaryText}

CULTURAL KNOWLEDGE:
- Local cuisine: ${context.culture?.mainCuisine || 'mixed'}
- Popular local foods: ${context.culture?.popularFoods?.join(', ') || 'varied'}
- Cultural context: ${context.culture?.culturalNotes || 'diverse food scene'}

PERSONAL LEARNING:
Recent choices: ${recentChoicesText}
Learned patterns: ${patternsText}

WEATHER CONTEXT:
${this.getWeatherFoodAdvice(context.weather)}

CURRENT CONTEXT:
${situationText}

TASK: Suggest 1 perfect food option considering:
1. Their exact location (${context.location?.city}) and what's actually available there
2. Current weather conditions and temperature
3. Their personal preferences and dietary restrictions
4. Current mood, time, and weather
5. Local cultural context and authentic options from ${context.location?.country}
6. What they can realistically get right now in ${context.location?.city}

Weather should influence your suggestion:
- Cold weather (< 15°C): Suggest warm, comforting foods
- Hot weather (> 30°C): Suggest cool, refreshing foods  
- Rainy weather: Suggest comfort foods and warm drinks
- Perfect weather: Any food that fits mood and culture

Prioritize authentic ${context.culture?.mainCuisine || 'local'} options over international chains when possible.

Respond with this exact JSON structure:
{
  "food": {
    "name": "specific food name (local ${context.location?.country} food if possible)",
    "emoji": "appropriate emoji",
    "type": "cuisine type", 
    "category": "comfort/healthy/celebration/recovery/local"
  },
  "friendMessage": "supportive message as their food friend (2-3 sentences)",
  "reasoning": "why this fits their situation right now in ${context.location?.city}",
  "culturalNote": "how this fits ${context.location?.country} food culture",
  "personalNote": "reference to their patterns/preferences (if applicable)",
  "weatherNote": "how the weather influenced this choice",
  "availabilityNote": "where they can get this in ${context.location?.city}",
  "alternatives": [
    {"name": "backup option 1", "emoji": "🍽️", "reason": "why this works too"},
    {"name": "backup option 2", "emoji": "🥘", "reason": "another good choice"}
  ],
  "confidence": 85
}

Be specific to ${context.location?.city}, ${context.location?.country} and current weather conditions!
    `;
  }

  // Rest of the existing methods unchanged...
  getWeatherFoodAdvice(weather) {
    if (!weather) return 'Weather unknown - suggest based on other factors';
    
    let advice = [];
    
    if (weather.isCold) {
      advice.push(`Cold ${weather.temperature}°C day - prioritize warm, comforting foods like soups, stews, hot beverages`);
    } else if (weather.isHot) {
      advice.push(`Hot ${weather.temperature}°C day - suggest cool, refreshing options like salads, cold drinks, ice cream`);
    } else {
      advice.push(`Comfortable ${weather.temperature}°C - any food that matches mood and culture`);
    }
    
    if (weather.isRaining) {
      advice.push('Rainy day - perfect for comfort foods and staying cozy indoors');
    }
    
    if (weather.isSnowing) {
      advice.push('Snowy weather - hearty, warming foods are ideal');
    }
    
    return advice.join(', ');
  }

  async callOpenAI(prompt, options = {}) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
  
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
  
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal, // Add this line
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Change to faster model
          messages: [
            {
              role: 'system',
              content: 'You are VFIED, a culturally-aware personal food friend who gives specific, practical food suggestions based on location, culture, and personal patterns. Always respond with valid JSON.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          max_tokens: options.maxTokens || 500, // Reduce tokens for speed
          temperature: 0.7,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined
        })
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }
  
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  parseAIResponse(aiResponse, mood, context) {
    try {
      const parsed = JSON.parse(aiResponse);
      
      return {
        food: {
          id: this.generateFoodId(parsed.food.name),
          name: parsed.food.name,
          emoji: parsed.food.emoji,
          type: parsed.food.type,
          category: parsed.food.category
        },
        description: parsed.friendMessage,
        friendResponse: parsed.friendMessage,
        reason: parsed.reasoning,
        culturalNote: parsed.culturalNote,
        personalNote: parsed.personalNote,
        availabilityNote: parsed.availabilityNote,
        alternatives: parsed.alternatives || [],
        confidence: parsed.confidence || 85,
        source: 'ai',
        mood: mood,
        timestamp: new Date().toISOString(),
        location: context.location.city
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.log('Raw AI response:', aiResponse);
      
      // Fallback to simple response
      return {
        food: {
          id: 'ai-suggestion',
          name: 'AI Suggestion',
          emoji: '🤖',
          category: 'comfort'
        },
        description: "Here's what I think would work for you right now!",
        friendResponse: "Here's what I think would work for you right now!",
        confidence: 70,
        source: 'ai-fallback'
      };
    }
  }

  // All other existing methods remain the same...
  async loadPersonalHistory() {
    try {
      const q = query(
        collection(db, COLLECTIONS.DECISIONS),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      
      const querySnapshot = await getDocs(q);
      this.personalHistory = [];
      
      querySnapshot.forEach(doc => {
        this.personalHistory.push({ id: doc.id, ...doc.data() });
      });
      
      console.log(`📚 Loaded ${this.personalHistory.length} previous choices`);
    } catch (error) {
      console.error('Error loading personal history:', error);
      this.personalHistory = [];
    }
  }

  async getPersonalPatterns(mood) {
    try {
      const q = query(
        collection(db, COLLECTIONS.DECISIONS),
        where('mood', '==', mood),
        where('rating', '>=', 4),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      
      const querySnapshot = await getDocs(q);
      const goodChoices = [];
      
      querySnapshot.forEach(doc => {
        goodChoices.push(doc.data());
      });
      
      return this.analyzePatterns(goodChoices);
    } catch (error) {
      console.error('Error getting patterns:', error);
      return { confidence: 'low', patterns: [] };
    }
  }

  analyzePatterns(choices) {
    if (choices.length === 0) {
      return { confidence: 'new', patterns: [] };
    }
    
    const patterns = {
      preferredCuisines: this.getTopItems(choices, 'cuisineType'),
      timePreferences: this.getTimePatterns(choices),
      weatherPreferences: this.getWeatherPatterns(choices),
      locationPreferences: this.getLocationPatterns(choices),
      confidence: choices.length >= 5 ? 'high' : choices.length >= 2 ? 'medium' : 'low'
    };
    
    return patterns;
  }

  async recordInteraction(mood, suggestion, context) {
    try {
      const interaction = {
        mood,
        foodId: suggestion.food.id,
        foodName: suggestion.food.name,
        source: 'ai',
        context: {
          location: context.location.city,
          weather: context.weather?.condition,
          time: context.time,
          cultural: context.culture?.mainCuisine
        },
        suggestion: {
          reasoning: suggestion.reason,
          culturalNote: suggestion.culturalNote,
          confidence: suggestion.confidence
        },
        timestamp: new Date().toISOString(),
        rating: null,
        userLocation: context.location
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.DECISIONS), interaction);
      return docRef.id;
    } catch (error) {
      console.error('Error recording interaction:', error);
      return null;
    }
  }

  async updateRating(interactionId, rating) {
    if (!interactionId) return;
    
    try {
      await updateDoc(doc(db, COLLECTIONS.DECISIONS, interactionId), {
        rating,
        ratedAt: new Date().toISOString()
      });
      
      if (rating >= 4) {
        this.schedulePatternUpdate();
      }
      
      console.log(`✅ Rating updated: ${rating}/5`);
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  }

  // Weather and other utility methods remain the same...
  async initializeContextSources() {
    await this.setupWeatherService();
    await this.setupCalendarIntegration();
    await this.setupHealthIntegration();
    console.log('🔗 Context sources initialized');
  }

  async getWeatherContext() {
    if (!this.weatherApiKey) {
      return this.getSimulatedWeather();
    }
  
    try {
      if (!this.userLocation?.lat) {
        return this.getSimulatedWeather();
      }
  
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${this.userLocation.lat}&lon=${this.userLocation.lng}&appid=${this.weatherApiKey}&units=metric`
      );
      
      if (!response.ok) throw new Error('Weather API failed');
      
      const data = await response.json();
      
      return {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        humidity: data.main.humidity,
        condition: data.weather[0].main.toLowerCase(),
        description: data.weather[0].description,
        isRaining: data.weather[0].main.toLowerCase().includes('rain'),
        isSnowing: data.weather[0].main.toLowerCase().includes('snow'),
        isCold: data.main.temp < 15,
        isHot: data.main.temp > 30,
        isComfortable: data.main.temp >= 18 && data.main.temp <= 26,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Weather fetch error:', error);
      return this.getSimulatedWeather();
    }
  }

  getSimulatedWeather() {
    const effectiveLocation = this.getEffectiveLocation();
    const country = effectiveLocation?.countryCode || 'US';
    const hour = new Date().getHours();
    
    let baseTemp = 20;
    
    const tempMap = {
      'KE': 22, 'NG': 28, 'ET': 18, 'ZA': 20,
      'IN': 25, 'JP': 18, 'CN': 16, 'TH': 30,
      'GB': 12, 'DE': 15, 'FR': 16, 'IT': 18,
      'US': 18, 'CA': 10, 'MX': 24, 'BR': 26
    };
    
    baseTemp = tempMap[country] || 20;
    
    const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 8;
    const temp = Math.round(baseTemp + tempVariation + (Math.random() * 6 - 3));
    
    const conditions = ['clear', 'cloudy', 'rain', 'sunny'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: temp,
      feelsLike: temp + Math.floor(Math.random() * 6) - 3,
      condition,
      description: condition === 'clear' ? 'clear sky' : condition,
      isRaining: condition === 'rain',
      isSnowing: false,
      isCold: temp < 15,
      isHot: temp > 30,
      isComfortable: temp >= 18 && temp <= 26,
      simulated: true,
      timestamp: new Date().toISOString()
    };
  }

  async setupWeatherService() {
    console.log('🌤️ Weather service configured');
  }

  async setupCalendarIntegration() {
    console.log('📅 Calendar integration simulated');
  }

  async setupHealthIntegration() {
    console.log('💪 Health integration simulated');
  }

  getFallbackSuggestion(mood) {
    const effectiveLocation = this.getEffectiveLocation();
    
    const fallbackFoods = {
      'tired': { name: 'Order Something Good', emoji: '🍕' },
      'stressed': { name: 'Comfort Food', emoji: '🍜' },
      'celebrating': { name: 'Treat Yourself', emoji: '🎂' },
      'healthy': { name: 'Something Nutritious', emoji: '🥗' },
      'hungover': { name: 'Recovery Food', emoji: '🍔' },
      'default': { name: 'Good Food', emoji: '🍽️' }
    };

    const food = fallbackFoods[mood] || fallbackFoods['default'];
    
    return {
      food: {
        id: `fallback-${mood}`,
        name: food.name,
        emoji: food.emoji,
        category: 'comfort'
      },
      description: `Here's what sounds good for ${mood} mood in ${effectiveLocation.city}!`,
      friendResponse: `Here's what sounds good for ${mood} mood in ${effectiveLocation.city}!`,
      reason: 'Fallback suggestion - AI service unavailable',
      confidence: 60,
      source: 'fallback',
      location: effectiveLocation.city
    };
  }

  // Utility methods remain the same...
  generateFoodId(name) {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);
  }

  getTimeOfDay(hour) {
    if (hour < 6) return 'late night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 22) return 'evening';
    return 'late night';
  }

  getDayName(dayIndex) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  isWorkHours(date = new Date()) {
    const hour = date.getHours();
    const day = date.getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  formatPersonalHistory(history) {
    if (!history || history.length === 0) return 'No previous choices recorded';
    
    return history.slice(0, 5).map(choice => 
      `${choice.mood}: ${choice.foodName} (${choice.rating ? choice.rating + '/5' : 'unrated'})`
    ).join(', ');
  }

  formatPersonalPatterns(patterns) {
    if (!patterns || patterns.confidence === 'new') return 'Still learning your preferences';
    
    let formatted = [];
    if (patterns.preferredCuisines?.length > 0) {
      formatted.push(`Prefers: ${patterns.preferredCuisines.slice(0, 2).join(', ')}`);
    }
    if (patterns.confidence) {
      formatted.push(`Confidence: ${patterns.confidence}`);
    }
    
    return formatted.join(', ') || 'Building your preference profile';
  }

  formatCurrentSituation(context) {
    let situation = [];
    
    if (context.weather?.isRaining) situation.push('raining');
    if (context.weather?.isCold) situation.push(`cold weather (${context.weather.temperature}°C)`);
    if (context.weather?.isHot) situation.push(`hot weather (${context.weather.temperature}°C)`);
    if (context.time?.isWeekend) situation.push('weekend');
    if (context.time?.isWorkHours) situation.push('work hours');
    if (context.includeRestaurants) situation.push('wants restaurant options');
    if (context.culturalPriority) situation.push('prefers local/cultural foods');
    
    return situation.join(', ') || 'normal day';
  }

  getRecentHistory() {
    return this.personalHistory.slice(0, 10);
  }

  getUserPreferences(mood) {
    const moodChoices = this.personalHistory.filter(choice => 
      choice.mood === mood && choice.rating >= 4
    );
    
    return {
      favoriteChoices: moodChoices.slice(0, 3),
      hasPreferences: moodChoices.length > 0
    };
  }

  getTopItems(choices, field) {
    const counts = {};
    choices.forEach(choice => {
      if (choice[field]) {
        counts[choice[field]] = (counts[choice[field]] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item);
  }

  getTimePatterns(choices) {
    const patterns = {};
    choices.forEach(choice => {
      if (choice.context?.time?.timeOfDay) {
        const time = choice.context.time.timeOfDay;
        patterns[time] = (patterns[time] || 0) + 1;
      }
    });
    return patterns;
  }

  getWeatherPatterns(choices) {
    const patterns = {};
    choices.forEach(choice => {
      if (choice.context?.weather) {
        const weather = choice.context.weather;
        patterns[weather] = (patterns[weather] || 0) + 1;
      }
    });
    return patterns;
  }

  getLocationPatterns(choices) {
    const patterns = {};
    choices.forEach(choice => {
      if (choice.context?.location) {
        const location = choice.context.location;
        patterns[location] = (patterns[location] || 0) + 1;
      }
    });
    return patterns;
  }

  schedulePatternUpdate() {
    clearTimeout(this.patternUpdateTimeout);
    this.patternUpdateTimeout = setTimeout(() => {
      this.loadPersonalHistory();
      this.analyzePersonalPatterns();
    }, 5000);
  }

  analyzePersonalPatterns() {
    console.log('🧠 Analyzing personal patterns...');
  }
}

// Create singleton instance
export const aiFoodService = new AIFoodService();

// UPDATED EXPORT FUNCTIONS - NOW WITH PROPER SETTINGS INTEGRATION

export const getAIFoodSuggestion = async (mood, context = {}) => {
  console.log(`Getting AI suggestion for mood: ${mood}`);
  
  try {
    // Try your MCP server first
    const response = await fetch(`${CONFIG.API_BASE}/v1/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mood_text: mood,
        location: context.location || CONFIG.DEFAULT_LOCATION,
        dietary: context.dietary || [],
        budget: context.budget || 'medium'
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return {
      ...data,
      source: 'server',
      location: context.location?.city || 'London'
    };

  } catch (error) {
    console.error('Server call failed, using local fallback:', error);
    
    // Fallback to local AI service
    return await aiFoodService.getPersonalizedFoodSuggestion(mood, context);
  }
};

export const getAIQuickDecision = async (context = {}) => {
  console.log('🎲 Getting AI quick decision with settings awareness...');
  
  try {
    // Get effective location and settings
    const effectiveLocation = aiFoodService.getEffectiveLocation();
    const userSettings = aiFoodService.getUserSettings();
    
    console.log('📍 Quick decision using location:', effectiveLocation);
    console.log('⚙️ Quick decision using settings:', userSettings);
    
    const response = await fetch('https://vfied-mcp-server.onrender.com/mcp/get_quick_food_decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        location: effectiveLocation, // USE EFFECTIVE LOCATION
        dietary: userSettings?.dietary || [], // INCLUDE DIETARY RESTRICTIONS
        userId: context.userId || 'anonymous',
        context: {
          includeRestaurants: context.includeRestaurants,
          quick: true,
          budget: context.budget || 'medium',
          timeConstraint: 'quick'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP server error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ MCP quick decision received for', effectiveLocation.city, ':', data);
    
    return {
      ...data,
      source: 'mcp',
      location: effectiveLocation.city,
      interactionId: data.interactionId || Date.now().toString()
    };

  } catch (error) {
    console.error('❌ MCP quick decision failed, using local AI:', error);
    return await aiFoodService.getPersonalizedFoodSuggestion('random', context);
  }
};

export const updateAIFeedback = async (interactionId, rating) => {
  console.log(`📊 Updating feedback: ${rating}/5`);
  return await aiFoodService.updateRating(interactionId, rating);
};

export const getAILocationContext = () => {
  return {
    location: aiFoodService.getEffectiveLocation(), // USE EFFECTIVE LOCATION
    culture: aiFoodService.userCulture
  };
};

export const getAIServiceStatus = () => {
  const effectiveLocation = aiFoodService.getEffectiveLocation();
  return {
    hasOpenAI: !!aiFoodService.openaiApiKey,
    hasLocation: !!effectiveLocation?.city && effectiveLocation.city !== 'Unknown',
    hasCulture: !!aiFoodService.userCulture?.mainCuisine,
    hasHistory: aiFoodService.personalHistory.length > 0,
    effectiveLocation: effectiveLocation
  };
};
export async function quickDecision(location = { city: "London", country_code: "GB" }, dietary = []) {
  try {
    const response = await fetch("/v1/quick_decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, dietary })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error("No suggestions returned");
    
    return data.decisions || [];
  } catch (error) {
    console.warn("Quick decision API failed, using fallback:", error);
    
    // Local fallback based on country
    const fallbacks = {
      'GB': [
        { name: "Fish & Chips", emoji: "🍟", explanation: "Classic British comfort, crispy & filling" },
        { name: "Chicken Tikka", emoji: "🍛", explanation: "UK curry favorite, warming spices" },
        { name: "Sunday Roast", emoji: "🥩", explanation: "Traditional hearty family meal" }
      ],
      'US': [
        { name: "Smash Burger", emoji: "🍔", explanation: "Hearty American classic, always satisfying" },
        { name: "Caesar Salad", emoji: "🥗", explanation: "Fresh greens with satisfying crunch" },
        { name: "BBQ Ribs", emoji: "🍖", explanation: "Smoky comfort food, weekend worthy" }
      ],
      'KE': [
        { name: "Ugali & Sukuma", emoji: "🍽️", explanation: "Traditional comfort, hearty and wholesome" },
        { name: "Nyama Choma", emoji: "🥩", explanation: "Grilled perfection, social and satisfying" },
        { name: "Pilau", emoji: "🍚", explanation: "Spiced rice, aromatic and satisfying" }
      ],
      'JP': [
        { name: "Tonkotsu Ramen", emoji: "🍜", explanation: "Rich broth comfort, perfect for any mood" },
        { name: "Chicken Katsu", emoji: "🍱", explanation: "Crispy satisfaction, simple and delicious" },
        { name: "Sushi Set", emoji: "🍣", explanation: "Clean flavors, light but satisfying" }
      ]
    };
    
    const countryCode = location.country_code || 'GB';
    return fallbacks[countryCode] || fallbacks['GB'];
  }
}

// Travel Itinerary - 3 stops for the day
export async function getTravelItinerary(location = { city: "London", country_code: "GB" }) {
  try {
    const response = await fetch("/v1/travel/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location,
        duration: "one_day",
        interests: ["food", "culture"],
        budget: "medium"
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error("No itinerary returned");
    
    return data.steps || [];
  } catch (error) {
    console.warn("Travel API failed, using fallback:", error);
    return [
      { time: "09:00", title: "Local Breakfast Café", emoji: "🥐", why: "Cozy start with pastry & coffee" },
      { time: "13:00", title: "Market Lunch", emoji: "🍲", why: "Authentic comfort food in center" },
      { time: "19:00", title: "Wine/Tapas Bar", emoji: "🍷", why: "Relaxed evening small plates" }
    ];
  }
}

// Events - Food-linked cultural events
export async function getFoodEvents(location = { city: "London", country_code: "GB" }) {
  try {
    const response = await fetch(`/v1/events?city=${encodeURIComponent(location.city)}&country_code=${location.country_code}`);
    
    const data = await response.json();
    if (!data.success) throw new Error("No events returned");
    
    return data.events || [];
  } catch (error) {
    console.warn("Events API failed, using fallback:", error);
    return [
      { 
        title: "Local Food Market", 
        emoji: "🥬", 
        when: "Weekend mornings",
        description: "Fresh produce and local specialties",
        location: `${location.city} center`
      },
      { 
        title: "Happy Hour Specials", 
        emoji: "🍻", 
        when: "Weekdays 5-7pm",
        description: "Discounted appetizers and local favorites",
        location: `${location.city} restaurants`
      }
    ];
  }
}

// Render 3-card shortlist
export function renderFoodShortlist(decisions, containerId = "shortlist-result") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return;
  }

  container.innerHTML = `
    <div style="margin: 24px 20px;">
      <h3 style="text-align: center; margin: 0 0 20px 0; font-size: 18px; font-weight: 700; color: #a5b4fc;">
        Your 3 Perfect Picks
      </h3>
      <div style="display: grid; gap: 12px;">
        ${decisions.map((decision, index) => `
          <div class="decision-card" data-food="${decision.name}" style="
            background: rgba(255,255,255,0.06); 
            border: 1px solid rgba(255,255,255,0.12); 
            border-radius: 12px; 
            padding: 16px; 
            cursor: pointer;
            transition: all 0.2s ease;
          " onclick="selectFood('${decision.name}')">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 28px;">${decision.emoji}</div>
              <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px; color: #e5ecff;">
                  ${decision.name}
                </div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.4;">
                  ${decision.explanation}
                </div>
              </div>
              <div style="background: rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #10b981;">
                #${index + 1}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
        <button onclick="getNewPicks()" style="
          padding: 12px; 
          background: rgba(255,255,255,0.08); 
          border: 1px solid rgba(255,255,255,0.15); 
          border-radius: 12px; 
          color: #e5ecff; 
          font-weight: 700; 
          cursor: pointer;
          font-size: 14px;
        ">
          🔄 New Picks
        </button>
        <button onclick="showAdvancedMode()" style="
          padding: 12px; 
          background: rgba(124, 58, 237, 0.2); 
          border: 1px solid rgba(124, 58, 237, 0.3); 
          border-radius: 12px; 
          color: #a5b4fc; 
          font-weight: 700; 
          cursor: pointer;
          font-size: 14px;
        ">
          🧠 Add Mood
        </button>
      </div>
    </div>
  `;
  
  container.classList.remove('hidden');
}

// Helper functions for button clicks
window.selectFood = function(foodName) {
  console.log(`Selected: ${foodName}`);
  const query = encodeURIComponent(`${foodName} near me`);
  window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
};

window.getNewPicks = async function() {
  const location = { city: "London", country_code: "GB" }; // Get from app state
  const decisions = await quickDecision(location, []);
  renderFoodShortlist(decisions);
};

window.showAdvancedMode = function() {
  const moodInput = document.getElementById('mood-input');
  if (moodInput) {
    moodInput.style.display = 'block';
    moodInput.focus();
  }
  console.log('Advanced mode activated - add your mood for AI suggestions');
};