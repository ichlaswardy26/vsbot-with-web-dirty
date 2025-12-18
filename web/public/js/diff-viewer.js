/**
 * Configuration Diff Viewer
 * Shows differences between current and new configuration values
 */
class DiffViewer {
  constructor() {
    this.modal = null;
    this.currentConfig = null;
    this.newConfig = null;
  }

  /**
   * Initialize the diff viewer modal
   */
  init() {
    if (this.modal) return;

    this.modal = document.createElement('div');
    this.modal.id = 'diff-viewer-modal';
    this.modal.className = 'diff-modal';
    this.modal.innerHTML = `
      <div class="diff-modal-content">
        <div class="diff-modal-header">
          <h5><i class="fas fa-code-compare me-2"></i>Configuration Changes</h5>
          <button class="diff-modal-close" aria-label="Close">&times;</button>
        </div>
        <div class="diff-modal-body">
          <div class="diff-section-tabs" id="diff-section-tabs"></div>
          <div class="diff-content" id="diff-content"></div>
        </div>
        <div class="diff-modal-footer">
          <button class="btn btn-secondary" id="diff-close-btn">Close</button>
          <button class="btn btn-primary" id="diff-apply-btn">Apply Changes</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.setupEventListeners();
    this.injectStyles();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.modal.querySelector('.diff-modal-close').addEventListener('click', () => this.hide());
    this.modal.querySelector('#diff-close-btn').addEventListener('click', () => this.hide());
    this.modal.querySelector('#diff-apply-btn').addEventListener('click', () => this.applyChanges());

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.hide();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display === 'flex') {
        this.hide();
      }
    });
  }

  /**
   * Show diff between two configurations
   */
  show(currentConfig, newConfig, section = null, onApply = null) {
    this.init();
    this.currentConfig = currentConfig;
    this.newConfig = newConfig;
    this.onApply = onApply;
    this.activeSection = section;

    const changes = this.computeChanges(currentConfig, newConfig);
    
    if (changes.length === 0) {
      if (window.notificationSystem) {
        window.notificationSystem.showNotification('No differences found', 'info');
      }
      return;
    }

    this.renderDiff(changes, section);
    this.modal.style.display = 'flex';
  }

  /**
   * Hide the diff viewer
   */
  hide() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  }

  /**
   * Compute changes between two objects
   */
  computeChanges(oldObj, newObj, path = '') {
    const changes = [];

    // Handle null/undefined
    if (!oldObj && !newObj) return changes;
    if (!oldObj) oldObj = {};
    if (!newObj) newObj = {};

    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const oldVal = oldObj[key];
      const newVal = newObj[key];

      if (this.isObject(oldVal) && this.isObject(newVal)) {
        // Recurse into nested objects
        changes.push(...this.computeChanges(oldVal, newVal, currentPath));
      } else if (!this.isEqual(oldVal, newVal)) {
        changes.push({
          path: currentPath,
          section: currentPath.split('.')[0],
          field: currentPath.split('.').slice(1).join('.') || key,
          oldValue: oldVal,
          newValue: newVal,
          type: this.getChangeType(oldVal, newVal)
        });
      }
    }

    return changes;
  }

  /**
   * Get change type
   */
  getChangeType(oldVal, newVal) {
    if (oldVal === undefined || oldVal === null || oldVal === '') return 'added';
    if (newVal === undefined || newVal === null || newVal === '') return 'removed';
    return 'modified';
  }

  /**
   * Check if value is a plain object
   */
  isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  /**
   * Check if two values are equal
   */
  isEqual(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    if (this.isObject(a) && this.isObject(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  /**
   * Render the diff view
   */
  renderDiff(changes, activeSection = null) {
    // Group changes by section
    const sections = {};
    changes.forEach(change => {
      if (!sections[change.section]) {
        sections[change.section] = [];
      }
      sections[change.section].push(change);
    });

    // Render section tabs
    const tabsContainer = this.modal.querySelector('#diff-section-tabs');
    const sectionNames = Object.keys(sections);
    
    if (sectionNames.length > 1) {
      tabsContainer.innerHTML = sectionNames.map((section, i) => `
        <button class="diff-tab ${(!activeSection && i === 0) || section === activeSection ? 'active' : ''}" 
                data-section="${section}">
          ${this.formatSectionName(section)}
          <span class="diff-tab-count">${sections[section].length}</span>
        </button>
      `).join('');
      tabsContainer.style.display = 'flex';

      // Tab click handlers
      tabsContainer.querySelectorAll('.diff-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          tabsContainer.querySelectorAll('.diff-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.renderSectionChanges(sections[tab.dataset.section]);
        });
      });
    } else {
      tabsContainer.style.display = 'none';
    }

    // Render first section or active section
    const initialSection = activeSection && sections[activeSection] ? activeSection : sectionNames[0];
    this.renderSectionChanges(sections[initialSection]);
  }

  /**
   * Render changes for a specific section
   */
  renderSectionChanges(changes) {
    const contentContainer = this.modal.querySelector('#diff-content');
    
    contentContainer.innerHTML = `
      <div class="diff-summary">
        <span class="diff-stat diff-added">${changes.filter(c => c.type === 'added').length} added</span>
        <span class="diff-stat diff-modified">${changes.filter(c => c.type === 'modified').length} modified</span>
        <span class="diff-stat diff-removed">${changes.filter(c => c.type === 'removed').length} removed</span>
      </div>
      <div class="diff-table">
        <div class="diff-table-header">
          <div class="diff-col-field">Field</div>
          <div class="diff-col-old">Current Value</div>
          <div class="diff-col-arrow"></div>
          <div class="diff-col-new">New Value</div>
        </div>
        ${changes.map(change => this.renderChangeRow(change)).join('')}
      </div>
    `;
  }

  /**
   * Render a single change row
   */
  renderChangeRow(change) {
    return `
      <div class="diff-row diff-${change.type}">
        <div class="diff-col-field">
          <span class="diff-field-name">${this.escapeHtml(change.field || change.path)}</span>
          <span class="diff-change-type diff-type-${change.type}">${change.type}</span>
        </div>
        <div class="diff-col-old">
          ${change.type !== 'added' ? this.formatValue(change.oldValue, 'old') : '<span class="diff-empty">—</span>'}
        </div>
        <div class="diff-col-arrow">
          <i class="fas fa-arrow-right"></i>
        </div>
        <div class="diff-col-new">
          ${change.type !== 'removed' ? this.formatValue(change.newValue, 'new') : '<span class="diff-empty">—</span>'}
        </div>
      </div>
    `;
  }

  /**
   * Format a value for display
   */
  formatValue(value, type) {
    if (value === undefined || value === null) {
      return '<span class="diff-null">null</span>';
    }
    if (typeof value === 'boolean') {
      return `<span class="diff-bool diff-bool-${value}">${value}</span>`;
    }
    if (typeof value === 'number') {
      return `<span class="diff-number">${value}</span>`;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '<span class="diff-empty-array">[]</span>';
      return `<span class="diff-array">[${value.map(v => this.escapeHtml(String(v))).join(', ')}]</span>`;
    }
    if (typeof value === 'object') {
      return `<pre class="diff-object">${this.escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
    }
    return `<span class="diff-string">${this.escapeHtml(String(value))}</span>`;
  }

  /**
   * Format section name
   */
  formatSectionName(section) {
    return section.charAt(0).toUpperCase() + section.slice(1);
  }

  /**
   * Escape HTML
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Apply the changes
   */
  applyChanges() {
    if (this.onApply && typeof this.onApply === 'function') {
      this.onApply(this.newConfig);
    }
    this.hide();
  }

  /**
   * Inject CSS styles
   */
  injectStyles() {
    if (document.getElementById('diff-viewer-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'diff-viewer-styles';
    styles.textContent = `
      .diff-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10000;
        justify-content: center;
        align-items: center;
        padding: 20px;
      }

      .diff-modal-content {
        background: var(--card-bg, #1e1e2e);
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      }

      .diff-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #333);
      }

      .diff-modal-header h5 {
        margin: 0;
        color: var(--text-color, #fff);
        font-size: 1.1rem;
      }

      .diff-modal-close {
        background: none;
        border: none;
        color: var(--text-muted, #888);
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .diff-modal-close:hover {
        color: var(--text-color, #fff);
      }

      .diff-modal-body {
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      .diff-section-tabs {
        display: flex;
        gap: 4px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border-color, #333);
        background: var(--bg-secondary, #252535);
      }

      .diff-tab {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--text-muted, #888);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .diff-tab:hover {
        background: var(--bg-hover, #333);
        color: var(--text-color, #fff);
      }

      .diff-tab.active {
        background: var(--primary-color, #5865f2);
        color: #fff;
      }

      .diff-tab-count {
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.75rem;
      }

      .diff-content {
        padding: 20px;
      }

      .diff-summary {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
      }

      .diff-stat {
        padding: 4px 12px;
        border-radius: 4px;
        font-size: 0.85rem;
      }

      .diff-stat.diff-added {
        background: rgba(67, 181, 129, 0.2);
        color: #43b581;
      }

      .diff-stat.diff-modified {
        background: rgba(250, 166, 26, 0.2);
        color: #faa61a;
      }

      .diff-stat.diff-removed {
        background: rgba(240, 71, 71, 0.2);
        color: #f04747;
      }

      .diff-table {
        border: 1px solid var(--border-color, #333);
        border-radius: 8px;
        overflow: hidden;
      }

      .diff-table-header {
        display: grid;
        grid-template-columns: 200px 1fr 40px 1fr;
        background: var(--bg-secondary, #252535);
        padding: 12px 16px;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--text-muted, #888);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .diff-row {
        display: grid;
        grid-template-columns: 200px 1fr 40px 1fr;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color, #333);
        align-items: center;
      }

      .diff-row.diff-added {
        background: rgba(67, 181, 129, 0.05);
      }

      .diff-row.diff-modified {
        background: rgba(250, 166, 26, 0.05);
      }

      .diff-row.diff-removed {
        background: rgba(240, 71, 71, 0.05);
      }

      .diff-col-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .diff-field-name {
        font-weight: 500;
        color: var(--text-color, #fff);
        word-break: break-word;
      }

      .diff-change-type {
        font-size: 0.7rem;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 3px;
        width: fit-content;
      }

      .diff-type-added {
        background: rgba(67, 181, 129, 0.2);
        color: #43b581;
      }

      .diff-type-modified {
        background: rgba(250, 166, 26, 0.2);
        color: #faa61a;
      }

      .diff-type-removed {
        background: rgba(240, 71, 71, 0.2);
        color: #f04747;
      }

      .diff-col-old, .diff-col-new {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.85rem;
        word-break: break-word;
      }

      .diff-col-old {
        color: #f04747;
      }

      .diff-col-new {
        color: #43b581;
      }

      .diff-col-arrow {
        text-align: center;
        color: var(--text-muted, #888);
      }

      .diff-empty, .diff-null {
        color: var(--text-muted, #666);
        font-style: italic;
      }

      .diff-bool-true {
        color: #43b581;
      }

      .diff-bool-false {
        color: #f04747;
      }

      .diff-object {
        margin: 0;
        padding: 8px;
        background: var(--bg-secondary, #252535);
        border-radius: 4px;
        font-size: 0.8rem;
        max-height: 100px;
        overflow: auto;
      }

      .diff-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid var(--border-color, #333);
      }

      @media (max-width: 768px) {
        .diff-table-header,
        .diff-row {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .diff-col-arrow {
          display: none;
        }

        .diff-col-old::before {
          content: 'Current: ';
          color: var(--text-muted, #888);
        }

        .diff-col-new::before {
          content: 'New: ';
          color: var(--text-muted, #888);
        }
      }
    `;
    document.head.appendChild(styles);
  }
}

// Create global instance
window.diffViewer = new DiffViewer();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiffViewer;
}
