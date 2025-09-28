// main.js - Core entry point
import { initializeFood } from './modules/food.js';
import { initializeEvents } from './modules/events.js';
import { initializeAuth } from './modules/auth.js';
import { initializeUI, toast, updateStatsUI } from './modules/ui.js';
import { CONFIG } from './config.js';
import './mobile-enhancements.js';
export const API_BASE = CONFIG.API_BASE;

// ---- App State ----
let localGems = [];
let travelLists = {};
let eventItems = [];
let currentTab = 'tabTravel';

// ---- Demo Data ----
const demoFriends = [
  { name: 'Sarah', comment: '🔥 Best ramen spot ever!', emoji: '🍜', avatar: 'https://i.pravatar.cc/80?img=32' },
  { name: 'James', comment: '💯 Always go for the sushi here', emoji: '🍣', avatar: 'https://i.pravatar.cc/80?img=12' },
  { name: 'Aisha', comment: '👌 Perfect comfort food when tired', emoji: '🍲', avatar: 'https://i.pravatar.cc/80?img=58' },
];

// ---- Main App Initialization ----
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 VFIED initializing...');
  
  // Initialize UI components first
  await initializeUI();
  
  // Initialize core modules
  await initializeFood({
    demoFriends,
    localGems,
    API_BASE,
    toast,
    updateStatsUI
  });
  
  await initializeEvents({
    eventItems,
    API_BASE,
    toast,
    updateStatsUI
  });
  
  await initializeAuth({
    API_BASE,
    toast
  });

  // Initialize other features
  await wireCoreTabs();
  await loadDataSources();
  
  updateStatsUI();
  
  console.log('🚀 VFIED unified app loaded successfully');
});

// ---- Core Tab System ----
async function wireCoreTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const toShow = btn.dataset.tab;
      document.querySelectorAll('.tabpanel').forEach((p) => p.classList.add('hidden'));
      document.getElementById(toShow)?.classList.remove('hidden');
      currentTab = toShow;
    });
  });
}

// ---- Data Loading ----
async function loadDataSources() {
  try {
    await Promise.all([
      loadLocalGems(),
      loadTravelLists(),
    ]);
  } catch (error) {
    console.warn('Some data sources failed to load:', error);
  }
}

async function loadLocalGems() {
  try {
    const res = await fetch('/data/local_lists.json', { cache: 'no-store' });
    localGems = await res.json();
    renderLocalGemsGrid();
  } catch {
    localGems = [];
    console.warn('Local gems data not available');
  }
}

async function loadTravelLists() {
  try {
    const res = await fetch('/data/travel_lists.json', { cache: 'no-store' });
    travelLists = await res.json();
    renderTravelCities();
    renderTravelGrid();
  } catch {
    travelLists = {};
    console.warn('Travel lists data not available');
  }
}

// ---- Local Gems ----
function renderLocalGemsGrid() {
  const grid = document.getElementById('local-gems-grid');
  if (!grid) return;

  const first = localGems.slice(0, 8);
  grid.innerHTML = '';
  
  first.forEach((gem) => {
    const card = document.createElement('div');
    card.className = 'gem-card';
    card.innerHTML = `
      <div class="gem-emoji">${gem.emoji}</div>
      <div class="gem-name">${escapeHtml(gem.name)}</div>
      <div class="gem-area">${escapeHtml(gem.area)}</div>
    `;
    card.addEventListener('click', () => exploreGem(gem.name));
    grid.appendChild(card);
  });
}

function exploreGem(name) {
  const gem = localGems.find((x) => x.name === name);
  if (!gem) return;
  
  const moodInput = document.getElementById('mood-input');
  if (moodInput) {
    moodInput.value = `want something from ${gem.name} list in ${gem.area}`;
    // Trigger decision if food module is available
    if (window.VFIED?.handleDecision) {
      window.VFIED.handleDecision();
    }
  }
}

// ---- Travel Features ----
function renderTravelCities() {
  const select = document.getElementById('travel-city-select');
  if (!select) return;

  const cities = Object.keys(travelLists);
  select.innerHTML = cities.map((c) => `<option value="${c}">${c}</option>`).join('');
  select.addEventListener('change', renderTravelGrid);
}

function renderTravelGrid() {
  const city = document.getElementById('travel-city-select')?.value || Object.keys(travelLists)[0];
  const items = (travelLists[city] || []).slice(0, 10);
  const grid = document.getElementById('travel-grid');
  if (!grid) return;

  grid.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'travel-card';
    card.innerHTML = `
      <div class="travel-emoji">${item.emoji}</div>
      <div class="travel-body">
        <div class="travel-title">${escapeHtml(item.name)}</div>
        <div class="travel-note">${escapeHtml(item.note || '')}</div>
      </div>
    `;
    card.addEventListener('click', () => tryTravel(city, item.name));
    grid.appendChild(card);
  });
}

function tryTravel(city, itemName) {
  const moodInput = document.getElementById('mood-input');
  if (moodInput) {
    moodInput.value = `travel mode: try ${itemName} in ${city}`;
    if (window.VFIED?.handleDecision) {
      window.VFIED.handleDecision();
    }
  }
}

// ---- Utilities ----
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

// ---- Expose Global API ----
window.VFIED = {
  ...window.VFIED,
  handleDecision: null, // Will be set by food module
  exploreGem,
  tryTravel,
  currentTab: () => currentTab,
  localGems: () => localGems,
  travelLists: () => travelLists,
  API_BASE
};