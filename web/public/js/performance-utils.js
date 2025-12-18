/**
 * Performance Utilities for Web Dashboard
 * Provides lazy loading, caching, and performance optimization
 * Requirements: 8.5 - Mobile performance requirement (3 second load)
 */

class PerformanceUtils {
  constructor() {
    this.loadedModules = new Set();
    this.modulePromises = new Map();
    this.intersectionObserver = null;
    this.performanceMarks = new Map();
    this.resourceHints = [];
    
    this.init();
  }

  init() {
    // Setup intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Preload critical resources
    this.preloadCriticalResources();
  }

  // ==================== LAZY LOADING ====================

  /**
   * Setup intersection observer for lazy loading elements
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => this.handleIntersection(entries),
        {
          rootMargin: '100px',
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Handle intersection events for lazy loading
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        // Handle lazy images
        if (element.dataset.lazySrc) {
          this.loadLazyImage(element);
        }
        
        // Handle lazy sections
        if (element.dataset.lazySection) {
          this.loadLazySection(element.dataset.lazySection);
        }
        
        // Stop observing once loaded
        this.intersectionObserver.unobserve(element);
      }
    });
  }

  /**
   * Load lazy image
   */
  loadLazyImage(img) {
    const src = img.dataset.lazySrc;
    if (src) {
      img.src = src;
      img.removeAttribute('data-lazy-src');
      img.classList.add('lazy-loaded');
    }
  }

  /**
   * Register element for lazy loading
   */
  observeLazyElement(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      if (element.dataset.lazySrc) {
        this.loadLazyImage(element);
      }
      if (element.dataset.lazySection) {
        this.loadLazySection(element.dataset.lazySection);
      }
    }
  }

  /**
   * Lazy load a configuration section
   */
  async loadLazySection(sectionName) {
    if (this.loadedModules.has(sectionName)) {
      return Promise.resolve();
    }

    // Check if already loading
    if (this.modulePromises.has(sectionName)) {
      return this.modulePromises.get(sectionName);
    }

    const loadPromise = this.doLoadSection(sectionName);
    this.modulePromises.set(sectionName, loadPromise);
    
    try {
      await loadPromise;
      this.loadedModules.add(sectionName);
    } finally {
      this.modulePromises.delete(sectionName);
    }

    return loadPromise;
  }

  /**
   * Actually load a section's resources
   */
  async doLoadSection(sectionName) {
    const sectionScripts = {
      channels: '/js/channels-config.js',
      roles: '/js/roles-config.js',
      features: '/js/features-config.js',
      appearance: '/js/appearance-config.js'
    };

    const scriptUrl = sectionScripts[sectionName];
    if (scriptUrl && !this.isScriptLoaded(scriptUrl)) {
      await this.loadScript(scriptUrl);
    }
  }

  /**
   * Check if a script is already loaded
   */
  isScriptLoaded(url) {
    return document.querySelector(`script[src="${url}"]`) !== null;
  }

  /**
   * Dynamically load a script
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  // ==================== SKELETON SCREENS ====================

  /**
   * Create skeleton loading placeholder
   */
  createSkeleton(type = 'card', count = 1) {
    const skeletons = [];
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-wrapper';
      skeleton.setAttribute('aria-hidden', 'true');
      skeleton.setAttribute('role', 'presentation');
      
      switch (type) {
        case 'card':
          skeleton.innerHTML = this.getCardSkeleton();
          break;
        case 'form':
          skeleton.innerHTML = this.getFormSkeleton();
          break;
        case 'list':
          skeleton.innerHTML = this.getListSkeleton();
          break;
        case 'stat':
          skeleton.innerHTML = this.getStatSkeleton();
          break;
        default:
          skeleton.innerHTML = this.getCardSkeleton();
      }
      
      skeletons.push(skeleton);
    }
    
    return skeletons;
  }

  getCardSkeleton() {
    return `
      <div class="skeleton-card">
        <div class="skeleton-header">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-badge"></div>
        </div>
        <div class="skeleton-body">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
    `;
  }

  getFormSkeleton() {
    return `
      <div class="skeleton-form">
        <div class="skeleton-form-group">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-input"></div>
        </div>
        <div class="skeleton-form-group">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-input"></div>
        </div>
        <div class="skeleton-form-group">
          <div class="skeleton skeleton-label"></div>
          <div class="skeleton skeleton-select"></div>
        </div>
      </div>
    `;
  }

  getListSkeleton() {
    return `
      <div class="skeleton-list">
        <div class="skeleton-list-item">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-list-content">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
        <div class="skeleton-list-item">
          <div class="skeleton skeleton-avatar"></div>
          <div class="skeleton-list-content">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
      </div>
    `;
  }

  getStatSkeleton() {
    return `
      <div class="skeleton-stat">
        <div class="skeleton skeleton-stat-icon"></div>
        <div class="skeleton skeleton-stat-value"></div>
        <div class="skeleton skeleton-stat-label"></div>
      </div>
    `;
  }

  /**
   * Show skeleton loading state in container
   */
  showLoadingSkeleton(container, type = 'card', count = 1) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    
    if (!container) return;
    
    // Store original content
    container.dataset.originalContent = container.innerHTML;
    
    // Clear and add skeletons
    container.innerHTML = '';
    const skeletons = this.createSkeleton(type, count);
    skeletons.forEach(skeleton => container.appendChild(skeleton));
    
    container.classList.add('loading-skeleton');
  }

  /**
   * Hide skeleton and restore/show content
   */
  hideLoadingSkeleton(container, newContent = null) {
    if (typeof container === 'string') {
      container = document.getElementById(container);
    }
    
    if (!container) return;
    
    container.classList.remove('loading-skeleton');
    
    if (newContent) {
      container.innerHTML = newContent;
    } else if (container.dataset.originalContent) {
      container.innerHTML = container.dataset.originalContent;
      delete container.dataset.originalContent;
    }
    
    // Remove skeleton wrappers
    container.querySelectorAll('.skeleton-wrapper').forEach(el => el.remove());
  }

  // ==================== PERFORMANCE MONITORING ====================

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Track page load performance
    if (window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => this.reportLoadMetrics(), 0);
      });
    }
  }

  /**
   * Mark performance timing
   */
  mark(name) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
    this.performanceMarks.set(name, performance.now());
  }

  /**
   * Measure between two marks
   */
  measure(name, startMark, endMark) {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch (e) {
        // Marks may not exist
      }
    }
    
    const start = this.performanceMarks.get(startMark);
    const end = this.performanceMarks.get(endMark) || performance.now();
    
    if (start) {
      return end - start;
    }
    return null;
  }

  /**
   * Report load metrics
   */
  reportLoadMetrics() {
    if (!window.performance) return;
    
    const timing = performance.timing;
    const metrics = {
      // Navigation timing
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      download: timing.responseEnd - timing.responseStart,
      domInteractive: timing.domInteractive - timing.navigationStart,
      domComplete: timing.domComplete - timing.navigationStart,
      loadComplete: timing.loadEventEnd - timing.navigationStart
    };
    
    // Log metrics in development (check if not production via window location)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isDev) {
      console.log('Performance Metrics:', metrics);
    }
    
    // Check mobile performance requirement (3 seconds)
    const isMobile = window.innerWidth <= 767.98;
    if (isMobile && metrics.loadComplete > 3000) {
      console.warn(`Mobile load time (${metrics.loadComplete}ms) exceeds 3 second target`);
    }
    
    return metrics;
  }

  // ==================== RESOURCE OPTIMIZATION ====================

  /**
   * Preload critical resources
   */
  preloadCriticalResources() {
    // Preconnect to external domains
    this.addResourceHint('preconnect', 'https://cdn.jsdelivr.net');
    this.addResourceHint('preconnect', 'https://cdnjs.cloudflare.com');
    
    // DNS prefetch for API endpoints
    this.addResourceHint('dns-prefetch', window.location.origin);
  }

  /**
   * Add resource hint to document
   */
  addResourceHint(type, url) {
    if (this.resourceHints.includes(`${type}:${url}`)) return;
    
    const link = document.createElement('link');
    link.rel = type;
    link.href = url;
    
    if (type === 'preconnect') {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
    this.resourceHints.push(`${type}:${url}`);
  }

  /**
   * Prefetch a resource for future use
   */
  prefetch(url) {
    this.addResourceHint('prefetch', url);
  }

  /**
   * Preload a resource that will be needed soon
   */
  preload(url, as = 'script') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  }

  // ==================== DEBOUNCE & THROTTLE ====================

  /**
   * Debounce function calls
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(this, args);
    };
  }

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // ==================== REQUEST BATCHING ====================

  /**
   * Batch multiple API requests
   */
  batchRequests(requests, maxConcurrent = 3) {
    return new Promise((resolve, reject) => {
      const results = [];
      let currentIndex = 0;
      let completedCount = 0;
      
      const executeNext = async () => {
        if (currentIndex >= requests.length) return;
        
        const index = currentIndex++;
        const request = requests[index];
        
        try {
          results[index] = await request();
        } catch (error) {
          results[index] = { error };
        }
        
        completedCount++;
        
        if (completedCount === requests.length) {
          resolve(results);
        } else {
          executeNext();
        }
      };
      
      // Start initial batch
      const initialBatch = Math.min(maxConcurrent, requests.length);
      for (let i = 0; i < initialBatch; i++) {
        executeNext();
      }
    });
  }

  // ==================== PROGRESS BAR ====================

  /**
   * Show progress loading bar
   */
  showProgressBar(indeterminate = false) {
    const progressBar = document.getElementById('progressLoading');
    const bar = document.getElementById('progressLoadingBar');
    
    if (progressBar && bar) {
      progressBar.style.display = 'block';
      bar.style.width = '0%';
      
      if (indeterminate) {
        progressBar.classList.add('indeterminate');
      } else {
        progressBar.classList.remove('indeterminate');
      }
    }
  }

  /**
   * Update progress bar
   */
  updateProgressBar(percent) {
    const bar = document.getElementById('progressLoadingBar');
    if (bar) {
      bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
  }

  /**
   * Hide progress loading bar
   */
  hideProgressBar() {
    const progressBar = document.getElementById('progressLoading');
    const bar = document.getElementById('progressLoadingBar');
    
    if (progressBar && bar) {
      // Complete the bar first
      bar.style.width = '100%';
      
      setTimeout(() => {
        progressBar.style.display = 'none';
        progressBar.classList.remove('indeterminate');
        bar.style.width = '0%';
      }, 300);
    }
  }

  // ==================== IMAGE OPTIMIZATION ====================

  /**
   * Optimize image loading with placeholder
   */
  optimizeImage(img, options = {}) {
    const {
      placeholder = true,
      fadeIn = true,
      errorFallback = true
    } = options;

    // Add placeholder while loading
    if (placeholder && !img.complete) {
      img.classList.add('lazy-image');
      
      const wrapper = document.createElement('div');
      wrapper.className = 'image-placeholder';
      wrapper.innerHTML = '<i class="fas fa-image"></i>';
      
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);
    }

    // Handle load event
    img.addEventListener('load', () => {
      if (fadeIn) {
        img.classList.add('lazy-loaded');
      }
      
      // Remove placeholder wrapper
      const wrapper = img.closest('.image-placeholder');
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.insertBefore(img, wrapper);
        wrapper.remove();
      }
    });

    // Handle error
    if (errorFallback) {
      img.addEventListener('error', () => {
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
        img.classList.add('image-error');
      });
    }
  }

  /**
   * Compress image before upload (client-side)
   */
  async compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down if needed
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => resolve(blob),
            file.type,
            quality
          );
        };
        
        img.onerror = reject;
        img.src = e.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Create global instance
window.performanceUtils = new PerformanceUtils();
