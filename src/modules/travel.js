// modules/travel.js - Travel coach API integration
import { escapeHtml } from './ui.js';

let moduleConfig = {};

export async function initializeTravel(config) {
  moduleConfig = config;
  console.log('✈️ Travel module initialized');
}

/**
 * Calls the /v1/travel/coach API with user preferences
 * @param {string} city - Target city (e.g., "London")
 * @param {string} mood - Optional mood/preferences
 * @param {object} options - Additional options (dietary, vibes, etc.)
 * @returns {Promise<object>} API response with restaurant recommendations
 */
export async function getTravelRecommendations(city, mood = '', options = {}) {
  try {
    const payload = {
      query: mood || `food and dining in ${city}`,
      location: {
        city: city,
        country_code: options.country_code || 'GB'
      },
      context: {
        dietary: options.dietary || [],
        interests: options.vibes || []
      }
    };

    console.log('✈️ Fetching travel recommendations for:', city, payload);

    const response = await fetch(`${moduleConfig.API_BASE}/v1/travel/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Travel recommendations received:', data);

    return data;
  } catch (error) {
    console.error('❌ Travel API error:', error);
    moduleConfig.toast?.(`Failed to load recommendations: ${error.message}`, 'warn');
    throw error;
  }
}

/**
 * Displays travel recommendations in the UI
 */
export function displayTravelRecommendations(recommendations, city) {
  const grid = document.getElementById('travel-grid');
  if (!grid) return;

  // Backend returns 'restaurants' array, not 'recommendations'
  const items = recommendations.restaurants || recommendations.recommendations || [];

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #94a3b8;">
        <div style="font-size: 32px; margin-bottom: 16px;">🗺️</div>
        <div>No recommendations available for ${escapeHtml(city)}</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'travel-card';

    // Backend returns restaurant data directly in item, not nested in item.restaurant
    const restaurant = {
      name: item.name,
      distance: item.distance_text,
      link: item.booking_link,
      link_label: 'Book Now'
    };
    const hiddenGem = item.hidden_gem_badge ? {
      emoji: '💎',
      label: item.hidden_gem_badge,
      color: '#fbbf24'
    } : null;

    card.innerHTML = `
      <div style="background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:16px; cursor:pointer; transition:.2s;">

        ${hiddenGem ? `
          <div style="display: inline-block; padding: 4px 10px; background: ${hiddenGem.color}20; border: 1px solid ${hiddenGem.color}40; border-radius: 16px; font-size: 11px; font-weight: 600; color: ${hiddenGem.color}; margin-bottom: 8px;">
            ${hiddenGem.emoji} ${hiddenGem.label}
          </div>
        ` : ''}

        <div style="display:flex; align-items:start; gap:12px; margin-bottom:12px;">
          <div style="font-size:28px; flex-shrink: 0;">${item.cuisine_type === 'indian' ? '🍛' : item.cuisine_type === 'italian' ? '🍝' : item.cuisine_type === 'mediterranean' ? '🥗' : '🍽️'}</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:18px; margin-bottom:6px; color:#e5ecff;">${escapeHtml(item.name)}</div>
            <div style="font-size:13px; color:#94a3b8; line-height:1.5; margin-bottom:8px;">${escapeHtml(item.details || item.hero_item || '')}</div>
            <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
              ${item.rating ? `<div style="font-size:12px; color:#fbbf24;">⭐ ${item.rating}</div>` : ''}
              ${item.price_range ? `<div style="font-size:12px; color:#94a3b8;">${item.price_range}</div>` : ''}
              ${item.cuisine_type ? `<div style="font-size:11px; background:rgba(124,58,237,.2); color:#a5b4fc; padding:2px 8px; border-radius:8px;">${escapeHtml(item.cuisine_type)}</div>` : ''}
              ${item.distance_text ? `<div style="font-size:11px; color:#94a3b8;">📍 ${escapeHtml(item.distance_text)}</div>` : ''}
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,.08); padding-top: 12px; margin-top: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="flex: 1; min-width: 0;">
              ${item.availability_label ? `<div style="font-size: 12px; color: ${item.is_open_now ? '#10b981' : '#94a3b8'}; margin-bottom: 4px;">${item.is_open_now ? '✅' : '⏰'} ${escapeHtml(item.availability_label)}</div>` : ''}
              ${item.location ? `<div style="font-size: 11px; color: #94a3b8;">${escapeHtml(item.location)}</div>` : ''}
            </div>
            ${item.booking_link ? `
              <a
                href="${item.booking_link}"
                target="_blank"
                onclick="event.stopPropagation()"
                style="background: rgba(124,58,237,.3); border: 1px solid rgba(124,58,237,.5); color: #a5b4fc; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; white-space: nowrap;"
              >
                Book Now
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Add click handler to open Google Maps if no restaurant link
    if (!restaurant.link) {
      card.addEventListener('click', () => {
        const query = encodeURIComponent(`${item.name} ${city}`);
        window.open(`https://maps.google.com/maps?q=${query}`, '_blank');
      });
    }

    // Hover effects
    const innerCard = card.querySelector('div');
    card.addEventListener('mouseenter', () => {
      innerCard.style.background = 'rgba(255,255,255,.1)';
      innerCard.style.borderColor = 'rgba(124,58,237,.3)';
    });

    card.addEventListener('mouseleave', () => {
      innerCard.style.background = 'rgba(255,255,255,.06)';
      innerCard.style.borderColor = 'rgba(255,255,255,.12)';
    });

    grid.appendChild(card);
  });
}

function getMealPeriod(hour) {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 18) return 'snack';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'late_night';
}

// Export public API
export {
  getTravelRecommendations as default,
  displayTravelRecommendations
};
