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

export async function initializeFood(config) {
  moduleConfig = config;
  lastPicks = JSON.parse(localStorage.getItem('vfied_recent') || '[]');
  
  // Wire up core food-related events
  wireDecisionEvents();
  addMoodSuggestions();
  renderFriendChips();
  
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

    console.log('🎯 Making decision with:', { mood, dietary: selectedDietary });

    const recentSuggestions = JSON.parse(localStorage.getItem('vfied_recent') || '[]');

    const response = await fetch(`${moduleConfig.API_BASE}/v1/quick_decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: getValidLocation(),
        mood_text: mood,
        dietary: selectedDietary,
        recent_suggestions: recentSuggestions,
        time_context: {
          current_hour: new Date().getHours(),
          meal_period: getMealPeriod(new Date().getHours()),
          is_weekend: [0,6].includes(new Date().getDay())
        }
      })
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
      
      showShortlistResult(data.decisions);
      
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

function showShortlistResult(decisions) {
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
  
  // Display the decisions
  section.innerHTML = `
    <div style="margin:24px 20px;">
      <h3 style="text-align:center; margin:0 0 20px 0; font-size:18px; font-weight:700; color:#a5b4fc;">Your 3 Perfect Picks</h3>
      <div style="display:grid; gap:12px;">
        ${decisions.map((d, i) => `
          <div class="decision-card" data-food="${escapeHtml(d.name)}" 
               style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:16px; cursor:pointer; transition:.2s;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="font-size:28px;">${d.emoji || '🍽️'}</div>
              <div style="flex:1;">
                <div style="font-weight:700; font-size:16px; margin-bottom:4px; color:#e5ecff;">${escapeHtml(d.name)}</div>
                <div style="font-size:13px; color:#94a3b8; line-height:1.4;">${escapeHtml(d.explanation || '')}</div>
              </div>
              <div style="background:rgba(16,185,129,.2); border-radius:16px; padding:4px 8px; font-size:11px; font-weight:600; color:#10b981;">#${i + 1}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:20px;">
        <button onclick="window.VFIED.handleDecision()" style="padding:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:12px; color:#e5ecff; font-weight:700; cursor:pointer; font-size:14px;">🔄 New Picks</button>
        <button onclick="document.getElementById('mood-input').focus()" style="padding:12px; background:rgba(124,58,237,.2); border:1px solid rgba(124,58,237,.3); border-radius:12px; color:#a5b4fc; font-weight:700; cursor:pointer; font-size:14px;">🧠 Add Mood</button>
      </div>
    </div>
  `;
  
  section.classList.remove('hidden');
  section.style.display = 'block';
  
  // Add click handlers
  section.querySelectorAll('.decision-card').forEach(card => {
    card.addEventListener('click', () => {
      const foodName = card.dataset.food;
      const query = encodeURIComponent(`${foodName} near London`);
      window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
    });
    
    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(255,255,255,.1)';
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(255,255,255,.06)';
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