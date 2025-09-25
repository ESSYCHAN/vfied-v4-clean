// modules/ui.js - UI helpers, toasts, modals, DOM utilities

export async function initializeUI() {
  // Mount toast system
  mountToastHost();
  
  // Inject runtime styles (toasts, skeletons, etc.)
  injectRuntimeStyles();
  
  console.log('🎨 UI module initialized');
}

// ---- DOM Utilities ----
export function byId(id) {
  const el = document.getElementById(id);
  return el;
}

export function setText(id, text) {
  const el = byId(id);
  if (el) el.textContent = text;
}

export function setHTML(id, html) {
  const el = byId(id);
  if (el) el.innerHTML = html;
}

export function show(id) {
  const el = byId(id);
  if (el) el.classList.remove('hidden');
}

export function hide(id) {
  const el = byId(id);
  if (el) el.classList.add('hidden');
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

export function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// ---- Modal System ----
export function openModal(modal) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

export function closeModal(modal) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('active');
  document.body.style.overflow = ''; // Restore scrolling
}

// ---- Toast System ----
function mountToastHost() {
  if (byId('vfied-toast-host')) return;
  
  const host = document.createElement('div');
  host.id = 'vfied-toast-host';
  host.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
    max-width: 400px;
  `;
  document.body.appendChild(host);
}

export function toast(msg, type = 'info') {
  const host = byId('vfied-toast-host');
  if (!host) {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    return;
  }
  
  const el = document.createElement('div');
  el.className = `vfied-toast ${type}`;
  el.textContent = msg;
  el.style.cssText = `
    background: ${getToastColor(type)};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    pointer-events: auto;
    font-size: 14px;
    font-weight: 500;
    max-width: 100%;
    word-wrap: break-word;
  `;
  
  host.appendChild(el);
  
  // Animate in
  requestAnimationFrame(() => {
    el.style.transform = 'translateX(0)';
  });
  
  // Auto remove
  setTimeout(() => {
    el.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (host.contains(el)) {
        host.removeChild(el);
      }
    }, 300);
  }, 2600);
}

function getToastColor(type) {
  const colors = {
    info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    success: 'linear-gradient(135deg, #10b981, #059669)',
    warn: 'linear-gradient(135deg, #f59e0b, #d97706)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)'
  };
  return colors[type] || colors.info;
}

// ---- Stats Management ----
export function incrementStats({ timeSavedMin = 2 } = {}) {
  const raw = localStorage.getItem('vfied_stats');
  const stats = raw ? JSON.parse(raw) : { totalDecisions: 0, timeSaved: 0 };
  stats.totalDecisions += 1;
  stats.timeSaved += timeSavedMin;
  localStorage.setItem('vfied_stats', JSON.stringify(stats));
  updateStatsUI();
}

export function updateStatsUI() {
  const raw = localStorage.getItem('vfied_stats');
  const stats = raw ? JSON.parse(raw) : { totalDecisions: 0, timeSaved: 0 };
  setText('decisions-count', stats.totalDecisions);
  setText('time-saved', stats.timeSaved);
}

// ---- Skeleton UI ----
export function showSuggestionSkeleton() {
  const skel = byId('suggestion-skeleton');
  const res = byId('suggestion-result');
  if (skel) skel.classList.remove('hidden');
  if (res) res.classList.add('hidden');
}

export function hideSuggestionSkeleton() {
  const skel = byId('suggestion-skeleton');
  if (skel) skel.classList.add('hidden');
}

// ---- Loading States ----
export function setLoading(elementId, loading = true) {
  const el = byId(elementId);
  if (!el) return;
  
  if (loading) {
    el.classList.add('loading');
    el.disabled = true;
  } else {
    el.classList.remove('loading');
    el.disabled = false;
  }
}

// ---- Form Utilities ----
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateRequired(value) {
  return value && value.trim().length > 0;
}

export function getFormData(formId) {
  const form = byId(formId);
  if (!form) return {};
  
  const formData = new FormData(form);
  return Object.fromEntries(formData);
}

// ---- Animation Utilities ----
export function fadeIn(element, duration = 300) {
  element.style.opacity = '0';
  element.style.display = 'block';
  
  const start = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.opacity = progress;
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  requestAnimationFrame(animate);
}

export function fadeOut(element, duration = 300) {
  const start = performance.now();
  const startOpacity = parseFloat(element.style.opacity) || 1;
  
  function animate(currentTime) {
    const elapsed = currentTime - start;
    const progress = Math.min(elapsed / duration, 1);
    
    element.style.opacity = startOpacity * (1 - progress);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      element.style.display = 'none';
    }
  }
  
  requestAnimationFrame(animate);
}

// ---- Responsive Utilities ----
export function isMobile() {
  return window.innerWidth <= 768;
}

export function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

export function isDesktop() {
  return window.innerWidth > 1024;
}

// Runtime styles are now in the main CSS file
// No need to inject styles via JavaScript anymore