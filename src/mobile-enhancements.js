// Cross-Platform Mobile Enhancements for VFIED

class MobileEnhancements {
  constructor() {
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    this.isAndroid = /Android/.test(navigator.userAgent);
    this.isMobile = this.isIOS || this.isAndroid;
    this.hasHaptics = 'vibrate' in navigator;
    this.hasTouch = 'ontouchstart' in window;
    
    this.init();
  }

  init() {
    if (this.isMobile) {
      this.setupUniversalBehaviors();
      this.setupPlatformSpecifics();
      this.enhanceTouch();
      this.setupHaptics();
      this.optimizeScrolling();
      this.setupGestures();
    }
  }

  // Universal behaviors that work well on both platforms
  setupUniversalBehaviors() {
    // Prevent zoom on inputs
    this.preventInputZoom();
    
    // Enhanced loading states
    this.setupLoadingStates();
    
    // Better error handling
    this.setupErrorHandling();
    
    // Performance optimizations
    this.optimizeAnimations();
  }

  // Platform-specific optimizations
  setupPlatformSpecifics() {
    if (this.isIOS) {
      this.setupIOSOptimizations();
    } else if (this.isAndroid) {
      this.setupAndroidOptimizations();
    }
  }

  setupIOSOptimizations() {
    // iOS safe areas
    this.handleSafeAreas();
    
    // iOS-style bounce scrolling
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Status bar styling
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = '#000000';
  }

  setupAndroidOptimizations() {
    // Android navigation bar color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = '#0a0e19';
    
    // Material Design ripple effects
    this.setupRippleEffects();
    
    // Android back button handling
    this.setupBackButtonHandling();
  }

  // Enhanced touch interactions for both platforms
  enhanceTouch() {
    const interactiveElements = document.querySelectorAll(
      'button, .decision-card, .diet-chip, .tab-btn, .travel-card, .event-card, .gem-card'
    );
    
    interactiveElements.forEach(element => {
      this.addTouchFeedback(element);
    });

    // Prevent accidental selections
    this.preventAccidentalSelections();
  }

  addTouchFeedback(element) {
    let touchStartTime;
    let touchMoved = false;

    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchMoved = false;
      element.classList.add('touch-active');
      
      // Platform-appropriate haptic feedback
      this.triggerHaptic('light');
    }, { passive: true });

    element.addEventListener('touchmove', () => {
      touchMoved = true;
      element.classList.remove('touch-active');
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      const touchDuration = Date.now() - touchStartTime;
      
      // Only trigger if it was a quick tap, not a long press
      if (!touchMoved && touchDuration < 500) {
        // Add success feedback for primary actions
        if (element.id === 'decide-button' || element.classList.contains('btn-primary')) {
          this.triggerHaptic('medium');
        }
      }
      
      setTimeout(() => {
        element.classList.remove('touch-active');
      }, 150);
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
      element.classList.remove('touch-active');
    }, { passive: true });
  }

  // Cross-platform haptic feedback
  setupHaptics() {
    if (!this.hasHaptics) return;

    // Different patterns for different actions
    this.hapticPatterns = {
      light: this.isIOS ? [10] : [25],
      medium: this.isIOS ? [20] : [50],
      heavy: this.isIOS ? [30] : [75],
      success: this.isIOS ? [10, 50, 10] : [25, 100, 25],
      error: this.isIOS ? [50, 50, 50] : [100, 100, 100]
    };
  }

  triggerHaptic(intensity = 'light') {
    if (this.hasHaptics && this.hapticPatterns[intensity]) {
      navigator.vibrate(this.hapticPatterns[intensity]);
    }
  }

  // Android-specific ripple effects
  setupRippleEffects() {
    if (!this.isAndroid) return;

    const rippleElements = document.querySelectorAll('button, .decision-card, .tab-btn');
    
    rippleElements.forEach(element => {
      element.addEventListener('touchstart', (e) => {
        this.createRipple(element, e);
      });
    });
  }

  createRipple(element, event) {
    const ripple = document.createElement('div');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.touches[0].clientX - rect.left - size / 2;
    const y = event.touches[0].clientY - rect.top - size / 2;

    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      z-index: 1;
    `;

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  // Optimized scrolling for both platforms
  optimizeScrolling() {
    // Smooth scrolling for both platforms
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Platform-specific scroll optimizations
    if (this.isIOS) {
      // iOS momentum scrolling
      document.body.style.webkitOverflowScrolling = 'touch';
      document.body.style.overscrollBehavior = 'none';
    } else if (this.isAndroid) {
      // Android scroll optimization
      document.body.style.overscrollBehaviorY = 'contain';
    }

    // Universal scroll enhancements
    this.setupPullToRefresh();
    this.setupScrollToTop();
  }

  // Universal pull-to-refresh
  setupPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const threshold = 80;
    const maxPull = 120;
    let isRefreshing = false;

    const app = document.getElementById('app');
    const header = document.querySelector('header');

    // Create refresh indicator
    const refreshIndicator = document.createElement('div');
    refreshIndicator.className = 'pull-refresh-indicator';
    refreshIndicator.innerHTML = `
      <div class="refresh-spinner"></div>
      <div class="refresh-text">Pull to refresh</div>
    `;
    
    refreshIndicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #94a3b8;
      transition: all 0.2s ease;
      z-index: 101;
      opacity: 0;
    `;
    
    header.appendChild(refreshIndicator);

    app.addEventListener('touchstart', (e) => {
      if (app.scrollTop === 0 && !isRefreshing) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    app.addEventListener('touchmove', (e) => {
      if (app.scrollTop === 0 && startY > 0 && !isRefreshing) {
        currentY = e.touches[0].clientY;
        pullDistance = Math.min(currentY - startY, maxPull);
        
        if (pullDistance > 0) {
          e.preventDefault();
          const progress = pullDistance / threshold;
          
          app.style.transform = `translateY(${pullDistance * 0.5}px)`;
          refreshIndicator.style.top = `${-60 + pullDistance * 0.3}px`;
          refreshIndicator.style.opacity = Math.min(progress, 1);
          
          if (pullDistance >= threshold) {
            refreshIndicator.querySelector('.refresh-text').textContent = 'Release to refresh';
            this.triggerHaptic('light');
          } else {
            refreshIndicator.querySelector('.refresh-text').textContent = 'Pull to refresh';
          }
        }
      }
    }, { passive: false });

    app.addEventListener('touchend', () => {
      if (pullDistance >= threshold && !isRefreshing) {
        isRefreshing = true;
        this.triggerRefresh(refreshIndicator);
      }
      
      this.resetPullRefresh(app, refreshIndicator);
      startY = 0;
      pullDistance = 0;
    }, { passive: true });
  }

  triggerRefresh(indicator) {
    indicator.querySelector('.refresh-text').textContent = 'Refreshing...';
    indicator.querySelector('.refresh-spinner').style.animation = 'spin 1s linear infinite';
    
    this.triggerHaptic('success');

    // Trigger actual refresh
    setTimeout(() => {
      if (window.vfiedApp && window.vfiedApp.makeDecision) {
        window.vfiedApp.makeDecision();
      }
      
      setTimeout(() => {
        this.resetPullRefresh(document.getElementById('app'), indicator);
      }, 1000);
    }, 300);
  }

  resetPullRefresh(app, indicator) {
    app.style.transform = 'translateY(0)';
    indicator.style.top = '-60px';
    indicator.style.opacity = '0';
    indicator.querySelector('.refresh-text').textContent = 'Pull to refresh';
    indicator.querySelector('.refresh-spinner').style.animation = 'none';
  }

  // Gesture recognition
  setupGestures() {
    this.setupSwipeGestures();
    this.setupLongPressGestures();
  }

  setupSwipeGestures() {
    let startX, startY, startTime;
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!startX || !startY) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = Date.now() - startTime;

      if (deltaTime > maxSwipeTime) return;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > minSwipeDistance && absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          this.handleSwipeRight();
        } else {
          this.handleSwipeLeft();
        }
      }

      startX = startY = null;
    }, { passive: true });
  }

  handleSwipeLeft() {
    // Navigate to next tab
    const tabs = document.querySelectorAll('.tab-btn');
    const activeTab = document.querySelector('.tab-btn.active');
    const currentIndex = Array.from(tabs).indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    tabs[nextIndex].click();
    this.triggerHaptic('light');
  }

  handleSwipeRight() {
    // Navigate to previous tab
    const tabs = document.querySelectorAll('.tab-btn');
    const activeTab = document.querySelector('.tab-btn.active');
    const currentIndex = Array.from(tabs).indexOf(activeTab);
    const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
    tabs[prevIndex].click();
    this.triggerHaptic('light');
  }

  setupLongPressGestures() {
    const longPressElements = document.querySelectorAll('.decision-card, .travel-card');
    
    longPressElements.forEach(element => {
      let pressTimer;
      
      element.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          this.triggerHaptic('heavy');
          this.showContextMenu(element);
        }, 500);
      }, { passive: true });

      element.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
      }, { passive: true });

      element.addEventListener('touchmove', () => {
        clearTimeout(pressTimer);
      }, { passive: true });
    });
  }

  showContextMenu(element) {
    // Show context menu with options like "Share", "Save", etc.
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.innerHTML = `
      <div class="context-menu-item" data-action="share">Share</div>
      <div class="context-menu-item" data-action="save">Save</div>
      <div class="context-menu-item" data-action="directions">Get Directions</div>
    `;
    
    // Position and show menu
    this.positionContextMenu(menu, element);
    document.body.appendChild(menu);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (menu.parentNode) {
        menu.parentNode.removeChild(menu);
      }
    }, 3000);
  }

  positionContextMenu(menu, element) {
    const rect = element.getBoundingClientRect();
    menu.style.cssText = `
      position: fixed;
      top: ${rect.top - 10}px;
      left: ${rect.left}px;
      background: rgba(28, 28, 30, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 8px;
      z-index: 10000;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    `;
  }

  // Prevent zoom on input focus
  preventInputZoom() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.style.fontSize === '' || parseInt(input.style.fontSize) < 16) {
        input.style.fontSize = '16px';
      }
    });
  }

  // Enhanced loading states
  setupLoadingStates() {
    this.showSkeletonLoading = (container) => {
      container.innerHTML = `
        <div class="skeleton-loader">
          <div class="skeleton-avatar"></div>
          <div class="skeleton-text"></div>
          <div class="skeleton-text short"></div>
        </div>
      `;
    };
  }

  // Android back button handling
  setupBackButtonHandling() {
    if (!this.isAndroid) return;

    document.addEventListener('backbutton', (e) => {
      e.preventDefault();
      
      // Check if modal is open
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        activeModal.classList.remove('active');
        return;
      }
      
      // Check if on main tab
      const activeTab = document.querySelector('.tab-btn.active');
      const foodTab = document.querySelector('[data-tab="tabFood"]');
      
      if (activeTab !== foodTab) {
        foodTab.click();
        return;
      }
      
      // Exit app
      if (window.navigator && window.navigator.app) {
        window.navigator.app.exitApp();
      }
    }, false);
  }

  // Performance optimizations
  optimizeAnimations() {
    // Use transform instead of changing layout properties
    const animatedElements = document.querySelectorAll('[style*="transform"]');
    animatedElements.forEach(element => {
      element.style.willChange = 'transform';
    });

    // Optimize scroll performance
    document.addEventListener('scroll', this.throttle(() => {
      // Scroll-based animations
    }, 16), { passive: true });
  }

  // Utility function for throttling
  throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
      const context = this;
      const args = arguments;
      if (!lastRan) {
        func.apply(context, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(function() {
          if ((Date.now() - lastRan) >= limit) {
            func.apply(context, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  // Handle safe areas (iOS specific but won't break Android)
  handleSafeAreas() {
    const updateSafeAreas = () => {
      const root = document.documentElement;
      
      // These CSS variables will be 0px on Android, which is fine
      root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
      root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
      root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
      root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');
    };

    updateSafeAreas();
    window.addEventListener('orientationchange', () => {
      setTimeout(updateSafeAreas, 100);
    });
  }

  // Universal toast system
  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `mobile-toast toast-${type}`;
    toast.textContent = message;
    
    const bgColors = {
      info: 'rgba(59, 130, 246, 0.9)',
      success: 'rgba(16, 185, 129, 0.9)',
      error: 'rgba(239, 68, 68, 0.9)',
      warning: 'rgba(245, 158, 11, 0.9)'
    };
    
    toast.style.cssText = `
      position: fixed;
      top: ${this.isIOS ? 'calc(env(safe-area-inset-top, 0px) + 60px)' : '60px'};
      left: 50%;
      transform: translateX(-50%) translateY(-100px);
      background: ${bgColors[type] || bgColors.info};
      color: white;
      padding: 12px 20px;
      border-radius: ${this.isIOS ? '20px' : '8px'};
      font-size: 15px;
      font-weight: 500;
      backdrop-filter: blur(20px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
      max-width: calc(100% - 40px);
      text-align: center;
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Haptic feedback
    this.triggerHaptic(type === 'error' ? 'error' : type === 'success' ? 'success' : 'light');

    // Animate out
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(-100px)';
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  // Error handling
  setupErrorHandling() {
    window.addEventListener('error', (e) => {
      console.error('Application error:', e.error);
      this.showToast('Something went wrong. Please try again.', 'error');
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      this.showToast('Network error. Please check your connection.', 'error');
    });
  }
}

// CSS for cross-platform enhancements
const crossPlatformStyles = `
.touch-active {
  opacity: 0.7;
  transform: scale(0.98);
  transition: all 0.1s ease;
}

.refresh-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top: 2px solid #94a3b8;
  border-radius: 50%;
}

.context-menu {
  animation: contextMenuSlideIn 0.2s ease;
}

.context-menu-item {
  padding: 12px 16px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;
}

.context-menu-item:hover,
.context-menu-item:active {
  background: rgba(255, 255, 255, 0.1);
}

.skeleton-loader {
  padding: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-avatar {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  margin: 0 auto 12px;
}

.skeleton-text {
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 8px;
}

.skeleton-text.short {
  width: 60%;
  margin: 0 auto;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

@keyframes contextMenuSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Platform-specific optimizations */
.ios .modal-content {
  border-radius: 12px 12px 0 0;
}

.android .modal-content {
  border-radius: 8px;
}

.android button {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
`;

// Initialize cross-platform enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Add cross-platform styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = crossPlatformStyles;
  document.head.appendChild(styleSheet);
  
  // Add platform class to body
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  if (isIOS) document.body.classList.add('ios');
  if (isAndroid) document.body.classList.add('android');
  
  // Initialize enhancements
  window.mobileEnhancements = new MobileEnhancements();
  
  // Override existing toast function
  if (window.vfiedApp) {
    window.vfiedApp.showToast = (message, type) => {
      window.mobileEnhancements.showToast(message, type);
    };
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileEnhancements;
}