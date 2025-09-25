// modules/auth.js - User authentication and profile management
import { escapeHtml, openModal, closeModal } from './ui.js';

let moduleConfig = {};
let currentUser = null;

export async function initializeAuth(config) {
  moduleConfig = config;
  
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
  
  // Add auth buttons to header if they don't exist
  addAuthButtonsToHeader();
  
  console.log('🔐 Auth module initialized');
}

export function getCurrentUser() {
  return currentUser;
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
            <div class="user-type">${escapeHtml(currentUser.type || 'Individual')}</div>
          </div>
          <button onclick="window.VFIED.logout()" class="logout-btn">Logout</button>
        </div>
      `;
    }
    
    // Notify other modules
    if (window.VFIED && window.VFIED.setCurrentUser) {
      window.VFIED.setCurrentUser(currentUser);
    }
  } else {
    // Show auth buttons, hide user profile
    if (authSection) authSection.style.display = 'block';
    if (userProfile) userProfile.style.display = 'none';
  }
}

export async function showAuthModal(mode = 'login') {
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
                <option value="organizer">Event Organizer</option>
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
            <input type="password" id="auth-password" name="password" required placeholder="Your password" minlength="6">
          </div>
          
          <button type="submit" class="btn btn-primary auth-submit-btn">
            <span id="auth-submit-text">${mode === 'login' ? 'Sign In' : 'Create Profile'}</span>
          </button>
          
          <div class="auth-switch">
            ${mode === 'login' 
              ? '<p>Don\'t have an account? <a href="#" onclick="window.VFIED.switchAuthMode(\'register\')">Create one</a></p>'
              : '<p>Already have an account? <a href="#" onclick="window.VFIED.switchAuthMode(\'login\')">Sign in</a></p>'
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
  if (form) {
    form.addEventListener('submit', handleAuth);
  }
}

export function switchAuthMode(mode) {
  const title = document.getElementById('auth-title');
  const submitText = document.getElementById('auth-submit-text');
  const registerFields = document.getElementById('register-fields');
  const switchText = document.querySelector('.auth-switch');
  
  if (!title || !submitText || !registerFields || !switchText) return;
  
  if (mode === 'register') {
    title.textContent = 'Create Your Profile';
    submitText.textContent = 'Create Profile';
    registerFields.style.display = 'block';
    switchText.innerHTML = '<p>Already have an account? <a href="#" onclick="window.VFIED.switchAuthMode(\'login\')">Sign in</a></p>';
  } else {
    title.textContent = 'Welcome Back';
    submitText.textContent = 'Sign In';
    registerFields.style.display = 'none';
    switchText.innerHTML = '<p>Don\'t have an account? <a href="#" onclick="window.VFIED.switchAuthMode(\'register\')">Create one</a></p>';
  }
}

async function handleAuth(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.auth-submit-btn');
  const submitText = document.getElementById('auth-submit-text');
  
  if (!submitBtn || !submitText) return;
  
  const originalText = submitText.textContent;
  
  // Set loading state
  submitBtn.disabled = true;
  submitText.innerHTML = '<span class="loading-spinner"></span>Processing...';
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    // Client-side validation
    if (!data.email || !data.password) {
      throw new Error('Email and password are required');
    }
    
    if (data.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    const isRegister = document.getElementById('register-fields')?.style.display !== 'none';
    
    if (isRegister && (!data.name || !data.type)) {
      throw new Error('Name and account type are required for registration');
    }
    
    const endpoint = isRegister ? '/v1/auth/register' : '/v1/auth/login';
    
    const response = await fetch(`${moduleConfig.API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok && result.success && result.user) {
      currentUser = result.user;
      localStorage.setItem('vfied_user', JSON.stringify(currentUser));
      updateAuthUI();
      
      // Close modal
      const modal = document.querySelector('.auth-modal');
      if (modal) modal.remove();
      
      moduleConfig.toast(
        `Welcome${isRegister ? ' to VFIED' : ' back'}, ${currentUser.name}!`, 
        'success'
      );
      
    } else {
      throw new Error(result.error || result.message || 'Authentication failed');
    }

  } catch (error) {
    console.error('Auth error:', error);
    moduleConfig.toast(`Authentication failed: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = originalText;
  }
}

export function logout() {
  if (!currentUser) return;
  
  const userName = currentUser.name;
  currentUser = null;
  localStorage.removeItem('vfied_user');
  updateAuthUI();
  
  // Notify other modules
  if (window.VFIED && window.VFIED.setCurrentUser) {
    window.VFIED.setCurrentUser(null);
  }
  
  moduleConfig.toast(`Goodbye, ${userName}!`, 'info');
}

function addAuthButtonsToHeader() {
  // Check if header exists and add auth section
  const header = document.querySelector('.app-header') || document.querySelector('header');
  if (!header) return;
  
  // Create auth section if it doesn't exist
  let authSection = document.getElementById('auth-section');
  let userProfile = document.getElementById('user-profile');
  
  if (!authSection) {
    authSection = document.createElement('div');
    authSection.id = 'auth-section';
    authSection.innerHTML = `
      <button onclick="window.VFIED.showAuthModal('login')" class="auth-btn">Sign In</button>
      <button onclick="window.VFIED.showAuthModal('register')" class="auth-btn primary">Join VFIED</button>
    `;
    
    userProfile = document.createElement('div');
    userProfile.id = 'user-profile';
    userProfile.style.display = 'none';
    
    header.appendChild(authSection);
    header.appendChild(userProfile);
  }
  
  updateAuthUI();
}

// Enhanced user profile features
export function getUserProfile() {
  return currentUser;
}

export function updateUserProfile(updates) {
  if (!currentUser) return false;
  
  currentUser = { ...currentUser, ...updates };
  localStorage.setItem('vfied_user', JSON.stringify(currentUser));
  updateAuthUI();
  return true;
}

export function isAuthenticated() {
  return !!currentUser;
}

export function requireAuth(callback) {
  if (!currentUser) {
    showAuthModal('login');
    return false;
  }
  if (callback) callback(currentUser);
  return true;
}

// Profile stats and preferences
export function getUserStats() {
  if (!currentUser) return null;
  
  const stats = localStorage.getItem('vfied_stats');
  return stats ? JSON.parse(stats) : { totalDecisions: 0, timeSaved: 0, eventsSubmitted: 0 };
}

export function updateUserStats(updates) {
  if (!currentUser) return;
  
  const currentStats = getUserStats() || {};
  const newStats = { ...currentStats, ...updates };
  localStorage.setItem('vfied_stats', JSON.stringify(newStats));
}

export function getUserPreferences() {
  if (!currentUser) return {};
  
  const prefs = localStorage.getItem(`vfied_prefs_${currentUser.id}`);
  return prefs ? JSON.parse(prefs) : {
    defaultCity: 'London',
    dietaryRestrictions: [],
    favoriteCategories: [],
    notificationSettings: {
      newEvents: true,
      recommendations: true
    }
  };
}

export function updateUserPreferences(preferences) {
  if (!currentUser) return false;
  
  localStorage.setItem(`vfied_prefs_${currentUser.id}`, JSON.stringify(preferences));
  return true;
}

export { 
  getCurrentUser,
  isAuthenticated,
  requireAuth,
  getUserProfile,
  updateUserProfile
};