import { CONFIG } from '../config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase.js';

export const API_BASE = CONFIG.API_BASE;
// VFIED Unified Main (Food + Social + Travel + Events) — with Toasts, Skeletons, Fallback & Stats

// ---- Robust API base resolution ----
// const qpApi = new URLSearchParams(location.search).get('api');
// if (qpApi) localStorage.setItem('vfied_api', qpApi);

// const storedApi = localStorage.getItem('vfied_api');
// const runtimeApi = (typeof window !== 'undefined' && window.__API__) || ''; // '' = same-origin
// export const API_BASE = (qpApi || storedApi || runtimeApi || '').replace(/\/$/, '');

console.log('API_BASE ->', API_BASE || '(same-origin)');

// ---------------- Demo / Fallback Data ----------------
const demoFriends = [
  { name: 'Sarah', comment: '🔥 Best ramen spot ever!', emoji: '🍜', avatar: 'https://i.pravatar.cc/80?img=32' },
  { name: 'James', comment: '💯 Always go for the sushi here', emoji: '🍣', avatar: 'https://i.pravatar.cc/80?img=12' },
  { name: 'Aisha', comment: '👌 Perfect comfort food when tired', emoji: '🍲', avatar: 'https://i.pravatar.cc/80?img=58' },
];

// If /v1/recommend fails, we'll pick one of these locally:
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
// keep last few dish names to avoid repeats
const LAST_LIMIT = 6;
let lastPicks = JSON.parse(localStorage.getItem('vfied_recent') || '[]');
function rememberPick(name) {
  if (!name) return;
  lastPicks = [name, ...lastPicks.filter(n => n.toLowerCase() !== name.toLowerCase())].slice(0, LAST_LIMIT);
  localStorage.setItem('vfied_recent', JSON.stringify(lastPicks));
}

// ---------------- App State ----------------
let localGems = [];
let travelLists = {};
let eventItems = [];
let currentTab = 'tabTravel';
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  injectRuntimeStyles();
  mountToastHost();

  wireCoreEvents();
  wireTabs();

  addMoodSuggestions();

  renderFriendChips();
  loadLocalGems();
  loadTravelLists();
  loadEvents();

  updateStatsUI(); // show stored counters if any
  initializeAuth();
  addEnhancedStyles();
  
  // Add auth buttons to header if they don't exist
  addAuthButtonsToHeader();

  console.log('🚀 VFIED unified main loaded');
});

// ---------------- Core One-Button Flow ----------------
function wireCoreEvents() {
  const decideBtn = byId('decide-button');
  const detectBtn = byId('detect-mood-btn');
  const acceptBtn = byId('accept-btn');
  const tryAgainBtn = byId('try-again-btn');
  const insightsToggle = byId('insights-toggle');
  const submitEventBtn = byId('submit-event-btn');

  decideBtn && decideBtn.addEventListener('click', handleDecision);
  detectBtn && detectBtn.addEventListener('click', detectMood);
  acceptBtn && acceptBtn.addEventListener('click', handleAccept);
  tryAgainBtn && tryAgainBtn.addEventListener('click', handleTryAgain);
  submitEventBtn && submitEventBtn.addEventListener('click', openEventSubmissionModal);


  insightsToggle &&
    insightsToggle.addEventListener('click', () => {
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

  // Local Gems modal
  const seeMoreBtn = byId('see-more-gems');
  const modal = byId('gems-modal');
  const closeBtn = byId('gems-modal-close');

  seeMoreBtn &&
    seeMoreBtn.addEventListener('click', () => {
      populateGemsModal();
      openModal(modal);
    });

  closeBtn && closeBtn.addEventListener('click', () => closeModal(modal));
  modal && modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
}

// Toggle the "thinking" state of the Decide button
function setThinking(btn, on = true) {
  try {
    // accept element or lookup by id
    const el = btn || document.getElementById('decide-button');
    if (!el) return;

    // disable/enable for UX
    el.disabled = !!on;

    // update icon/text if present
    const icon = document.getElementById('button-icon');   // 🎯 span
    const text = document.getElementById('button-text');   // DECIDE FOR ME span

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

// --- Quick Decision helpers ---
async function makeQuickDecision(payload) {
  const r = await fetch(`${API_BASE}/v1/quick_decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new Error(`[quick_decision] ${r.status} ${txt}`);
  }
  return r.json();
}

function quickDecisionToSuggestion(qdJson) {
  const list = Array.isArray(qdJson?.decisions) ? qdJson.decisions : [];
  if (!list.length) return null;

  const avoid = new Set(lastPicks.map(n => n.toLowerCase()));
  const fresh = list.filter(d => d?.name && !avoid.has(d.name.toLowerCase()));
  const pick = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)]
                            : list[Math.floor(Math.random() * list.length)];

  return {
    food: { name: pick.name, emoji: pick.emoji || '🍽️' },
    friendMessage: pick.explanation || 'Solid local pick.',
    source: 'quick'
  };
}
function getValidLocation() {
  return {
    city: 'London',
    country: 'United Kingdom',
    country_code: 'GB'
  };
}

function updateRecentSuggestions(suggestion) {
  const name = suggestion.food?.name;
  if (!name) return [];

  let recent = JSON.parse(localStorage.getItem('vfied_recent') || '[]');
  
  // Remove if already exists, then add to front
  recent = recent.filter(r => r.toLowerCase() !== name.toLowerCase());
  recent.unshift(name);
  recent = recent.slice(0, 8); // Keep last 8
  
  localStorage.setItem('vfied_recent', JSON.stringify(recent));
  console.log('📝 Updated recent suggestions:', recent);
  
  return recent;
}
function getMealPeriod(hour) {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'late_night';
}

async function handleDecision() {
  const decideBtn = document.getElementById('decide-button');
  setThinking(decideBtn, true);
  
  try {
    const mood = document.getElementById('mood-input')?.value?.trim() || '';
    const selectedDietary = Array.from(document.querySelectorAll('.diet-chip.active'))
      .map(chip => chip.dataset.diet);

    console.log('🎯 Making decision with:', { mood, dietary: selectedDietary });

    const recentSuggestions = JSON.parse(localStorage.getItem('vfied_recent') || '[]');

    const response = await fetch(`${API_BASE}/v1/quick_decision`, {
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
      
      // FIXED: Direct call to the global vfiedApp instance
      if (typeof window.vfiedApp !== 'undefined' && typeof window.vfiedApp.showShortlistResult === 'function') {
        window.vfiedApp.showShortlistResult(data.decisions);
      } else {
        // Fallback: create the display directly
        displayShortlistFallback(data.decisions);
      }
      
      // Update recent suggestions
      data.decisions.forEach(decision => {
        updateRecentSuggestions({ food: { name: decision.name } });
      });
      
      incrementStats({ timeSavedMin: 3 });
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
    
    if (typeof window.vfiedApp !== 'undefined' && typeof window.vfiedApp.showShortlistResult === 'function') {
      window.vfiedApp.showShortlistResult(fallbackDecisions);
    } else {
      displayShortlistFallback(fallbackDecisions);
    }
    
    toast(`Connection issue: ${error.message}`, 'warn');
  } finally {
    setThinking(decideBtn, false);
  }
}

// Add this fallback display function
function displayShortlistFallback(decisions) {
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
        <button onclick="handleDecision()" style="padding:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:12px; color:#e5ecff; font-weight:700; cursor:pointer; font-size:14px;">🔄 New Picks</button>
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
  });
  
  // Update decision counter
  const count = parseInt(localStorage.getItem('vfied_decisions') || '0') + 1;
  localStorage.setItem('vfied_decisions', String(count));
  const counterEl = document.getElementById('decisions-count');
  if (counterEl) counterEl.textContent = count;
}

// Helper function
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}


function showMoodInsight(moodAnalysis) {
  if (!moodAnalysis) return;
  
  const { vibes, message } = moodAnalysis;
  
  // Create or update mood insight element
  let moodInsight = document.getElementById('mood-insight');
  if (!moodInsight) {
    moodInsight = document.createElement('div');
    moodInsight.id = 'mood-insight';
    moodInsight.className = 'mood-insight-card';
    
    // Insert after mood input section
    const moodSection = document.querySelector('.mood-section');
    if (moodSection) {
      moodSection.appendChild(moodInsight);
    }
  }
  
  // Build vibe badges
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
  
  // Auto-hide after 5 seconds
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
function showSuggestion(s) {
  show('suggestion-result');

  setText('result-emoji', s.food?.emoji || '🍽️');
  setText('result-name', s.food?.name || 'Something delicious');
  
  // NEW: Add mood-specific messaging
  let description = s.friendMessage || s.reasoning || 'Perfect for your mood!';
  if (s.moodVibe) {
    description = `${description} (Perfect for ${formatVibe(s.moodVibe)})`;
  }
  setText('result-description', description);
  
  setText('restaurant-info', s.availabilityNote || '');

  // insights
  setHTML('cultural-note', s.culturalNote ? `<strong>🌍 Cultural insight</strong><br>${s.culturalNote}` : '');
  setHTML('personal-note', s.personalNote ? `<strong>🧠 Personal note</strong><br>${s.personalNote}` : '');
  setHTML('weather-note', s.weatherNote ? `<strong>🌤️ Weather</strong><br>${s.weatherNote}` : '');

  // social
  renderSocialSignals(s);

  updateContext('🎉 Perfect match found! How does this sound?');

  rememberPick(s.food?.name);
}

function handleAccept() {
  hide('suggestion-result');
  updateContext('🎉 Decision made! Ready for your next food adventure.');
  toast('✅ Enjoy your meal!', 'success');
}

function handleTryAgain() {
  hide('suggestion-result');
  handleDecision();
}

// ---------------- Social Layer ----------------
function renderFriendChips() {
  const container = byId('friend-chips');
  if (!container) return;

  container.innerHTML = '';
  demoFriends.forEach((f) => {
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
  const f = demoFriends.find((x) => x.name === name);
  if (!f) return;
  toast(`💬 Asking ${f.name}: "${f.comment}"`, 'info');
  const moodInput = byId('mood-input');
  if (moodInput) {
    if (f.emoji === '🍜') moodInput.value = 'need something warming and comforting';
    else if (f.emoji === '🍣') moodInput.value = 'feeling adventurous, want something fresh';
    else moodInput.value = 'need comfort food';
  }
}

function addSocialSignals(suggestion) {
  const foodName = (suggestion.food?.name || '').toLowerCase();
  let friend = demoFriends[Math.floor(Math.random() * demoFriends.length)];
  if (foodName.includes('ramen') || foodName.includes('noodle')) friend = demoFriends[0];
  if (foodName.includes('sushi') || foodName.includes('japanese')) friend = demoFriends[1];

  suggestion.socialSignal = {
    type: 'friend',
    friend,
    message: `${friend.name}: "${friend.comment}"`,
  };

  if (localGems.length) {
    const g = localGems[Math.floor(Math.random() * localGems.length)];
    suggestion.localSignal = { type: 'local_list', list: g, message: `Popular in "${g.name}" (${g.area})` };
  }
  return suggestion;
}

function renderSocialSignals(s) {
  const slot = byId('social-signals');
  if (!slot) return;

  let html = '';
  if (s.socialSignal) {
    html += `
      <div class="social-signal friend-signal">
        <span class="signal-icon">👥</span>
        <span class="signal-text">${s.socialSignal.message}</span>
      </div>`;
  }
  if (s.localSignal) {
    html += `
      <div class="social-signal local-signal">
        <span class="signal-icon">📍</span>
        <span class="signal-text">${s.localSignal.message}</span>
      </div>`;
  }
  slot.innerHTML = html;
}

// ---------------- Local Gems ----------------
async function loadLocalGems() {
  try {
    const url = `/data/local_lists.json`;
    const res = await fetch(url, { cache: 'no-store' });
    localGems = await res.json();
  } catch {
    localGems = []; // fallback
  }
  renderLocalGemsGrid();
}

function renderLocalGemsGrid() {
  const grid = byId('local-gems-grid');
  if (!grid) return;

  const first = localGems.slice(0, 8);
  grid.innerHTML = '';
  first.forEach((g) => {
    const card = document.createElement('div');
    card.className = 'gem-card';
    card.innerHTML = `
      <div class="gem-emoji">${g.emoji}</div>
      <div class="gem-name">${escapeHtml(g.name)}</div>
      <div class="gem-area">${escapeHtml(g.area)}</div>
    `;
    card.addEventListener('click', () => exploreGem(g.name));
    grid.appendChild(card);
  });
}

function exploreGem(name) {
  const g = localGems.find((x) => x.name === name);
  if (!g) return;
  const moodInput = byId('mood-input');
  if (moodInput) moodInput.value = `want something from ${g.name} list in ${g.area}`;
  handleDecision();
}

function populateGemsModal() {
  const list = byId('gems-modal-list');
  if (!list) return;
  list.innerHTML = localGems
    .map(
      (g) => `
      <li>
        <span style="font-size:18px;margin-right:6px;">${g.emoji}</span>
        <strong>${g.name}</strong> <span style="opacity:.8">• ${g.area}</span>
      </li>`
    )
    .join('');
}

// ---------------- Travel ----------------
async function loadTravelLists() {
  try {
    // const url = API_BASE ? `${API_BASE}/data/travel_lists.json` : `/data/travel_lists.json`;
    const url = `/data/travel_lists.json`;
    const res = await fetch(url, { cache: 'no-store' });
    travelLists = await res.json();
  } catch {
    travelLists = {};
  }
  renderTravelCities();
  renderTravelGrid();
}

function renderTravelCities() {
  const select = byId('travel-city-select');
  if (!select) return;

  const cities = Object.keys(travelLists);
  select.innerHTML = cities.map((c) => `<option value="${c}">${c}</option>`).join('');

  select.addEventListener('change', () => renderTravelGrid());
}

function renderTravelGrid() {
  const city = byId('travel-city-select')?.value || Object.keys(travelLists)[0];
  const items = (travelLists[city] || []).slice(0, 10);
  const grid = byId('travel-grid');
  if (!grid) return;

  grid.innerHTML = '';
  items.forEach((t) => {
    const card = document.createElement('div');
    card.className = 'travel-card';
    card.innerHTML = `
      <div class="travel-emoji">${t.emoji}</div>
      <div class="travel-body">
        <div class="travel-title">${escapeHtml(t.name)}</div>
        <div class="travel-note">${escapeHtml(t.note || '')}</div>
      </div>
    `;
    card.addEventListener('click', () => tryTravel(city, t.name));
    grid.appendChild(card);
  });
}

function tryTravel(city, itemName) {
  const moodInput = byId('mood-input');
  if (moodInput) moodInput.value = `travel mode: try ${itemName} in ${city}`;
  handleDecision();
}

// ---------------- Events Near Me ----------------
async function loadEvents() {
  try {
    const url = `/data/events.json`;
    const res = await fetch(url, { cache: 'no-store' });
    eventItems = await res.json();
  } catch {
    eventItems = [];
  }
  renderEvents();
}

function addSubmitEventButton() {
  const eventsGrid = byId('events-grid');
  if (!eventsGrid) return;
  
  // Check if button already exists
  if (byId('submit-event-btn')) return;
  
  // Create submit button
  const submitCard = document.createElement('div');
  submitCard.className = 'event-card submit-event-card';
  submitCard.innerHTML = `
    <div class="event-badge">✨</div>
    <div class="event-body">
      <div class="event-title">Submit Your Event</div>
      <div class="event-meta">Share your event with the VFIED community</div>
      <div class="event-cta">
        <button id="submit-event-btn" class="btn btn-primary">Submit Event</button>
      </div>
    </div>
  `;
  
  // Insert at the beginning of the grid
  eventsGrid.insertBefore(submitCard, eventsGrid.firstChild);
}

function renderEvents() {
  const grid = byId('events-grid');
  if (!grid) return;

  grid.innerHTML = '';
  eventItems.forEach((e) => {
    const card = document.createElement('div');
    card.className = 'event-card';

    const badge = document.createElement('div');
    badge.className = 'event-badge';
    badge.textContent = e.emoji;

    const body = document.createElement('div');
    body.className = 'event-body';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = e.title;

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = `${e.date} • ${e.area} • ${e.price || 'Free'}`;

    const cta = document.createElement('div');
    cta.className = 'event-cta';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'insights-toggle';
    detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => goEvent(e.title));

    const mapsBtn = document.createElement('button');
    mapsBtn.className = 'insights-toggle';
    mapsBtn.textContent = 'Directions';
    mapsBtn.addEventListener('click', () => goMaps(encodeURIComponent(e.map || e.title)));

    cta.append(detailsBtn, mapsBtn);
    body.append(title, meta, cta);
    card.append(badge, body);
    grid.appendChild(card);
  });

  addSubmitEventButton();

}

function goEvent(title) {
  toast(`🎪 ${title}\n(Integrate ticket link or detail view here)`, 'info');
}
function goMaps(q) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
}

// ---------------- Tabs ----------------
function wireTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const toShow = btn.dataset.tab;
      document.querySelectorAll('.tabpanel').forEach((p) => p.classList.add('hidden'));
      byId(toShow)?.classList.remove('hidden');
      currentTab = toShow;
    });
  });
}

// ---------------- Mood ----------------
function detectMood() {
  const input = byId('mood-input');
  const val = input?.value?.trim();
  if (!val) return toast('🧠 Please enter your mood first!', 'warn');
  toast('🧠 Mood analyzed — using it in your next suggestion!', 'info');
  handleDecision();
}

// ---------------- Stats ----------------
function incrementStats({ timeSavedMin = 2 } = {}) {
  const raw = localStorage.getItem('vfied_stats');
  const stats = raw ? JSON.parse(raw) : { totalDecisions: 0, timeSaved: 0 };
  stats.totalDecisions += 1;
  stats.timeSaved += timeSavedMin;
  localStorage.setItem('vfied_stats', JSON.stringify(stats));
  updateStatsUI();
}

function updateStatsUI() {
  const raw = localStorage.getItem('vfied_stats');
  const stats = raw ? JSON.parse(raw) : { totalDecisions: 0, timeSaved: 0 };
  setText('decisions-count', stats.totalDecisions);
  setText('time-saved', stats.timeSaved);
}

// ---------------- Skeleton UI ----------------
function showSuggestionSkeleton() {
  // show the skeleton section and hide the real result container
  const skel = byId('suggestion-skeleton');
  const res = byId('suggestion-result');
  if (skel) skel.classList.remove('hidden');
  if (res) res.classList.add('hidden');
}

function hideSuggestionSkeleton() {
  // hide the skeleton; showSuggestion() will reveal the real result
  const skel = byId('suggestion-skeleton');
  if (skel) skel.classList.add('hidden');
}

// ---------------- Toasts ----------------
function mountToastHost() {
  if (byId('vfied-toast-host')) return;
  const host = document.createElement('div');
  host.id = 'vfied-toast-host';
  document.body.appendChild(host);
}
function toast(msg, type = 'info') {
  const host = byId('vfied-toast-host');
  if (!host) return console.log(msg);
  const el = document.createElement('div');
  el.className = `vfied-toast ${type}`;
  el.textContent = msg;
  host.appendChild(el);
  // animate in
  requestAnimationFrame(() => el.classList.add('show'));
  // auto remove
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => host.removeChild(el), 250);
  }, 2600);
}

// ---------------- Runtime Styles (toasts + skeleton) ----------------
function injectRuntimeStyles() {
  if (document.getElementById('vfied-runtime-styles')) return;
  const css = `
  /* Existing styles... */
  
  /* Mood Insight Card */
  .mood-insight-card {
    background: rgba(124, 58, 237, 0.1);
    border: 1px solid rgba(124, 58, 237, 0.3);
    border-radius: 12px;
    padding: 12px;
    margin-top: 12px;
    opacity: 0;
    transform: translateY(-10px);
    transition: all 0.3s ease;
    display: none;
  }
  
  .mood-insight-card.show {
    display: block;
    opacity: 1;
    transform: translateY(0);
  }
  
  .vibe-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }
  
  .vibe-badge {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 600;
  }
  
  .vibe-celebration { background: rgba(255, 215, 0, 0.2); border-color: gold; }
  .vibe-hangover { background: rgba(255, 99, 71, 0.2); border-color: tomato; }
  .vibe-date { background: rgba(255, 105, 180, 0.2); border-color: hotpink; }
  .vibe-chaos { background: rgba(255, 69, 0, 0.2); border-color: orangered; }
  .vibe-main-character { background: rgba(138, 43, 226, 0.2); border-color: blueviolet; }
  
  .mood-message {
    color: #e5ecff;
    font-size: 14px;
    font-weight: 500;
    font-style: italic;
  }
  
  /* Rest of existing styles... */
  `;
  
  const style = document.createElement('style');
  style.id = 'vfied-runtime-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

// ---------------- Utils ----------------
function byId(id) {
  const el = document.getElementById(id);
  // console.warn on missing but don't spam constantly
  return el;
}
function setText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}
function setHTML(id, html) {
  const el = byId(id);
  if (el) el.innerHTML = html;
}
function show(id) {
  const el = byId(id);
  if (el) el.classList.remove('hidden');
}
function hide(id) {
  const el = byId(id);
  if (el) el.classList.add('hidden');
}
function updateContext(msg) {
  setText('context-info', msg);
}
function sample(a) {
  return a[Math.floor(Math.random() * a.length)];
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}
// User prefs (stub for now)
function getUserPrefs() {
  try {
    return JSON.parse(localStorage.getItem('vfied_prefs') || '{}');
  } catch {
    return {};
  }
}

// Modal helpers
function openModal(m) {
  if (!m) return;
  m.setAttribute('aria-hidden', 'false');
  m.classList.add('open');
}
function closeModal(m) {
  if (!m) return;
  m.setAttribute('aria-hidden', 'true');
  m.classList.remove('open');
}

// Expose helpers for inline onclick
window.VFIED = {
  askFriend,
  exploreGem,
  tryTravel,
  goEvent,
  goMaps,
};

function addMoodSuggestions() {
  const moodInput = document.getElementById('mood-input');
  if (!moodInput) return;
  
  // Add example moods as datalist
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

window.VFIED = {
  ...window.VFIED,
  setMood: function(moodText) {
    const input = document.getElementById('mood-input');
    if (input) {
      input.value = moodText;
      // Optional: auto-trigger decision
      document.getElementById('decide-button')?.click();
    }
  }
};
function showShortlistResult(decisions) {
  // Get or create the shortlist result section
  let section = document.getElementById('shortlist-result');
  if (!section) {
    section = document.createElement('div');
    section.id = 'shortlist-result';
    section.className = 'shortlist-result';
    
    // Insert after the decide button
    const decideBtn = document.getElementById('decide-button');
    if (decideBtn && decideBtn.parentNode) {
      decideBtn.parentNode.insertBefore(section, decideBtn.nextSibling);
    }
  }
  
  // Render the actual decisions from API
  section.innerHTML = `
    <div style="margin:24px 20px;">
      <h3 style="text-align:center; margin:0 0 20px 0; font-size:18px; font-weight:700; color:#a5b4fc;">Your 3 Perfect Picks</h3>
      <div style="display:grid; gap:12px;">
        ${decisions.map((d, i) => `
          <div class="decision-card" data-food="${escapeHtml(d.name)}" 
               style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:16px; cursor:pointer; transition:.2s;"
               onmouseover="this.style.background='rgba(255,255,255,.1)'" 
               onmouseout="this.style.background='rgba(255,255,255,.06)'">
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
        <button id="shuffle-picks" style="padding:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.15); border-radius:12px; color:#e5ecff; font-weight:700; cursor:pointer; font-size:14px;">🔄 New Picks</button>
        <button id="add-mood-context" style="padding:12px; background:rgba(124,58,237,.2); border:1px solid rgba(124,58,237,.3); border-radius:12px; color:#a5b4fc; font-weight:700; cursor:pointer; font-size:14px;">🧠 Add Mood</button>
      </div>
    </div>
  `;
  
  // Show the section
  section.classList.remove('hidden');
  section.style.display = 'block';
  
  // Add event listeners
  const shuffleBtn = document.getElementById('shuffle-picks');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      // Trigger new decision
      document.getElementById('decide-button')?.click();
    });
  }
  
  const addMoodBtn = document.getElementById('add-mood-context');
  if (addMoodBtn) {
    addMoodBtn.addEventListener('click', () => {
      const moodInput = document.getElementById('mood-input');
      if (moodInput) {
        moodInput.focus();
        moodInput.placeholder = 'Tell me your specific mood for better picks...';
      }
    });
  }
  
  // Add click handlers to each decision card
  document.querySelectorAll('.decision-card').forEach(card => {
    card.addEventListener('click', () => {
      const foodName = card.dataset.food;
      // Open directions or show more details
      const query = encodeURIComponent(`${foodName} near London`);
      window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
    });
  });
  
  // Scroll into view
  section.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Helper function if not already present
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

function openEventSubmissionModal() {
  // Create modal if it doesn't exist
  let modal = byId('event-submit-modal');
  if (!modal) {
    createEnhancedEventSubmissionModal();
    modal = byId('event-submit-modal');
  }
  openModal(modal);
}

function createEnhancedEventSubmissionModal() {
  const modal = document.createElement('div');
  modal.id = 'event-submit-modal';
  modal.className = 'modal enhanced-event-modal';
  modal.setAttribute('aria-hidden', 'true');
  
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content event-submit-content">
        <div class="modal-header">
          <h2>Submit Your Event</h2>
          <button class="modal-close" id="event-submit-close">&times;</button>
        </div>
        
        ${!currentUser ? `
          <div class="auth-prompt">
            <div class="auth-prompt-content">
              <h4>Sign in for better experience</h4>
              <p>Creating a profile helps us prevent spam and gives your events more credibility</p>
              <button onclick="showAuthModal('register')" class="btn btn-secondary">Create Profile</button>
              <button onclick="showAuthModal('login')" class="btn btn-secondary">Sign In</button>
              <a href="#" onclick="this.closest('.auth-prompt').style.display='none'">Submit without profile</a>
            </div>
          </div>
        ` : ''}
        
        <div id="event-success-message" class="success-message" style="display: none;">
          <h4 id="success-title">Event Submitted Successfully!</h4>
          <p id="success-message">Your event will be reviewed and appear in the app within 24-48 hours.</p>
        </div>
        
        <form id="eventSubmitForm" class="enhanced-event-form">
          <!-- Event poster upload -->
          <div class="form-group">
            <label for="event-poster">Event Poster (Optional)</label>
            <div class="image-upload-area" onclick="document.getElementById('event-poster').click()">
              <div class="upload-placeholder">
                <div class="upload-icon">📸</div>
                <div class="upload-text">Click to add event poster</div>
                <div class="upload-hint">JPG, PNG up to 5MB</div>
              </div>
              <img id="poster-preview" class="poster-preview" style="display: none;">
            </div>
            <input type="file" id="event-poster" name="poster" accept="image/*" style="display: none;">
          </div>

          <div class="form-group">
            <label for="event-title">Event Title *</label>
            <input type="text" id="event-title" name="title" required placeholder="e.g., Italian Food Festival">
          </div>

          <div class="form-group">
            <label for="event-description">Description *</label>
            <textarea id="event-description" name="description" required placeholder="Tell people what makes your event special... (minimum 30 characters)"></textarea>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="event-category">Category *</label>
              <select id="event-category" name="category" required>
                <option value="">Select category</option>
                <option value="food">Food & Dining</option>
                <option value="music">Music & Entertainment</option>
                <option value="culture">Culture & Arts</option>
                <option value="market">Market & Shopping</option>
                <option value="nightlife">Nightlife</option>
              </select>
            </div>

            <div class="form-group">
              <label for="event-price">Price</label>
              <input type="text" id="event-price" name="price" placeholder="Free, £10, £5-15, etc.">
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="event-date">Date *</label>
              <input type="date" id="event-date" name="date" required>
            </div>

            <div class="form-group">
              <label for="event-time">Time</label>
              <input type="time" id="event-time" name="time">
            </div>
          </div>

          <!-- Enhanced location search with Google Places -->
          <div class="form-group">
            <label for="venue-search">Venue/Location * (Start typing to search)</label>
            <input type="text" id="venue-search" name="venue_search" required 
                   placeholder="Start typing venue name or address..."
                   autocomplete="off">
            <div id="venue-suggestions" class="venue-suggestions"></div>
            <input type="hidden" id="selected-place-id" name="place_id">
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label for="event-city">City *</label>
              <input type="text" id="event-city" name="city" required placeholder="London, Nairobi, etc.">
            </div>

            <div class="form-group">
              <label for="event-country">Country *</label>
              <select id="event-country" name="country" required>
                <option value="">Select country</option>
                <option value="GB">United Kingdom</option>
                <option value="KE">Kenya</option>
                <option value="US">United States</option>
                <option value="NG">Nigeria</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="IT">Italy</option>
                <option value="JP">Japan</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada</option>
              </select>
            </div>
          </div>

          ${!currentUser ? `
            <div class="form-grid">
              <div class="form-group">
                <label for="contact-name">Your Name *</label>
                <input type="text" id="contact-name" name="contact_name" required>
              </div>

              <div class="form-group">
                <label for="contact-email">Contact Email *</label>
                <input type="email" id="contact-email" name="contact_email" required>
              </div>
            </div>
          ` : ''}

          <button type="submit" class="btn btn-primary" id="submitEventBtn">
            <span id="submitEventText">Submit Event</span>
          </button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Initialize enhanced features
  initializeImageUpload();
  initializeVenueSearch();
  
  // Add event listeners
  const closeBtn = document.getElementById('event-submit-close');
  const form = document.getElementById('eventSubmitForm');
  
  closeBtn && closeBtn.addEventListener('click', () => closeModal(modal));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });
  
  form && form.addEventListener('submit', handleEnhancedEventSubmission);
}

function initializeImageUpload() {
  const fileInput = document.getElementById('event-poster');
  const preview = document.getElementById('poster-preview');
  const placeholder = document.querySelector('.upload-placeholder');
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });
}

let venueSearchTimeout;
function initializeVenueSearch() {
  const searchInput = document.getElementById('venue-search');
  const suggestionsDiv = document.getElementById('venue-suggestions');
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(venueSearchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      suggestionsDiv.innerHTML = '';
      return;
    }
    
    venueSearchTimeout = setTimeout(() => {
      searchPlaces(query);
    }, 300);
  });
}

async function searchPlaces(query) {
  const suggestionsDiv = document.getElementById('venue-suggestions');
  const city = document.getElementById('event-city').value || 'London';
  
  try {
    suggestionsDiv.innerHTML = '<div class="loading-suggestion">Searching venues...</div>';
    
    const response = await fetch(`${API_BASE}/v1/places/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
    const data = await response.json();
    
    if (data.success && data.suggestions.length > 0) {
      suggestionsDiv.innerHTML = data.suggestions.map(place => `
        <div class="venue-suggestion" onclick="selectVenue('${place.place_id}', '${escapeHtml(place.name)}', '${escapeHtml(place.formatted_address)}')">
          <div class="venue-name">${escapeHtml(place.name)}</div>
          <div class="venue-address">${escapeHtml(place.formatted_address)}</div>
          ${place.rating ? `<div class="venue-rating">⭐ ${place.rating}</div>` : ''}
        </div>
      `).join('');
    } else {
      suggestionsDiv.innerHTML = '<div class="no-suggestions">No venues found. Try a different search term.</div>';
    }
    
  } catch (error) {
    console.error('Venue search error:', error);
    suggestionsDiv.innerHTML = '<div class="error-suggestion">Search temporarily unavailable</div>';
  }
}

function selectVenue(placeId, name, address) {
  const searchInput = document.getElementById('venue-search');
  const suggestionsDiv = document.getElementById('venue-suggestions');
  const placeIdInput = document.getElementById('selected-place-id');
  
  searchInput.value = name;
  placeIdInput.value = placeId;
  suggestionsDiv.innerHTML = '';
  
  // Extract city from address if possible
  const addressParts = address.split(', ');
  if (addressParts.length > 1) {
    const cityInput = document.getElementById('event-city');
    if (!cityInput.value) {
      // Try to set city from address
      cityInput.value = addressParts[addressParts.length - 2] || 'London';
    }
  }
}

async function handleEnhancedEventSubmission(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitEventBtn');
  const submitText = document.getElementById('submitEventText');
  const successMessage = document.getElementById('event-success-message');
  const successTitle = document.getElementById('success-title');
  const successMsg = document.getElementById('success-message');
  const form = document.getElementById('eventSubmitForm');
  
  // Set loading state
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="loading-spinner"></span>Submitting...';
  
  try {
    // Create FormData to handle file upload
    const formData = new FormData();
    
    // Get form data
    const title = document.getElementById('event-title').value;
    const description = document.getElementById('event-description').value;
    const venue = document.getElementById('venue-search').value;
    const city = document.getElementById('event-city').value;
    const country = document.getElementById('event-country').value;
    const date = document.getElementById('event-date').value;
    const time = document.getElementById('event-time').value;
    const category = document.getElementById('event-category').value;
    const price = document.getElementById('event-price').value;
    const placeId = document.getElementById('selected-place-id').value;
    
    // Add basic fields
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', JSON.stringify({
      venue: venue,
      city: city,
      country_code: country
    }));
    formData.append('date', date);
    formData.append('time', time || '');
    formData.append('category', category);
    formData.append('price', price || 'Free');
    formData.append('place_id', placeId);
    
    // Add user info
    if (currentUser) {
      formData.append('user_id', currentUser.id);
      formData.append('contact_name', currentUser.name);
      formData.append('contact_email', currentUser.email);
    } else {
      formData.append('contact_name', document.getElementById('contact-name').value);
      formData.append('contact_email', document.getElementById('contact-email').value);
    }
    
    // Add poster image if uploaded
    const posterFile = document.getElementById('event-poster').files[0];
    if (posterFile) {
      formData.append('poster', posterFile);
    }

    const response = await fetch(`${API_BASE}/v1/events/submit`, {
      method: 'POST',
      body: formData // Don't set Content-Type header for FormData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Show success message
      if (result.auto_approved) {
        successTitle.textContent = '🎉 Event Published!';
        successMsg.textContent = 'Your event was automatically approved and is now live in the app!';
      } else {
        successTitle.textContent = 'Event Submitted Successfully!';
        successMsg.textContent = result.message || 'Your event will be reviewed within 24-48 hours.';
      }
      
      successMessage.style.display = 'block';
      form.style.display = 'none';
      
      // Show toast
      toast(
        result.auto_approved 
          ? 'Event published immediately! 🚀' 
          : 'Event submitted for review ✅', 
        'success'
      );
      
      // Update stats
      incrementStats({ timeSavedMin: 0 });
      
      // Auto-close modal after 4 seconds
      setTimeout(() => {
        const modal = document.getElementById('event-submit-modal');
        closeModal(modal);
        
        // Reset form for next time
        setTimeout(() => {
          form.style.display = 'block';
          successMessage.style.display = 'none';
          form.reset();
          
          // Reset image preview
          const preview = document.getElementById('poster-preview');
          const placeholder = document.querySelector('.upload-placeholder');
          if (preview && placeholder) {
            preview.style.display = 'none';
            placeholder.style.display = 'block';
          }
        }, 500);
      }, 4000);
      
    } else {
      throw new Error(result.error || 'Failed to submit event');
    }

  } catch (error) {
    console.error('Enhanced event submission error:', error);
    toast(`Failed to submit event: ${error.message}`, 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitText.textContent = 'Submit Event';
  }
}
// =====================================================
// 1. USER AUTHENTICATION SYSTEM
// =====================================================

function initializeAuth() {
  // Check for stored user session
  const storedUser = localStorage.getItem('vfied_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateAuthUI();
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      localStorage.removeItem('vfied_user');
    }
  }
}

function updateAuthUI() {
  const authSection = document.getElementById('auth-section');
  const userProfile = document.getElementById('user-profile');
  
  if (currentUser) {
    // Show user profile, hide auth buttons
    if (authSection) authSection.style.display = 'none';
    if (userProfile) {
      userProfile.style.display = 'block';
      userProfile.innerHTML = `
        <div class="user-profile-card">
          <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(currentUser.name)}</div>
            <div class="user-type">${escapeHtml(currentUser.type)}</div>
          </div>
          <button onclick="logout()" class="logout-btn">Logout</button>
        </div>
      `;
    }
  } else {
    // Show auth buttons, hide user profile
    if (authSection) authSection.style.display = 'block';
    if (userProfile) userProfile.style.display = 'none';
  }
}

async function showAuthModal(mode = 'login') {
  const modal = document.createElement('div');
  modal.className = 'modal auth-modal';
  modal.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content auth-content">
        <div class="modal-header">
          <h2 id="auth-title">${mode === 'login' ? 'Welcome Back' : 'Create Your Profile'}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        
        <form id="auth-form" class="auth-form">
          <div id="register-fields" style="display: ${mode === 'register' ? 'block' : 'none'}">
            <div class="form-group">
              <label for="auth-name">Full Name *</label>
              <input type="text" id="auth-name" name="name" required placeholder="Your name">
            </div>
            
            <div class="form-group">
              <label for="auth-type">Account Type *</label>
              <select id="auth-type" name="type" required>
                <option value="individual">Individual</option>
                <option value="restaurant">Restaurant Owner</option>
                <option value="venue">Venue Manager</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="auth-city">City</label>
              <input type="text" id="auth-city" name="city" placeholder="London">
            </div>
          </div>
          
          <div class="form-group">
            <label for="auth-email">Email *</label>
            <input type="email" id="auth-email" name="email" required placeholder="your@email.com">
          </div>
          
          <div class="form-group">
            <label for="auth-password">Password *</label>
            <input type="password" id="auth-password" name="password" required placeholder="Your password">
          </div>
          
          <button type="submit" class="btn btn-primary auth-submit-btn">
            <span id="auth-submit-text">${mode === 'login' ? 'Sign In' : 'Create Profile'}</span>
          </button>
          
          <div class="auth-switch">
            ${mode === 'login' 
              ? '<p>Don\'t have an account? <a href="#" onclick="switchAuthMode(\'register\')">Create one</a></p>'
              : '<p>Already have an account? <a href="#" onclick="switchAuthMode(\'login\')">Sign in</a></p>'
            }
          </div>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  openModal(modal);
  
  // Add form handler
  const form = document.getElementById('auth-form');
  form.addEventListener('submit', handleAuth);
}

function switchAuthMode(mode) {
  const title = document.getElementById('auth-title');
  const submitText = document.getElementById('auth-submit-text');
  const registerFields = document.getElementById('register-fields');
  const switchText = document.querySelector('.auth-switch');
  
  if (mode === 'register') {
    title.textContent = 'Create Your Profile';
    submitText.textContent = 'Create Profile';
    registerFields.style.display = 'block';
    switchText.innerHTML = '<p>Already have an account? <a href="#" onclick="switchAuthMode(\'login\')">Sign in</a></p>';
  } else {
    title.textContent = 'Welcome Back';
    submitText.textContent = 'Sign In';
    registerFields.style.display = 'none';
    switchText.innerHTML = '<p>Don\'t have an account? <a href="#" onclick="switchAuthMode(\'register\')">Create one</a></p>';
  }
}

async function handleAuth(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.auth-submit-btn');
  const submitText = document.getElementById('auth-submit-text');
  const originalText = submitText.textContent;
  
  // Set loading state
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="loading-spinner"></span>Processing...';
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const isRegister = document.getElementById('register-fields').style.display !== 'none';
    const endpoint = isRegister ? '/v1/auth/register' : '/v1/auth/login';
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      currentUser = result.user;
      localStorage.setItem('vfied_user', JSON.stringify(currentUser));
      updateAuthUI();
      
      // Close modal
      const modal = document.querySelector('.auth-modal');
      if (modal) modal.remove();
      
      toast(`Welcome${isRegister ? ' to VFIED' : ' back'}, ${currentUser.name}!`, 'success');
      
    } else {
      throw new Error(result.error || 'Authentication failed');
    }

  } catch (error) {
    console.error('Auth error:', error);
    toast(`Authentication failed: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = originalText;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('vfied_user');
  updateAuthUI();
  toast('Logged out successfully', 'info');
}

function addEnhancedStyles() {
  const enhancedStyles = `
    /* User Profile UI */
    .user-profile-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.1);
      padding: 12px 16px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      color: white;
      font-size: 18px;
    }
    
    .user-info {
      flex: 1;
    }
    
    .user-name {
      font-weight: 600;
      color: #e5ecff;
      font-size: 14px;
    }
    
    .user-type {
      font-size: 12px;
      color: #94a3b8;
      text-transform: capitalize;
    }
    
    .logout-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e5ecff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .logout-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    /* Auth Modal */
    .auth-content {
      max-width: 400px;
      width: 90%;
    }
    
    .auth-form {
      padding: 0 24px 24px 24px;
    }
    
    .auth-switch {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      color: #94a3b8;
    }
    
    .auth-switch a {
      color: #a5b4fc;
      text-decoration: none;
      font-weight: 600;
    }
    
    .auth-switch a:hover {
      color: #c7d2fe;
    }
    
    .auth-prompt {
      background: rgba(124, 58, 237, 0.1);
      border: 1px solid rgba(124, 58, 237, 0.3);
      border-radius: 12px;
      padding: 20px;
      margin: 0 24px 20px 24px;
      text-align: center;
    }
    
    .auth-prompt h4 {
      margin: 0 0 8px 0;
      color: #e5ecff;
    }
    
    .auth-prompt p {
      margin: 0 0 16px 0;
      color: #94a3b8;
      font-size: 14px;
    }
    
    .auth-prompt button {
      margin: 0 8px 8px 0;
    }
    
    .auth-prompt a {
      display: block;
      color: #94a3b8;
      font-size: 12px;
      text-decoration: none;
      margin-top: 12px;
    }
    
    /* Image Upload */
    .image-upload-area {
      border: 2px dashed rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    
    .image-upload-area:hover {
      border-color: rgba(255, 255, 255, 0.5);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .upload-placeholder {
      color: #94a3b8;
    }
    
    .upload-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .upload-text {
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .upload-hint {
      font-size: 12px;
      opacity: 0.7;
    }
    
    .poster-preview {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
    }
    
    /* Venue Search */
    .venue-suggestions {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      margin-top: 4px;
      max-height: 200px;
      overflow-y: auto;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .venue-suggestion {
      padding: 12px;
      cursor: pointer;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      transition: background 0.2s;
    }
    
    .venue-suggestion:hover {
      background: rgba(102, 126, 234, 0.1);
    }
    
    .venue-suggestion:last-child {
      border-bottom: none;
    }
    
    .venue-name {
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2px;
    }
    
    .venue-address {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 2px;
    }
    
    .venue-rating {
      font-size: 11px;
      color: #f59e0b;
      font-weight: 600;
    }
    
    .loading-suggestion, .no-suggestions, .error-suggestion {
      padding: 12px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
    }
    
    .enhanced-event-modal .modal-content {
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
    }
  `;
  
  const existingStyles = document.getElementById('vfied-runtime-styles');
  if (existingStyles) {
    existingStyles.textContent += enhancedStyles;
  } else {
    const style = document.createElement('style');
    style.id = 'vfied-enhanced-styles';
    style.textContent = enhancedStyles;
    document.head.appendChild(style);
  }
}

function addAuthButtonsToHeader() {
  // Check if header exists and add auth section
  const header = document.querySelector('.app-header') || document.querySelector('header');
  if (!header) return;
  
  // Create auth section
  let authSection = document.getElementById('auth-section');
  let userProfile = document.getElementById('user-profile');
  
  if (!authSection) {
    authSection = document.createElement('div');
    authSection.id = 'auth-section';
    authSection.innerHTML = `
      <button onclick="showAuthModal('login')" class="auth-btn">Sign In</button>
      <button onclick="showAuthModal('register')" class="auth-btn primary">Join VFIED</button>
    `;
    
    userProfile = document.createElement('div');
    userProfile.id = 'user-profile';
    userProfile.style.display = 'none';
    
    header.appendChild(authSection);
    header.appendChild(userProfile);
    
    // Add styles for auth buttons
    const authStyles = `
      .auth-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e5ecff;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
        transition: all 0.2s;
      }
      
      .auth-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }
      
      .auth-btn.primary {
        background: rgba(124, 58, 237, 0.3);
        border-color: rgba(124, 58, 237, 0.5);
      }
      
      .auth-btn.primary:hover {
        background: rgba(124, 58, 237, 0.5);
      }
    `;
    
    const style = document.createElement('style');
    style.textContent = authStyles;
    document.head.appendChild(style);
  }
  
  updateAuthUI();
}

// Update the openEventSubmissionModal function
function openEventSubmissionModal() {
  // Remove existing modal if present
  const existing = document.getElementById('event-submit-modal');
  if (existing) existing.remove();
  
  // Create enhanced modal
  createEnhancedEventSubmissionModal();
  const modal = document.getElementById('event-submit-modal');
  openModal(modal);
}

// Export functions for global access
window.VFIED = {
  ...window.VFIED,
  showAuthModal,
  logout,
  openEventSubmissionModal,
  currentUser: () => currentUser
};