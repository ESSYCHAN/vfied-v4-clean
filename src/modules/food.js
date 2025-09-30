// modules/food.js - Food decision logic and GPT calls
import { byId, setText, setHTML, show, hide, escapeHtml } from './ui.js';

let moduleConfig = {};
let lastPicks = [];
const LAST_LIMIT = 6;

// Fallback suggestions if API fails
const fallbackSuggestions = [
  {
    food: { emoji: '🍜', name: 'Tonkotsu Ramen' },
    friendMessage: 'Warming and soothing — perfect for stressed vibes.',
    availabilityNote: 'Try Koya Soho or Tonkotsu (open now)',
    culturalNote: 'Ramen culture in London has exploded — Soho has great late-night bowls.',
    weatherNote: 'Rainy/cold? Hot broth hits just right.',
    source: 'local-fallback',
  },
  {
    food: { emoji: '🍣', name: 'Sushi Set' },
    friendMessage: 'Clean and fresh — light but satisfying.',
    availabilityNote: 'Sushi Atelier or Kanada-Ya nearby',
    culturalNote: 'Japanese spots cluster around Fitzrovia & Soho.',
    weatherNote: 'Great choice when you want something not too heavy.',
    source: 'local-fallback',
  },
  {
    food: { emoji: '🥙', name: 'Mezze Plate' },
    friendMessage: 'Shareable, bright flavors, and not heavy.',
    availabilityNote: 'Check Arabica Borough or a local Levantine spot',
    culturalNote: 'Londons Middle Eastern scene is strong — Borough & Edgware Road.',
    weatherNote: 'Good in any weather; easy on the stomach.',
    source: 'local-fallback',
  },
];

// NEW: Add UI for location search
function addLocationSearchUI() {
  const moodSection = document.querySelector('.mood-section') || document.querySelector('#food-tab');
  if (!moodSection) return;
  
  // Check if already added
  if (document.getElementById('location-search-box')) return;
  
  const searchHTML = `
    <div id="location-search-box" style="margin: 1rem 0; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
      <label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="search-different-area" style="width: auto; cursor: pointer;">
        <span style="font-size: 14px; color: #e5ecff;">📍 Search different area</span>
      </label>
      
      <div id="area-search-fields" style="display: none; margin-top: 0.5rem;">
        <input 
          type="text" 
          id="target-city" 
          placeholder="Neighborhood (e.g., Soho, Camden, Shoreditch)"
          style="width: 100%; padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); color: #e5ecff; font-size: 14px;"
        >
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; align-items: center;">
          <input 
            type="range" 
            id="search-radius" 
            min="1"
            max="20"
            value="5"
            style="width: 100%;"
          >
          <span id="radius-display" style="font-size: 13px; color: #94a3b8; min-width: 40px;">5km</span>
        </div>
      </div>
    </div>
    
    <div id="hidden-gems-toggle" style="margin: 0.5rem 0;">
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
        <input type="checkbox" id="prioritize-hidden-gems" style="width: auto; cursor: pointer;">
        <span style="font-size: 14px; color: #e5ecff;">💎 Prioritize hidden gems</span>
      </label>
    </div>
  `;
  
  // Insert before mood input
  const moodInput = document.getElementById('mood-input');
  if (moodInput) {
    moodInput.parentElement.insertAdjacentHTML('beforebegin', searchHTML);
    
    // Wire up events
    document.getElementById('search-different-area').addEventListener('change', (e) => {
      document.getElementById('area-search-fields').style.display = e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('search-radius').addEventListener('input', (e) => {
      document.getElementById('radius-display').textContent = `${e.target.value}km`;
    });
  }
}

export async function initializeFood(config) {
  moduleConfig = config;
  lastPicks = JSON.parse(localStorage.getItem('vfied_recent') || '[]');
  
  // Wire up core food-related events
  wireDecisionEvents();
  addMoodSuggestions();
  renderFriendChips();
  addLocationSearchUI(); // ADD THIS LINE
  
  // Expose handleDecision globally so buttons can access it
  window.VFIED.handleDecision = handleDecision;
  
  console.log('🍽️ Food module initialized');
}

function wireDecisionEvents() {
  const decideBtn = byId('decide-button');
  const detectBtn = byId('detect-mood-btn');
  const acceptBtn = byId('accept-btn');
  const tryAgainBtn = byId('try-again-btn');
  const insightsToggle = byId('insights-toggle');

  decideBtn && decideBtn.addEventListener('click', handleDecision);
  detectBtn && detectBtn.addEventListener('click', detectMood);
  acceptBtn && acceptBtn.addEventListener('click', handleAccept);
  tryAgainBtn && tryAgainBtn.addEventListener('click', handleTryAgain);

  insightsToggle && insightsToggle.addEventListener('click', () => {
    const content = byId('insights-content');
    const hidden = content.classList.contains('hidden');
    if (hidden) {
      content.classList.remove('hidden');
      insightsToggle.textContent = '🤖 Hide insights ↑';
    } else {
      content.classList.add('hidden');
      insightsToggle.textContent = '🤖 Why this choice? ↓';
    }
  });
}

function setThinking(btn, on = true) {
  try {
    const el = btn || document.getElementById('decide-button');
    if (!el) return;

    el.disabled = !!on;

    const icon = document.getElementById('button-icon');
    const text = document.getElementById('button-text');

    if (on) {
      if (icon) icon.textContent = '⏳';
      if (text) text.textContent = 'Thinking…';
    } else {
      if (icon) icon.textContent = '🎯';
      if (text) text.textContent = 'DECIDE FOR ME';
    }
  } catch (e) {
    console.warn('setThinking failed:', e);
  }
}

function getValidLocation() {
  return {
    city: 'London',
    country: 'United Kingdom',
    country_code: 'GB'
  };
}

function getMealPeriod(hour) {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'late_night';
}

function updateRecentSuggestions(suggestion) {
  const name = suggestion.food?.name;
  if (!name) return [];

  let recent = JSON.parse(localStorage.getItem('vfied_recent') || '[]');
  
  recent = recent.filter(r => r.toLowerCase() !== name.toLowerCase());
  recent.unshift(name);
  recent = recent.slice(0, 8);
  
  localStorage.setItem('vfied_recent', JSON.stringify(recent));
  lastPicks = recent;
  
  return recent;
}

export async function handleDecision() {
  const decideBtn = document.getElementById('decide-button');
  setThinking(decideBtn, true);
  
  try {
    const mood = document.getElementById('mood-input')?.value?.trim() || '';
    const selectedDietary = Array.from(document.querySelectorAll('.diet-chip.active'))
      .map(chip => chip.dataset.diet);

    // NEW: Get location search preferences
    const searchDifferentArea = document.getElementById('search-different-area')?.checked;
    const targetCity = document.getElementById('target-city')?.value?.trim();
    const searchRadius = parseInt(document.getElementById('search-radius')?.value || '5');
    const prioritizeHiddenGems = document.getElementById('prioritize-hidden-gems')?.checked;

    console.log('🎯 Making decision with:', { 
      mood, 
      dietary: selectedDietary, 
      searchDifferentArea,
      targetCity,
      searchRadius,
      prioritizeHiddenGems
    });

    const recentSuggestions = JSON.parse(localStorage.getItem('vfied_recent') || '[]');

    const payload = {
      location: getValidLocation(),
      mood_text: mood,
      dietary: selectedDietary,
      recent_suggestions: recentSuggestions,
      time_context: {
        current_hour: new Date().getHours(),
        meal_period: getMealPeriod(new Date().getHours()),
        is_weekend: [0,6].includes(new Date().getDay())
      }
    };

    // NEW: Add location flexibility
    if (searchDifferentArea && targetCity) {
      payload.search_location = {
        city: targetCity,
        country_code: 'GB'
      };
      payload.search_radius = searchRadius;
    }

    // NEW: Add hidden gems preference
    if (prioritizeHiddenGems) {
      payload.show_hidden_gems = true;
    }

    const response = await fetch(`${moduleConfig.API_BASE}/v1/quick_decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Server response:', data);
    
    if (data.success && data.decisions) {
      if (data.mood_analysis) {
        showMoodInsight(data.mood_analysis);
      }
      
      // Pass search area info to display function
      showShortlistResult(data.decisions, data.search_area);
      
      // Update recent suggestions
      data.decisions.forEach(decision => {
        updateRecentSuggestions({ food: { name: decision.name } });
      });
      
      moduleConfig.updateStatsUI({ timeSavedMin: 3 });
    } else {
      throw new Error(data.error || 'No decisions returned');
    }

  } catch (error) {
    console.error('❌ Decision error:', error);
    
    // Show fallback suggestions
    const fallbackDecisions = [
      { name: 'Local Favorite', emoji: '🍽️', explanation: 'Server unavailable - try any local spot!' },
      { name: 'Comfort Food', emoji: '🍲', explanation: 'Something warm and familiar' },
      { name: 'Quick Bite', emoji: '🥪', explanation: 'Fast and satisfying option' }
    ];
    
    showShortlistResult(fallbackDecisions);
    moduleConfig.toast(`Connection issue: ${error.message}`, 'warn');
  } finally {
    setThinking(decideBtn, false);
  }
}

function showShortlistResult(decisions, searchArea = null) {
  // Hide any single suggestion result
  const singleResult = document.getElementById('suggestion-result');
  if (singleResult) singleResult.classList.add('hidden');
  
  // Get or create shortlist section
  let section = document.getElementById('shortlist-result');
  if (!section) {
    section = document.createElement('div');
    section.id = 'shortlist-result';
    section.className = 'shortlist-result';
    const foodTab = document.getElementById('food-tab');
    if (foodTab) {
      foodTab.appendChild(section);
    }
  }
  
  // Display the decisions with restaurant info
  section.innerHTML = `
    <div style="margin:24px 20px;">
      ${searchArea ? `
        <div style="text-align:center; margin-bottom: 16px; font-size: 13px; color: #94a3b8;">
          📍 ${escapeHtml(searchArea)}
        </div>
      ` : ''}
      <h3 style="text-align:center; margin:0 0 20px 0; font-size:18px; font-weight:700; color:#a5b4fc;">Your 3 Perfect Picks</h3>
      <div style="display:grid; gap:12px;">
        ${decisions.map((d, i) => {
          const restaurant = d.restaurant || {};
          const hiddenGem = d.hidden_gem;
          
          return `
            <div class="decision-card" data-food="${escapeHtml(d.name)}" 
                 style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:16px; cursor:pointer; transition:.2s;">
              
              ${hiddenGem ? `
                <div style="display: inline-block; padding: 4px 10px; background: ${hiddenGem.color}20; border: 1px solid ${hiddenGem.color}40; border-radius: 16px; font-size: 11px; font-weight: 600; color: ${hiddenGem.color}; margin-bottom: 8px;">
                  ${hiddenGem.emoji} ${hiddenGem.label}
                </div>
              ` : ''}
              
              <div style="display:flex; align-items:start; gap:12px; margin-bottom: ${restaurant.name ? '12px' : '0'};">
                <div style="font-size:28px; flex-shrink: 0;">${d.emoji || '🍽️'}</div>
                <div style="flex:1;">
                  <div style="font-weight:700; font-size:16px; margin-bottom:4px; color:#e5ecff;">${escapeHtml(d.name)}</div>
                  <div style="font-size:13px; color:#94a3b8; line-height:1.4;">${escapeHtml(d.explanation || '')}</div>
                  ${d.price ? `<div style="font-size:13px; color:#10b981; margin-top:4px; font-weight:600;">${escapeHtml(d.price)}</div>` : ''}
                </div>
                <div style="background:rgba(16,185,129,.2); border-radius:16px; padding:4px 8px; font-size:11px; font-weight:600; color:#10b981; flex-shrink: 0;">#${i + 1}</div>
              </div>
              
              ${restaurant.name ? `
                <div style="border-top: 1px solid rgba(255,255,255,.08); padding-top: 12px; margin-top: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 13px; font-weight: 600; color: #e5ecff; margin-bottom: 2px;">${escapeHtml(restaurant.name)}</div>
                      ${restaurant.distance ? `<div style="font-size: 11px; color: #94a3b8;">📍 ${escapeHtml(restaurant.distance)}</div>` : ''}
                    </div>
                    <a 
                      href="${restaurant.link}" 
                      target="_blank"
                      onclick="event.stopPropagation()"
                      style="background: rgba(124,58,237,.3); border: 1px solid rgba(124,58,237,.5); color: #a5b4fc; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; white-space: nowrap;"
                    >
                      ${escapeHtml(restaurant.link_label || 'View')}
                    </a>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px;">
        <button onclick="window.VFIED.handleDecision()" style="padding:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:12px; color:#e5ecff; font-weight:700; cursor:pointer; font-size:14px;">🔄 New Picks</button>
        <button onclick="document.getElementById('mood-input').focus()" style="padding:12px; background:rgba(124,58,237,.2); border:1px solid rgba(124,58,237,.3); border-radius:12px; color:#a5b4fc; font-weight:700; cursor:pointer; font-size:14px;">🧠 Add Mood</button>
      </div>
    </div>
  `;
  
  section.classList.remove('hidden');
  section.style.display = 'block';
  
  // Add click handlers for cards (Google Maps fallback if no restaurant link)
  section.querySelectorAll('.decision-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking the restaurant link button
      if (e.target.tagName === 'A') return;
      
      const foodName = card.dataset.food;
      const query = encodeURIComponent(`${foodName} near London`);
      window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(255,255,255,.1)';
      card.style.borderColor = 'rgba(124,58,237,.3)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(255,255,255,.06)';
      card.style.borderColor = 'rgba(255,255,255,.12)';
    });
  });
  
  // Update decision counter
  const count = parseInt(localStorage.getItem('vfied_decisions') || '0') + 1;
  localStorage.setItem('vfied_decisions', String(count));
  const counterEl = document.getElementById('decisions-count');
  if (counterEl) counterEl.textContent = count;
  
  // Scroll into view
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showMoodInsight(moodAnalysis) {
  if (!moodAnalysis) return;
  
  const { vibes, message } = moodAnalysis;
  
  let moodInsight = document.getElementById('mood-insight');
  if (!moodInsight) {
    moodInsight = document.createElement('div');
    moodInsight.id = 'mood-insight';
    moodInsight.className = 'mood-insight-card';
    
    const moodSection = document.querySelector('.mood-section');
    if (moodSection) {
      moodSection.appendChild(moodInsight);
    }
  }
  
  const vibeBadges = (vibes || []).map(vibe => 
    `<span class="vibe-badge vibe-${vibe}">${formatVibe(vibe)}</span>`
  ).join('');
  
  moodInsight.innerHTML = `
    <div class="mood-insight-content">
      ${vibeBadges ? `<div class="vibe-badges">${vibeBadges}</div>` : ''}
      ${message ? `<div class="mood-message">${message}</div>` : ''}
    </div>
  `;
  
  moodInsight.classList.add('show');
  
  setTimeout(() => {
    moodInsight.classList.remove('show');
  }, 5000);
}

function formatVibe(vibe) {
  const vibeMap = {
    'celebration': '🎉 Celebrating',
    'hangover': '🤕 Hangover',
    'pms': '🌙 PMS',
    'date': '💕 Date Night',
    'study': '📚 Study Mode',
    'chaos': '🔥 Chaos Mode',
    'main-character': '✨ Main Character',
    'goblin': '👺 Goblin Mode',
    'heartbreak': '💔 Heartbreak',
    'payday': '💰 Payday',
    'friday': '🎊 Friday Vibes',
    'anxious': '😰 Anxious',
    'tired': '😴 Tired',
    'post-workout': '💪 Post-Workout'
  };
  
  return vibeMap[vibe] || vibe;
}

function detectMood() {
  const input = byId('mood-input');
  const val = input?.value?.trim();
  if (!val) return moduleConfig.toast('🧠 Please enter your mood first!', 'warn');
  moduleConfig.toast('🧠 Mood analyzed — using it in your next suggestion!', 'info');
  handleDecision();
}

function handleAccept() {
  hide('suggestion-result');
  moduleConfig.toast('✅ Enjoy your meal!', 'success');
}

function handleTryAgain() {
  hide('suggestion-result');
  handleDecision();
}

function renderFriendChips() {
  const container = byId('friend-chips');
  if (!container) return;

  container.innerHTML = '';
  moduleConfig.demoFriends.forEach((f) => {
    const btn = document.createElement('button');
    btn.className = 'friend-chip';
    btn.innerHTML = `
      <img class="friend-avatar" src="${f.avatar}" alt="${escapeHtml(f.name)}" />
      <span>${f.emoji} <strong>${escapeHtml(f.name)}</strong></span>
    `;
    btn.addEventListener('click', () => askFriend(f.name));
    container.appendChild(btn);
  });
}

function askFriend(name) {
  const f = moduleConfig.demoFriends.find((x) => x.name === name);
  if (!f) return;
  
  moduleConfig.toast(`💬 Asking ${f.name}: "${f.comment}"`, 'info');
  const moodInput = byId('mood-input');
  if (moodInput) {
    if (f.emoji === '🍜') moodInput.value = 'need something warming and comforting';
    else if (f.emoji === '🍣') moodInput.value = 'feeling adventurous, want something fresh';
    else moodInput.value = 'need comfort food';
  }
}

function addMoodSuggestions() {
  const moodInput = document.getElementById('mood-input');
  if (!moodInput) return;
  
  const datalist = document.createElement('datalist');
  datalist.id = 'mood-suggestions';
  datalist.innerHTML = `
    <option value="just got promoted">
    <option value="birthday celebration">
    <option value="small win today">
    <option value="hangover need help">
    <option value="pms cravings">
    <option value="date night">
    <option value="chaos mode">
    <option value="main character energy">
    <option value="goblin mode activated">
    <option value="heartbreak comfort">
    <option value="friday vibes">
    <option value="3am can't sleep">
    <option value="studying for finals">
    <option value="post workout hungry">
  `;
  
  moodInput.setAttribute('list', 'mood-suggestions');
  moodInput.parentNode.appendChild(datalist);
}

// Export public API
export { 
  handleDecision, 
  askFriend,
  detectMood,
  handleAccept,
  handleTryAgain
};