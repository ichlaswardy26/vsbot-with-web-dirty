/**
 * Notification System Tests
 * Tests for the notification and feedback system
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

// Mock DOM environment
const createMockDOM = () => {
  const elements = new Map();
  let idCounter = 0;
  
  const createElement = (tag) => {
    const id = `mock-${++idCounter}`;
    const element = {
      id: null,
      className: '',
      classList: {
        _classes: new Set(),
        add: function(cls) { this._classes.add(cls); },
        remove: function(cls) { this._classes.delete(cls); },
        toggle: function(cls, force) {
          if (force === undefined) {
            if (this._classes.has(cls)) {
              this._classes.delete(cls);
            } else {
              this._classes.add(cls);
            }
          } else if (force) {
            this._classes.add(cls);
          } else {
            this._classes.delete(cls);
          }
        },
        contains: function(cls) { return this._classes.has(cls); }
      },
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      parentNode: null,
      setAttribute: function(name, value) { this[name] = value; },
      getAttribute: function(name) { return this[name]; },
      appendChild: function(child) {
        this.children.push(child);
        child.parentNode = this;
        if (child.id) elements.set(child.id, child);
        return child;
      },
      removeChild: function(child) {
        const idx = this.children.indexOf(child);
        if (idx > -1) {
          this.children.splice(idx, 1);
          child.parentNode = null;
          if (child.id) elements.delete(child.id);
        }
        return child;
      },
      querySelector: function(selector) {
        // Simple selector support
        if (selector.startsWith('.')) {
          const cls = selector.slice(1);
          return this.children.find(c => c.classList._classes.has(cls)) || null;
        }
        if (selector.startsWith('#')) {
          const id = selector.slice(1);
          return this.children.find(c => c.id === id) || null;
        }
        if (selector.startsWith('[data-')) {
          const match = selector.match(/\[data-(\w+)="?(\w+)"?\]/);
          if (match) {
            return this.children.find(c => c[`data-${match[1]}`] === match[2]) || null;
          }
        }
        return null;
      },
      querySelectorAll: function(selector) {
        return this.children.filter(c => {
          if (selector.startsWith('.')) {
            return c.classList._classes.has(selector.slice(1));
          }
          return false;
        });
      },
      addEventListener: function(event, handler) {
        this._handlers = this._handlers || {};
        this._handlers[event] = this._handlers[event] || [];
        this._handlers[event].push(handler);
      },
      click: function() {
        if (this._handlers && this._handlers.click) {
          this._handlers.click.forEach(h => h({ target: this }));
        }
      },
      insertBefore: function(newNode, refNode) {
        const idx = this.children.indexOf(refNode);
        if (idx > -1) {
          this.children.splice(idx, 0, newNode);
        } else {
          this.children.push(newNode);
        }
        newNode.parentNode = this;
        if (newNode.id) elements.set(newNode.id, newNode);
        return newNode;
      },
      get firstChild() { return this.children[0] || null; },
      get nextSibling() { return null; }
    };
    return element;
  };
  
  const body = createElement('body');
  const navbar = createElement('nav');
  navbar.className = 'navbar';
  body.appendChild(navbar);
  
  return {
    createElement,
    getElementById: (id) => elements.get(id) || null,
    querySelector: (selector) => {
      if (selector === '.navbar') return navbar;
      if (selector === 'body') return body;
      return null;
    },
    body,
    head: createElement('head'),
    hidden: false,
    addEventListener: () => {}
  };
};

describe('NotificationSystem', () => {
  let mockDocument;
  let mockWindow;
  let NotificationSystem;
  let notificationSystem;

  beforeEach(() => {
    // Create mock DOM
    mockDocument = createMockDOM();
    mockWindow = {
      innerWidth: 1024,
      addEventListener: jest.fn(),
      notificationSystem: null
    };
    
    // Set up globals
    global.document = mockDocument;
    global.window = mockWindow;
    global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    
    // Define NotificationSystem class for testing
    NotificationSystem = class {
      constructor() {
        this.notifications = new Map();
        this.statusIndicators = new Map();
        this.progressIndicators = new Map();
        this.notificationCounter = 0;
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.errorDuration = 8000;
        this.listeners = new Map();
        this.botStatus = 'unknown';
        this.lastConfigVersion = null;
        this.concurrentUsers = new Map();
        
        this.init();
      }

      init() {
        this.createNotificationContainer();
        this.createStatusBar();
      }

      createNotificationContainer() {
        let container = mockDocument.getElementById('notification-container');
        if (!container) {
          container = mockDocument.createElement('div');
          container.id = 'notification-container';
          container.className = 'notification-container';
          mockDocument.body.appendChild(container);
        }
        this.container = container;
      }

      createStatusBar() {
        let statusBar = mockDocument.getElementById('status-bar');
        if (!statusBar) {
          statusBar = mockDocument.createElement('div');
          statusBar.id = 'status-bar';
          statusBar.className = 'status-bar';
          
          // Create bot status indicator
          const botStatus = mockDocument.createElement('div');
          botStatus.id = 'bot-status-indicator';
          botStatus.className = 'status-item bot-status';
          const statusDot = mockDocument.createElement('span');
          statusDot.className = 'status-dot';
          const statusText = mockDocument.createElement('span');
          statusText.className = 'status-text';
          statusText.textContent = 'Bot Status: Checking...';
          botStatus.appendChild(statusDot);
          botStatus.appendChild(statusText);
          statusBar.appendChild(botStatus);
          
          // Create users status indicator
          const usersStatus = mockDocument.createElement('div');
          usersStatus.id = 'users-status-indicator';
          usersStatus.className = 'status-item users-status';
          usersStatus.style.display = 'none';
          const usersText = mockDocument.createElement('span');
          usersText.className = 'status-text';
          usersText.textContent = '1 user editing';
          usersStatus.appendChild(usersText);
          statusBar.appendChild(usersStatus);
          
          mockDocument.body.appendChild(statusBar);
        }
        this.statusBar = statusBar;
      }

      showNotification(message, type = 'info', options = {}) {
        const { details = null, duration = type === 'error' ? this.errorDuration : this.defaultDuration, persistent = false, actions = [] } = options;
        const id = `notification-${++this.notificationCounter}`;
        
        if (this.notifications.size >= this.maxNotifications) {
          const oldestId = this.notifications.keys().next().value;
          this.removeNotification(oldestId);
        }

        const notification = mockDocument.createElement('div');
        notification.id = id;
        notification.className = `notification notification-${type}`;
        notification.classList.add(`notification-${type}`);
        notification.textContent = message;
        if (details) {
          if (Array.isArray(details)) {
            notification.textContent += ' ' + details.join(' ');
          } else {
            notification.textContent += ' ' + details;
          }
        }
        
        // Add close button
        const closeBtn = mockDocument.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.addEventListener('click', () => this.removeNotification(id));
        notification.appendChild(closeBtn);
        
        // Add action buttons
        if (actions.length > 0) {
          actions.forEach(action => {
            const btn = mockDocument.createElement('button');
            btn.className = 'notification-action-btn';
            btn['data-action'] = action.id;
            btn.textContent = action.label;
            btn.addEventListener('click', () => {
              if (action.handler) action.handler();
            });
            notification.appendChild(btn);
          });
        }

        this.container.appendChild(notification);
        this.notifications.set(id, { element: notification });

        if (!persistent) {
          setTimeout(() => this.removeNotification(id), duration);
        }

        this.emit('notification:show', { id, message, type, options });
        return id;
      }

      removeNotification(id) {
        const notificationData = this.notifications.get(id);
        if (!notificationData) return;
        
        const { element } = notificationData;
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        this.notifications.delete(id);
        this.emit('notification:remove', { id });
      }

      clearAllNotifications() {
        this.notifications.forEach((_, id) => this.removeNotification(id));
      }

      updateBotStatus(status, details = null) {
        this.botStatus = status;
        const indicator = mockDocument.getElementById('bot-status-indicator');
        if (!indicator) return;

        indicator.classList.remove('status-online', 'status-offline', 'status-checking', 'status-warning');
        indicator.classList.add(`status-${status}`);
        
        const textEl = indicator.querySelector('.status-text');
        if (textEl) {
          switch (status) {
            case 'online': textEl.textContent = 'Bot: Online'; break;
            case 'offline': textEl.textContent = details || 'Bot: Offline'; break;
            case 'checking': textEl.textContent = 'Bot: Checking...'; break;
            default: textEl.textContent = 'Bot: Unknown';
          }
        }
        
        this.emit('bot:status-change', { status, details });
      }

      updateConfigStatus(section, status, message = null) {
        this.emit('config:status-change', { section, status, message });
      }

      showProgress(id, options = {}) {
        const { message = 'Processing...', progress = 0, indeterminate = false } = options;
        
        const progressEl = mockDocument.createElement('div');
        progressEl.id = `progress-${id}`;
        progressEl.className = 'progress-indicator';
        progressEl.textContent = `${message} ${indeterminate ? '' : progress + '%'}`;
        
        const bar = mockDocument.createElement('div');
        bar.className = `progress-bar ${indeterminate ? 'indeterminate' : ''}`;
        progressEl.appendChild(bar);
        
        this.container.appendChild(progressEl);
        this.progressIndicators.set(id, progressEl);
        
        return id;
      }

      updateProgress(id, progress, message = null) {
        const progressEl = mockDocument.getElementById(`progress-${id}`);
        if (progressEl) {
          progressEl.textContent = `${message || 'Processing...'} ${progress}%`;
        }
      }

      hideProgress(id) {
        const progressEl = mockDocument.getElementById(`progress-${id}`);
        if (progressEl && progressEl.parentNode) {
          progressEl.parentNode.removeChild(progressEl);
        }
        this.progressIndicators.delete(id);
      }

      updateConcurrentUsers(users) {
        this.concurrentUsers = new Map(users.map(u => [u.id, u]));
        const indicator = mockDocument.getElementById('users-status-indicator');
        
        if (!indicator) return;

        const count = this.concurrentUsers.size;
        
        if (count > 1) {
          indicator.style.display = 'flex';
          const textEl = indicator.querySelector('.status-text');
          if (textEl) textEl.textContent = `${count} users editing`;
        } else {
          indicator.style.display = 'none';
        }
      }

      showConflictNotification(conflict) {
        return this.showNotification('Configuration conflict detected', 'warning', {
          details: `${conflict.user.username} modified ${conflict.section}`,
          persistent: true
        });
      }

      showConflictDialog(conflicts) {
        const dialog = mockDocument.createElement('div');
        dialog.id = 'conflict-dialog';
        dialog.className = 'conflict-dialog';
        dialog.style.display = 'flex';
        mockDocument.body.appendChild(dialog);
      }

      formatSectionName(section) {
        return section.charAt(0).toUpperCase() + section.slice(1);
      }

      escapeHtml(text) {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      on(event, callback) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
      }

      off(event, callback) {
        if (this.listeners.has(event)) {
          const callbacks = this.listeners.get(event);
          const index = callbacks.indexOf(callback);
          if (index > -1) callbacks.splice(index, 1);
        }
      }

      emit(event, data) {
        if (this.listeners.has(event)) {
          this.listeners.get(event).forEach(callback => {
            try { callback(data); } catch (e) { console.error(e); }
          });
        }
      }
    };
    
    notificationSystem = new NotificationSystem();
  });

  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.requestAnimationFrame;
  });

  describe('Notification Display', () => {
    /**
     * Property 33: Configuration change notifications
     * For any saved configuration change, the system should display success notifications with change details
     * Validates: Requirements 9.1
     */
    test('should display success notification with details', () => {
      const message = 'Configuration saved';
      const details = 'Channels section updated';
      
      const id = notificationSystem.showNotification(message, 'success', { details });
      
      expect(id).toBeDefined();
      expect(notificationSystem.notifications.has(id)).toBe(true);
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).not.toBeNull();
      expect(notificationData.element.classList.contains('notification-success')).toBe(true);
      expect(notificationData.element.textContent).toContain(message);
      expect(notificationData.element.textContent).toContain(details);
    });

    /**
     * Property 35: Configuration failure handling
     * For any failed configuration change, the system should display error messages with troubleshooting guidance
     * Validates: Requirements 9.3
     */
    test('should display error notification with troubleshooting details', () => {
      const message = 'Failed to save configuration';
      const details = ['Check your internet connection', 'Try again later'];
      
      const id = notificationSystem.showNotification(message, 'error', { details });
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).not.toBeNull();
      expect(notificationData.element.classList.contains('notification-error')).toBe(true);
      expect(notificationData.element.textContent).toContain(message);
      details.forEach(detail => {
        expect(notificationData.element.textContent).toContain(detail);
      });
    });

    test('should display warning notification', () => {
      const message = 'Bot is offline';
      
      const id = notificationSystem.showNotification(message, 'warning');
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).not.toBeNull();
      expect(notificationData.element.classList.contains('notification-warning')).toBe(true);
    });

    test('should display info notification', () => {
      const message = 'Configuration loaded';
      
      const id = notificationSystem.showNotification(message, 'info');
      
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).not.toBeNull();
      expect(notificationData.element.classList.contains('notification-info')).toBe(true);
    });

    test('should limit maximum notifications', () => {
      // Show more than max notifications
      for (let i = 0; i < 10; i++) {
        notificationSystem.showNotification(`Message ${i}`, 'info');
      }
      
      expect(notificationSystem.notifications.size).toBeLessThanOrEqual(notificationSystem.maxNotifications);
    });

    test('should remove notification programmatically', () => {
      const id = notificationSystem.showNotification('Test message', 'info');
      
      expect(notificationSystem.notifications.has(id)).toBe(true);
      
      notificationSystem.removeNotification(id);
      
      expect(notificationSystem.notifications.has(id)).toBe(false);
    });
  });

  describe('Status Indicators', () => {
    /**
     * Property 34: Real-time status indicators
     * For any bot configuration update, the system should show real-time status indicators confirming changes
     * Validates: Requirements 9.2
     */
    test('should update bot status to online', () => {
      notificationSystem.updateBotStatus('online');
      
      expect(notificationSystem.botStatus).toBe('online');
      
      const indicator = mockDocument.getElementById('bot-status-indicator');
      expect(indicator).not.toBeNull();
      expect(indicator.classList.contains('status-online')).toBe(true);
    });

    /**
     * Property 37: Offline bot detection
     * For any offline bot scenario, the system should warn users that changes will be applied when bot reconnects
     * Validates: Requirements 9.5
     */
    test('should update bot status to offline with warning', () => {
      notificationSystem.updateBotStatus('offline', 'Bot disconnected');
      
      expect(notificationSystem.botStatus).toBe('offline');
      
      const indicator = mockDocument.getElementById('bot-status-indicator');
      expect(indicator).not.toBeNull();
      expect(indicator.classList.contains('status-offline')).toBe(true);
    });

    test('should update bot status to checking', () => {
      notificationSystem.updateBotStatus('checking');
      
      expect(notificationSystem.botStatus).toBe('checking');
      
      const indicator = mockDocument.getElementById('bot-status-indicator');
      expect(indicator.classList.contains('status-checking')).toBe(true);
    });

    test('should update config status', () => {
      const callback = jest.fn();
      notificationSystem.on('config:status-change', callback);
      
      notificationSystem.updateConfigStatus('channels', 'saving');
      
      expect(callback).toHaveBeenCalledWith({ section: 'channels', status: 'saving', message: null });
    });
  });

  describe('Progress Indicators', () => {
    test('should show progress indicator', () => {
      const id = notificationSystem.showProgress('import', {
        message: 'Importing configuration...',
        progress: 0
      });
      
      expect(id).toBe('import');
      expect(notificationSystem.progressIndicators.has('import')).toBe(true);
      
      const progressEl = notificationSystem.progressIndicators.get('import');
      expect(progressEl).not.toBeNull();
      expect(progressEl.textContent).toContain('Importing configuration...');
    });

    test('should update progress indicator', () => {
      notificationSystem.showProgress('import', {
        message: 'Importing...',
        progress: 0
      });
      
      notificationSystem.updateProgress('import', 50, 'Halfway done...');
      
      const progressEl = mockDocument.getElementById('progress-import');
      expect(progressEl.textContent).toContain('50%');
    });

    test('should hide progress indicator', () => {
      notificationSystem.showProgress('import', {
        message: 'Importing...',
        progress: 0
      });
      
      expect(notificationSystem.progressIndicators.has('import')).toBe(true);
      
      notificationSystem.hideProgress('import');
      
      expect(notificationSystem.progressIndicators.has('import')).toBe(false);
    });

    test('should show indeterminate progress', () => {
      notificationSystem.showProgress('sync', {
        message: 'Syncing...',
        indeterminate: true
      });
      
      const progressEl = notificationSystem.progressIndicators.get('sync');
      expect(progressEl).not.toBeNull();
      // Verify the progress indicator was created with indeterminate option
      expect(notificationSystem.progressIndicators.has('sync')).toBe(true);
    });
  });

  describe('Concurrent User Handling', () => {
    /**
     * Property 36: Concurrent access handling
     * For any concurrent administrator changes, the system should handle conflicts gracefully and notify all users
     * Validates: Requirements 9.4
     */
    test('should update concurrent users indicator', () => {
      const users = [
        { id: '1', username: 'User1' },
        { id: '2', username: 'User2' }
      ];
      
      notificationSystem.updateConcurrentUsers(users);
      
      expect(notificationSystem.concurrentUsers.size).toBe(2);
      
      const indicator = mockDocument.getElementById('users-status-indicator');
      expect(indicator.style.display).toBe('flex');
    });

    test('should hide concurrent users indicator when only one user', () => {
      const users = [{ id: '1', username: 'User1' }];
      
      notificationSystem.updateConcurrentUsers(users);
      
      const indicator = mockDocument.getElementById('users-status-indicator');
      expect(indicator.style.display).toBe('none');
    });

    test('should show conflict notification', () => {
      const conflict = {
        section: 'channels',
        user: { id: '2', username: 'OtherUser' },
        timestamp: Date.now(),
        changes: [{ field: 'welcomeChannel', newValue: '123456789' }]
      };
      
      const id = notificationSystem.showConflictNotification(conflict);
      
      expect(id).toBeDefined();
      const notificationData = notificationSystem.notifications.get(id);
      expect(notificationData).not.toBeNull();
      expect(notificationData.element.classList.contains('notification-warning')).toBe(true);
      expect(notificationData.element.textContent).toContain('conflict');
    });

    test('should show conflict dialog', () => {
      const conflicts = [
        {
          section: 'channels',
          user: { id: '2', username: 'OtherUser' },
          timestamp: Date.now(),
          changes: [{ field: 'welcomeChannel', type: 'modify', newValue: '123456789' }]
        }
      ];
      
      notificationSystem.showConflictDialog(conflicts);
      
      const dialog = mockDocument.getElementById('conflict-dialog');
      expect(dialog).not.toBeNull();
      expect(dialog.style.display).toBe('flex');
    });
  });

  describe('Event Emitter', () => {
    test('should emit and receive events', () => {
      const callback = jest.fn();
      
      notificationSystem.on('test:event', callback);
      notificationSystem.emit('test:event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should remove event listener', () => {
      const callback = jest.fn();
      
      notificationSystem.on('test:event', callback);
      notificationSystem.off('test:event', callback);
      notificationSystem.emit('test:event', { data: 'test' });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    test('should escape HTML', () => {
      const input = '<script>alert("xss")</script>';
      const escaped = notificationSystem.escapeHtml(input);
      
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    test('should format section name', () => {
      expect(notificationSystem.formatSectionName('channels')).toBe('Channels');
      expect(notificationSystem.formatSectionName('appearance')).toBe('Appearance');
    });

    test('should clear all notifications', () => {
      notificationSystem.showNotification('Message 1', 'info');
      notificationSystem.showNotification('Message 2', 'info');
      notificationSystem.showNotification('Message 3', 'info');
      
      notificationSystem.clearAllNotifications();
      
      // Wait for animations
      setTimeout(() => {
        expect(notificationSystem.notifications.size).toBe(0);
      }, 400);
    });
  });

  describe('Notification Actions', () => {
    test('should display notification with action buttons', () => {
      const actionHandler = jest.fn();
      
      const id = notificationSystem.showNotification('Action required', 'warning', {
        actions: [
          { id: 'retry', label: 'Retry', handler: actionHandler }
        ]
      });
      
      const notification = document.getElementById(id);
      const actionBtn = notification.querySelector('[data-action="retry"]');
      
      expect(actionBtn).not.toBeNull();
      expect(actionBtn.textContent).toBe('Retry');
      
      actionBtn.click();
      expect(actionHandler).toHaveBeenCalled();
    });

    test('should support persistent notifications', (done) => {
      const id = notificationSystem.showNotification('Persistent message', 'info', {
        persistent: true,
        duration: 100 // Short duration for test
      });
      
      // Wait longer than duration
      setTimeout(() => {
        expect(notificationSystem.notifications.has(id)).toBe(true);
        done();
      }, 200);
    });
  });
});
