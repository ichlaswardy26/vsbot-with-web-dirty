/**
 * Mobile Responsive Functionality
 * Handles mobile-specific features, touch optimization, and performance
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

class MobileResponsive {
  constructor() {
    this.isMobile = this.detectMobile();
    this.isTouch = this.detectTouch();
    this.breakpoints = {
      xs: 575.98,
      sm: 767.98,
      md: 991.98,
      lg: 1199.98
    };
    this.currentBreakpoint = this.getCurrentBreakpoint();
    this.collapsibleSections = new Map();
    this.loadStartTime = performance.now();
    
    this.init();
  }

  /**
   * Initialize mobile responsive features
   * Requirements: 8.1
   */
  init() {
    // Track page load performance
    this.trackLoadPerformance();
    
    // Setup responsive handlers
    this.setupResizeHandler();
    this.setupTouchOptimizations();
    this.setupCollapsibleNavigation();
    this.setupMobileQuickActions();
    this.setupLazyLoading();
    this.setupMobileWorkflows();
    
    // Apply initial mobile optimizations
    if (this.isMobile) {
      this.applyMobileOptimizations();
    }
    
    console.log(`Mobile responsive initialized. Device: ${this.isMobile ? 'mobile' : 'desktop'}, Touch: ${this.isTouch}`);
  }

  /**
   * Detect if device is mobile
   * Requirements: 8.1
   */
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth <= this.breakpoints.md;
  }

  /**
   * Detect touch capability
   * Requirements: 8.1
   */
  detectTouch() {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0;
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width <= this.breakpoints.xs) return 'xs';
    if (width <= this.breakpoints.sm) return 'sm';
    if (width <= this.breakpoints.md) return 'md';
    if (width <= this.breakpoints.lg) return 'lg';
    return 'xl';
  }

  /**
   * Track page load performance
   * Requirements: 8.5
   */
  trackLoadPerformance() {
    window.addEventListener('load', () => {
      const loadTime = performance.now() - this.loadStartTime;
      console.log(`Page load time: ${loadTime.toFixed(2)}ms`);
      
      // Warn if load time exceeds 3 seconds on mobile
      if (this.isMobile && loadTime > 3000) {
        console.warn('Mobile load time exceeded 3 second target');
      }
      
      // Report performance metrics
      if (window.performance && window.performance.timing) {
        const timing = window.performance.timing;
        const metrics = {
          dns: timing.domainLookupEnd - timing.domainLookupStart,
          tcp: timing.connectEnd - timing.connectStart,
          ttfb: timing.responseStart - timing.requestStart,
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          load: timing.loadEventEnd - timing.navigationStart
        };
        console.log('Performance metrics:', metrics);
      }
    });
  }

  /**
   * Setup resize handler for responsive changes
   * Requirements: 8.1
   */
  setupResizeHandler() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newBreakpoint = this.getCurrentBreakpoint();
        const wasMobile = this.isMobile;
        
        this.isMobile = this.detectMobile();
        
        if (newBreakpoint !== this.currentBreakpoint) {
          this.currentBreakpoint = newBreakpoint;
          this.onBreakpointChange(newBreakpoint);
        }
        
        if (wasMobile !== this.isMobile) {
          if (this.isMobile) {
            this.applyMobileOptimizations();
          } else {
            this.removeMobileOptimizations();
          }
        }
      }, 150);
    });
  }

  /**
   * Handle breakpoint changes
   */
  onBreakpointChange(breakpoint) {
    document.body.dataset.breakpoint = breakpoint;
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('breakpointChange', {
      detail: { breakpoint, isMobile: this.isMobile }
    }));
  }

  /**
   * Setup touch optimizations
   * Requirements: 8.1, 8.3
   */
  setupTouchOptimizations() {
    if (!this.isTouch) return;
    
    document.body.classList.add('touch-device');
    
    // Prevent double-tap zoom on buttons
    document.querySelectorAll('.btn, .nav-link').forEach(el => {
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        el.click();
      }, { passive: false });
    });
    
    // Add touch feedback
    this.setupTouchFeedback();
    
    // Optimize scrolling
    this.optimizeScrolling();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100);
    });
  }

  /**
   * Setup touch feedback for interactive elements
   * Requirements: 8.1
   */
  setupTouchFeedback() {
    const interactiveElements = document.querySelectorAll('.btn, .nav-link, .card-header[data-bs-toggle]');
    
    interactiveElements.forEach(el => {
      el.addEventListener('touchstart', () => {
        el.classList.add('touch-active');
      }, { passive: true });
      
      el.addEventListener('touchend', () => {
        setTimeout(() => {
          el.classList.remove('touch-active');
        }, 150);
      }, { passive: true });
      
      el.addEventListener('touchcancel', () => {
        el.classList.remove('touch-active');
      }, { passive: true });
    });
  }

  /**
   * Optimize scrolling for touch devices
   * Requirements: 8.1
   */
  optimizeScrolling() {
    // Enable momentum scrolling
    const scrollableElements = document.querySelectorAll('.sidebar, .modal-body, .changes-list');
    scrollableElements.forEach(el => {
      el.style.webkitOverflowScrolling = 'touch';
    });
    
    // Prevent body scroll when modal is open
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('show.bs.modal', () => {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      });
      
      modal.addEventListener('hidden.bs.modal', () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      });
    });
  }

  /**
   * Handle orientation changes
   * Requirements: 8.1
   */
  handleOrientationChange() {
    // Recalculate viewport
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    // Update mobile state
    this.isMobile = this.detectMobile();
    this.currentBreakpoint = this.getCurrentBreakpoint();
  }

  /**
   * Setup collapsible navigation for mobile
   * Requirements: 8.2
   */
  setupCollapsibleNavigation() {
    // Convert card sections to collapsible on mobile
    if (this.isMobile) {
      this.convertToCollapsible();
    }
    
    // Listen for breakpoint changes
    window.addEventListener('breakpointChange', (e) => {
      if (e.detail.isMobile) {
        this.convertToCollapsible();
      } else {
        this.removeCollapsible();
      }
    });
  }

  /**
   * Convert sections to collapsible format
   * Requirements: 8.2
   */
  convertToCollapsible() {
    const categories = document.querySelectorAll('.channel-category, .role-category, .feature-card');
    
    categories.forEach((category, index) => {
      if (category.dataset.collapsible) return; // Already converted
      
      const header = category.querySelector('.card-header');
      const body = category.querySelector('.card-body');
      
      if (!header || !body) return;
      
      // Mark as collapsible
      category.dataset.collapsible = 'true';
      
      // Add collapse icon if not present
      if (!header.querySelector('.mobile-collapsible-icon')) {
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down mobile-collapsible-icon ms-auto';
        header.appendChild(icon);
      }
      
      // Setup click handler
      const toggleHandler = (e) => {
        if (window.innerWidth > this.breakpoints.sm) return;
        
        e.preventDefault();
        const isExpanded = body.classList.contains('show');
        
        if (isExpanded) {
          body.classList.remove('show');
          header.classList.remove('active');
        } else {
          body.classList.add('show');
          header.classList.add('active');
        }
      };
      
      header.addEventListener('click', toggleHandler);
      this.collapsibleSections.set(category, toggleHandler);
      
      // Collapse by default on mobile (except first)
      if (index > 0 && window.innerWidth <= this.breakpoints.sm) {
        body.classList.remove('show');
        header.classList.remove('active');
      } else {
        body.classList.add('show');
        header.classList.add('active');
      }
    });
  }

  /**
   * Remove collapsible behavior
   */
  removeCollapsible() {
    this.collapsibleSections.forEach((handler, category) => {
      const header = category.querySelector('.card-header');
      const body = category.querySelector('.card-body');
      
      if (header) {
        header.removeEventListener('click', handler);
        header.classList.remove('active');
        
        const icon = header.querySelector('.mobile-collapsible-icon');
        if (icon) icon.remove();
      }
      
      if (body) {
        body.classList.add('show');
        body.style.display = '';
      }
      
      delete category.dataset.collapsible;
    });
    
    this.collapsibleSections.clear();
  }

  /**
   * Setup mobile quick actions (FAB)
   * Requirements: 8.4
   */
  setupMobileQuickActions() {
    // Create quick actions container if it doesn't exist
    let quickActions = document.querySelector('.mobile-quick-actions');
    
    if (!quickActions) {
      quickActions = document.createElement('div');
      quickActions.className = 'mobile-quick-actions';
      quickActions.innerHTML = `
        <button class="mobile-fab fab-save" id="mobile-save-btn" title="Save Changes">
          <i class="fas fa-save"></i>
        </button>
      `;
      document.body.appendChild(quickActions);
      
      // Setup save button handler
      const saveBtn = document.getElementById('mobile-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const mainSaveBtn = document.getElementById('saveConfig');
          if (mainSaveBtn) {
            mainSaveBtn.click();
          }
        });
      }
    }
  }

  /**
   * Setup lazy loading for images and heavy content
   * Requirements: 8.5
   */
  setupLazyLoading() {
    // Use Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      const lazyObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            
            // Handle images
            if (el.tagName === 'IMG' && el.dataset.src) {
              el.src = el.dataset.src;
              el.removeAttribute('data-src');
            }
            
            // Handle lazy-load class
            el.classList.remove('lazy-load');
            el.classList.add('loaded');
            
            lazyObserver.unobserve(el);
          }
        });
      }, {
        rootMargin: '50px 0px',
        threshold: 0.01
      });
      
      // Observe lazy elements
      document.querySelectorAll('.lazy-load, img[data-src]').forEach(el => {
        lazyObserver.observe(el);
      });
    }
  }

  /**
   * Setup mobile-specific workflows
   * Requirements: 8.4
   */
  setupMobileWorkflows() {
    // Add wizard progress indicator for complex forms
    this.setupWizardProgress();
    
    // Simplify complex forms on mobile
    this.simplifyForms();
  }

  /**
   * Setup wizard progress indicator
   * Requirements: 8.4
   */
  setupWizardProgress() {
    const configSections = ['channels', 'roles', 'features', 'appearance'];
    
    // Create wizard element if on mobile
    if (this.isMobile) {
      const existingWizard = document.querySelector('.mobile-wizard');
      if (existingWizard) return;
      
      const wizard = document.createElement('div');
      wizard.className = 'mobile-wizard';
      wizard.innerHTML = `
        <div class="mobile-wizard-steps">
          ${configSections.map((section, index) => `
            <div class="mobile-wizard-step" data-section="${section}">
              <span class="mobile-wizard-number">${index + 1}</span>
              <span class="mobile-wizard-label">${section.charAt(0).toUpperCase() + section.slice(1)}</span>
            </div>
          `).join('')}
        </div>
      `;
      
      // Insert after section title
      const sectionTitle = document.querySelector('.border-bottom');
      if (sectionTitle) {
        sectionTitle.after(wizard);
      }
      
      // Update wizard on section change
      this.updateWizardProgress();
    }
  }

  /**
   * Update wizard progress based on current section
   */
  updateWizardProgress() {
    const wizard = document.querySelector('.mobile-wizard');
    if (!wizard) return;
    
    const currentSection = window.location.hash.slice(1) || 'overview';
    const steps = wizard.querySelectorAll('.mobile-wizard-step');
    let foundCurrent = false;
    
    steps.forEach(step => {
      const section = step.dataset.section;
      
      if (section === currentSection) {
        step.classList.add('active');
        step.classList.remove('completed');
        foundCurrent = true;
      } else if (!foundCurrent) {
        step.classList.add('completed');
        step.classList.remove('active');
      } else {
        step.classList.remove('active', 'completed');
      }
    });
  }

  /**
   * Simplify forms for mobile
   * Requirements: 8.4
   */
  simplifyForms() {
    if (!this.isMobile) return;
    
    // Add helper text for complex inputs
    document.querySelectorAll('.form-select').forEach(select => {
      if (!select.nextElementSibling?.classList.contains('form-text')) {
        const helpText = document.createElement('small');
        helpText.className = 'form-text text-muted';
        helpText.textContent = 'Tap to select';
        select.after(helpText);
      }
    });
    
    // Add clear buttons to text inputs
    document.querySelectorAll('.form-control[type="text"]').forEach(input => {
      if (input.parentElement.querySelector('.btn-clear')) return;
      
      const wrapper = document.createElement('div');
      wrapper.className = 'input-group';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'btn btn-outline-secondary btn-clear';
      clearBtn.innerHTML = '<i class="fas fa-times"></i>';
      clearBtn.style.display = input.value ? 'block' : 'none';
      wrapper.appendChild(clearBtn);
      
      input.addEventListener('input', () => {
        clearBtn.style.display = input.value ? 'block' : 'none';
      });
      
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
      });
    });
  }

  /**
   * Apply mobile-specific optimizations
   * Requirements: 8.1, 8.5
   */
  applyMobileOptimizations() {
    document.body.classList.add('mobile-view');
    
    // Reduce animation complexity
    document.documentElement.style.setProperty('--animation-duration', '0.15s');
    
    // Defer non-critical resources
    this.deferNonCriticalResources();
    
    // Optimize images
    this.optimizeImages();
    
    // Setup pull-to-refresh (optional)
    // this.setupPullToRefresh();
  }

  /**
   * Remove mobile optimizations
   */
  removeMobileOptimizations() {
    document.body.classList.remove('mobile-view');
    document.documentElement.style.setProperty('--animation-duration', '0.3s');
  }

  /**
   * Defer non-critical resources
   * Requirements: 8.5
   */
  deferNonCriticalResources() {
    // Defer loading of non-visible sections
    const sections = document.querySelectorAll('.config-section:not(.active)');
    sections.forEach(section => {
      section.classList.add('lazy-load');
    });
  }

  /**
   * Optimize images for mobile
   * Requirements: 8.5
   */
  optimizeImages() {
    document.querySelectorAll('img').forEach(img => {
      // Add loading="lazy" attribute
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // Add decoding="async" for non-critical images
      if (!img.decoding) {
        img.decoding = 'async';
      }
    });
  }

  /**
   * Show mobile-friendly loading skeleton
   * Requirements: 8.5
   */
  showLoadingSkeleton(container) {
    const skeleton = document.createElement('div');
    skeleton.className = 'mobile-loading-skeleton';
    skeleton.innerHTML = `
      <div class="mobile-skeleton mobile-skeleton-card"></div>
      <div class="mobile-skeleton mobile-skeleton-form"></div>
      <div class="mobile-skeleton mobile-skeleton-form"></div>
      <div class="mobile-skeleton mobile-skeleton-text"></div>
      <div class="mobile-skeleton mobile-skeleton-text short"></div>
    `;
    
    container.innerHTML = '';
    container.appendChild(skeleton);
    
    return skeleton;
  }

  /**
   * Hide loading skeleton
   */
  hideLoadingSkeleton(container) {
    const skeleton = container.querySelector('.mobile-loading-skeleton');
    if (skeleton) {
      skeleton.remove();
    }
  }

  /**
   * Check if current view is mobile
   */
  isMobileView() {
    return this.isMobile;
  }

  /**
   * Get current breakpoint
   */
  getBreakpoint() {
    return this.currentBreakpoint;
  }
}

// Initialize mobile responsive when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileResponsive = new MobileResponsive();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileResponsive;
}
