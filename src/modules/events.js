// modules/events.js - Events submission and management
import { byId, escapeHtml, openModal, closeModal } from './ui.js';

let moduleConfig = {};
let currentUser = null;

export async function initializeEvents(config) {
  moduleConfig = config;
  
  await loadEvents();
  wireEventSubmissionButton();
  
  console.log('🎪 Events module initialized');
}

export function setCurrentUser(user) {
  currentUser = user;
}

async function loadEvents() {
  try {
    const res = await fetch('/data/events.json', { cache: 'no-store' });
    moduleConfig.eventItems = await res.json();
    renderEvents();
  } catch {
    moduleConfig.eventItems = [];
    console.warn('Events data not available');
  }
}

function wireEventSubmissionButton() {
  const submitEventBtn = byId('submit-event-btn');
  if (submitEventBtn) {
    submitEventBtn.addEventListener('click', openEventSubmissionModal);
  }
}

function renderEvents() {
  const grid = byId('events-grid');
  if (!grid) return;

  grid.innerHTML = '';
  moduleConfig.eventItems.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'event-card';

    const badge = document.createElement('div');
    badge.className = 'event-badge';
    badge.textContent = event.emoji;

    const body = document.createElement('div');
    body.className = 'event-body';

    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = event.title;

    const meta = document.createElement('div');
    meta.className = 'event-meta';
    meta.textContent = `${event.date} • ${event.area} • ${event.price || 'Free'}`;

    const cta = document.createElement('div');
    cta.className = 'event-cta';

    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'insights-toggle';
    detailsBtn.textContent = 'Details';
    detailsBtn.addEventListener('click', () => viewEventDetails(event));

    const mapsBtn = document.createElement('button');
    mapsBtn.className = 'insights-toggle';
    mapsBtn.textContent = 'Directions';
    mapsBtn.addEventListener('click', () => openMaps(encodeURIComponent(event.map || event.title)));

    cta.append(detailsBtn, mapsBtn);
    body.append(title, meta, cta);
    card.append(badge, body);
    grid.appendChild(card);
  });

  addSubmitEventButton();
}

function addSubmitEventButton() {
  const eventsGrid = byId('events-grid');
  if (!eventsGrid || byId('submit-event-btn')) return;
  
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
  
  eventsGrid.insertBefore(submitCard, eventsGrid.firstChild);
  
  // Re-wire the button
  const submitBtn = byId('submit-event-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', openEventSubmissionModal);
  }
}

function viewEventDetails(event) {
  moduleConfig.toast(`🎪 ${event.title}\n(Integrate ticket link or detail view here)`, 'info');
}

function openMaps(query) {
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

export function openEventSubmissionModal() {
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
              <button onclick="window.VFIED.showAuthModal('register')" class="btn btn-secondary">Create Profile</button>
              <button onclick="window.VFIED.showAuthModal('login')" class="btn btn-secondary">Sign In</button>
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
  
  initializeImageUpload();
  initializeVenueSearch();
  
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
  
  if (!fileInput || !preview || !placeholder) return;
  
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
  
  if (!searchInput || !suggestionsDiv) return;
  
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
    
    const response = await fetch(`${moduleConfig.API_BASE}/v1/places/search?query=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
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

window.selectVenue = function(placeId, name, address) {
  const searchInput = document.getElementById('venue-search');
  const suggestionsDiv = document.getElementById('venue-suggestions');
  const placeIdInput = document.getElementById('selected-place-id');
  
  if (searchInput) searchInput.value = name;
  if (placeIdInput) placeIdInput.value = placeId;
  if (suggestionsDiv) suggestionsDiv.innerHTML = '';
  
  const addressParts = address.split(', ');
  if (addressParts.length > 1) {
    const cityInput = document.getElementById('event-city');
    if (cityInput && !cityInput.value) {
      cityInput.value = addressParts[addressParts.length - 2] || 'London';
    }
  }
};

async function handleEnhancedEventSubmission(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitEventBtn');
  const submitText = document.getElementById('submitEventText');
  const successMessage = document.getElementById('event-success-message');
  const successTitle = document.getElementById('success-title');
  const successMsg = document.getElementById('success-message');
  const form = document.getElementById('eventSubmitForm');
  
  if (!submitBtn || !submitText) return;
  
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="loading-spinner"></span>Submitting...';
  
  try {
    const formData = new FormData();
    
    const title = document.getElementById('event-title')?.value || '';
    const description = document.getElementById('event-description')?.value || '';
    const venue = document.getElementById('venue-search')?.value || '';
    const city = document.getElementById('event-city')?.value || '';
    const country = document.getElementById('event-country')?.value || '';
    const date = document.getElementById('event-date')?.value || '';
    const time = document.getElementById('event-time')?.value || '';
    const category = document.getElementById('event-category')?.value || '';
    const price = document.getElementById('event-price')?.value || '';
    const placeId = document.getElementById('selected-place-id')?.value || '';
    
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', JSON.stringify({
      venue: venue,
      city: city,
      country_code: country
    }));
    formData.append('date', date);
    formData.append('time', time);
    formData.append('category', category);
    formData.append('price', price || 'Free');
    formData.append('place_id', placeId);
    
    if (currentUser) {
      formData.append('user_id', currentUser.id);
      formData.append('contact_name', currentUser.name);
      formData.append('contact_email', currentUser.email);
    } else {
      formData.append('contact_name', document.getElementById('contact-name')?.value || '');
      formData.append('contact_email', document.getElementById('contact-email')?.value || '');
    }
    
    const posterFile = document.getElementById('event-poster')?.files[0];
    if (posterFile) {
      formData.append('poster', posterFile);
    }

    const response = await fetch(`${moduleConfig.API_BASE}/v1/events/submit`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (response.ok && result.success) {
      if (successTitle && successMsg && successMessage) {
        if (result.auto_approved) {
          successTitle.textContent = '🎉 Event Published!';
          successMsg.textContent = 'Your event was automatically approved and is now live in the app!';
        } else {
          successTitle.textContent = 'Event Submitted Successfully!';
          successMsg.textContent = result.message || 'Your event will be reviewed within 24-48 hours.';
        }
        
        successMessage.style.display = 'block';
        if (form) form.style.display = 'none';
      }
      
      moduleConfig.toast(
        result.auto_approved 
          ? 'Event published immediately! 🚀' 
          : 'Event submitted for review ✅', 
        'success'
      );
      
      moduleConfig.updateStatsUI({ timeSavedMin: 0 });
      
      setTimeout(() => {
        const modal = document.getElementById('event-submit-modal');
        if (modal) closeModal(modal);
        
        setTimeout(() => {
          if (form && successMessage) {
            form.style.display = 'block';
            successMessage.style.display = 'none';
            form.reset();
            
            const preview = document.getElementById('poster-preview');
            const placeholder = document.querySelector('.upload-placeholder');
            if (preview && placeholder) {
              preview.style.display = 'none';
              placeholder.style.display = 'block';
            }
          }
        }, 500);
      }, 4000);
      
    } else {
      throw new Error(result.error || 'Failed to submit event');
    }

  } catch (error) {
    console.error('Enhanced event submission error:', error);
    moduleConfig.toast(`Failed to submit event: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Submit Event';
  }
}

export { loadEvents, renderEvents };