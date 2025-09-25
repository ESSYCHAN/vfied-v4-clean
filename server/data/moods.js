// data/moods.js - Comprehensive Mood Taxonomy
export const MOOD_TAXONOMY = {
    moods: [
      // Energy Group
      {
        id: 'TIRED',
        group: 'Energy',
        synonyms: ['exhausted', 'sleepy', 'drained', 'wiped out', 'beat', 'worn out', 'fatigued']
      },
      {
        id: 'LOW_ENERGY',
        group: 'Energy', 
        synonyms: ['sluggish', 'lethargic', 'slow', 'unmotivated', 'lazy', 'low battery']
      },
  
      // Emotion Group
      {
        id: 'STRESSED',
        group: 'Emotion',
        synonyms: ['overwhelmed', 'pressure', 'tense', 'wound up', 'frazzled', 'burned out']
      },
      {
        id: 'ANXIOUS',
        group: 'Emotion',
        synonyms: ['nervous', 'worried', 'uneasy', 'jittery', 'on edge', 'restless']
      },
      {
        id: 'SAD',
        group: 'Emotion',
        synonyms: ['down', 'blue', 'melancholy', 'gloomy', 'upset', 'heartbroken']
      },
      {
        id: 'LOW_MOOD',
        group: 'Emotion',
        synonyms: ['depressed', 'dejected', 'discouraged', 'dispirited', 'flat']
      },
      {
        id: 'CELEBRATING',
        group: 'Emotion',
        synonyms: ['excited', 'triumphant', 'victorious', 'accomplished', 'proud', 'elated']
      },
      {
        id: 'HAPPY',
        group: 'Emotion',
        synonyms: ['joyful', 'cheerful', 'content', 'pleased', 'good mood', 'upbeat', 'positive']
      },
  
      // Body Group
      {
        id: 'POST_WORKOUT',
        group: 'Body',
        synonyms: ['after gym', 'post exercise', 'after training', 'worked out', 'fitness']
      },
      {
        id: 'HUNGRY',
        group: 'Body',
        synonyms: ['starving', 'famished', 'peckish', 'empty stomach', 'need food']
      },
      {
        id: 'CRAVING',
        group: 'Body',
        synonyms: ['want', 'desire', 'longing for', 'hankering', 'appetite for']
      },
      {
        id: 'SICK',
        group: 'Body',
        synonyms: ['ill', 'unwell', 'under weather', 'poorly', 'nauseous', 'queasy']
      },
      {
        id: 'HUNGOVER',
        group: 'Body',
        synonyms: ['hangover', 'rough morning', 'too much to drink', 'head pounding']
      },
      {
        id: 'BLOATED',
        group: 'Body',
        synonyms: ['full', 'stuffed', 'uncomfortable', 'heavy', 'gassy']
      },
      {
        id: 'PMS',
        group: 'Body',
        synonyms: ['period coming', 'hormonal', 'that time of month', 'pre-menstrual']
      },
      {
        id: 'CRAMPS',
        group: 'Body',
        synonyms: ['period pain', 'menstrual cramps', 'period', 'monthly pain']
      },
  
      // Social Group
      {
        id: 'FOCUSED',
        group: 'Social',
        synonyms: ['concentrated', 'working', 'productive', 'in the zone', 'studying']
      },
      {
        id: 'RELAX',
        group: 'Social',
        synonyms: ['chill', 'unwind', 'de-stress', 'calm', 'peaceful', 'leisure']
      },
      {
        id: 'COZY',
        group: 'Social',
        synonyms: ['comfort', 'snuggle', 'warm', 'homey', 'cuddly', 'hygge']
      },
  
      // Intent Group
      {
        id: 'ADVENTUROUS',
        group: 'Intent',
        synonyms: ['try something new', 'explore', 'experimental', 'bold', 'daring']
      },
      {
        id: 'HOMESICK',
        group: 'Intent',
        synonyms: ['missing home', 'nostalgic', 'longing for family', 'cultural craving']
      }
    ]
  };
  
  // Helper functions
  export function getMoodById(moodId) {
    return MOOD_TAXONOMY.moods.find(mood => mood.id === moodId);
  }
  
  export function getMoodsByGroup(group) {
    return MOOD_TAXONOMY.moods.filter(mood => mood.group === group);
  }
  
  export function searchMoodsBySynonym(searchTerm) {
    const term = searchTerm.toLowerCase();
    return MOOD_TAXONOMY.moods.filter(mood => 
      mood.synonyms.some(synonym => synonym.includes(term)) ||
      mood.id.toLowerCase().includes(term)
    );
  }
  
  export function getAllMoodIds() {
    return MOOD_TAXONOMY.moods.map(mood => mood.id);
  }
  
  export function getMoodGroups() {
    return [...new Set(MOOD_TAXONOMY.moods.map(mood => mood.group))];
  }
  
  // Convert text to mood IDs (enhanced version)
  export function textToMoodIds(text) {
    if (!text) return [];
    
    const normalizedText = text.toLowerCase();
    const detectedMoods = [];
    
    for (const mood of MOOD_TAXONOMY.moods) {
      // Check if mood ID is mentioned
      if (normalizedText.includes(mood.id.toLowerCase().replace('_', ' '))) {
        detectedMoods.push(mood.id);
        continue;
      }
      
      // Check synonyms
      for (const synonym of mood.synonyms) {
        if (normalizedText.includes(synonym)) {
          detectedMoods.push(mood.id);
          break;
        }
      }
    }
    
    return [...new Set(detectedMoods)]; // Remove duplicates
  }