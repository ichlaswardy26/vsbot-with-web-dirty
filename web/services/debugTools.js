/**
 * Debug Tools for Web Dashboard Development
 * Provides debugging utilities, request tracing, and diagnostic endpoints.
 * 
 * Requirements: All error scenarios across requirements
 */

const { errorHandler } = require('./errorHandler');
const { webLogger } = require('./webLogger');

/**
 * Debug mode flag
 */
const isDebugMode = process.env.NODE_ENV !== 'production' || process.env.DEBUG_MODE === 'true';

/**
 * Request tracer for debugging request flow
 */
class RequestTracer {
  constructor() {
    this.traces = new Map();
    this.maxTraces = 100;
  }

  /**
   * Start tracing a request
   */
  startTrace(requestId, req) {
    if (!isDebugMode) return;

    this.traces.set(requestId, {
      id: requestId,
      startTime: Date.now(),
      method: req.method,
      path: req.path,
      query: req.query,
      headers: this.sanitizeHeaders(req.headers),
      userId: req.user?.id,
      events: [],
      completed: false
    });

    this.addEvent(requestId, 'request_start', { path: req.path });
    this.cleanup();
  }

  /**
   * Add event to trace
   */
  addEvent(requestId, event, data = {}) {
    if (!isDebugMode) return;

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.events.push({
        event,
        timestamp: Date.now(),
        elapsed: Date.now() - trace.startTime,
        data
      });
    }
  }

  /**
   * Complete trace
   */
  completeTrace(requestId, statusCode, responseData = {}) {
    if (!isDebugMode) return;

    const trace = this.traces.get(requestId);
    if (trace) {
      trace.endTime = Date.now();
      trace.duration = trace.endTime - trace.startTime;
      trace.statusCode = statusCode;
      trace.completed = true;
      trace.responseSize = JSON.stringify(responseData).length;
      this.addEvent(requestId, 'request_complete', { statusCode, duration: trace.duration });
    }
  }

  /**
   * Get trace by ID
   */
  getTrace(requestId) {
    return this.traces.get(requestId);
  }

  /**
   * Get all traces
   */
  getAllTraces() {
    return Array.from(this.traces.values());
  }

  /**
   * Get recent traces
   */
  getRecentTraces(count = 20) {
    return Array.from(this.traces.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, count);
  }

  /**
   * Sanitize headers for logging (remove sensitive data)
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  /**
   * Cleanup old traces
   */
  cleanup() {
    if (this.traces.size > this.maxTraces) {
      const sortedKeys = Array.from(this.traces.keys())
        .sort((a, b) => {
          const traceA = this.traces.get(a);
          const traceB = this.traces.get(b);
          return traceA.startTime - traceB.startTime;
        });

      const toDelete = sortedKeys.slice(0, this.traces.size - this.maxTraces);
      for (const key of toDelete) {
        this.traces.delete(key);
      }
    }
  }

  /**
   * Clear all traces
   */
  clear() {
    this.traces.clear();
  }
}

/**
 * Performance monitor for tracking operation timings
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      api_response: 1000,      // 1 second
      db_query: 500,           // 500ms
      discord_api: 2000,       // 2 seconds
      config_save: 1000,       // 1 second
      validation: 100          // 100ms
    };
  }

  /**
   * Start timing an operation
   */
  startTimer(operationId) {
    return {
      operationId,
      startTime: process.hrtime.bigint()
    };
  }

  /**
   * End timing and record metric
   */
  endTimer(timer, category = 'general') {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - timer.startTime) / 1000000; // Convert to ms

    this.recordMetric(category, duration);

    // Check threshold
    const threshold = this.thresholds[category];
    if (threshold && duration > threshold) {
      webLogger.logPerformance(`slow_${category}`, duration, 'ms', {
        operationId: timer.operationId,
        threshold
      });
    }

    return duration;
  }

  /**
   * Record a metric
   */
  recordMetric(category, value) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, {
        count: 0,
        total: 0,
        min: Infinity,
        max: -Infinity,
        values: []
      });
    }

    const metric = this.metrics.get(category);
    metric.count++;
    metric.total += value;
    metric.min = Math.min(metric.min, value);
    metric.max = Math.max(metric.max, value);
    metric.values.push(value);

    // Keep only last 100 values for percentile calculations
    if (metric.values.length > 100) {
      metric.values.shift();
    }
  }

  /**
   * Get metrics summary
   */
  getMetrics() {
    const summary = {};
    for (const [category, metric] of this.metrics) {
      const sortedValues = [...metric.values].sort((a, b) => a - b);
      summary[category] = {
        count: metric.count,
        avg: metric.total / metric.count,
        min: metric.min,
        max: metric.max,
        p50: this.percentile(sortedValues, 50),
        p95: this.percentile(sortedValues, 95),
        p99: this.percentile(sortedValues, 99)
      };
    }
    return summary;
  }

  /**
   * Calculate percentile
   */
  percentile(sortedValues, p) {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.clear();
  }
}

// Singleton instances
const requestTracer = new RequestTracer();
const performanceMonitor = new PerformanceMonitor();

/**
 * Debug middleware for request tracing
 */
function debugMiddleware(req, res, next) {
  if (!isDebugMode) return next();

  requestTracer.startTrace(req.requestId, req);

  // Intercept response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    requestTracer.completeTrace(req.requestId, res.statusCode, data);
    return originalJson(data);
  };

  next();
}

/**
 * Create debug routes for development
 */
function createDebugRoutes(router) {
  if (!isDebugMode) {
    // Return empty router in production
    return router;
  }

  /**
   * GET /debug/traces
   * Get recent request traces
   */
  router.get('/traces', (req, res) => {
    const count = parseInt(req.query.count) || 20;
    res.json({
      success: true,
      data: requestTracer.getRecentTraces(count)
    });
  });

  /**
   * GET /debug/traces/:requestId
   * Get specific trace
   */
  router.get('/traces/:requestId', (req, res) => {
    const trace = requestTracer.getTrace(req.params.requestId);
    if (!trace) {
      return res.status(404).json({
        success: false,
        error: 'Trace not found'
      });
    }
    res.json({
      success: true,
      data: trace
    });
  });

  /**
   * GET /debug/errors
   * Get recent errors
   */
  router.get('/errors', (req, res) => {
    const count = parseInt(req.query.count) || 50;
    res.json({
      success: true,
      data: errorHandler.getRecentErrors(count)
    });
  });

  /**
   * GET /debug/errors/stats
   * Get error statistics
   */
  router.get('/errors/stats', (req, res) => {
    res.json({
      success: true,
      data: errorHandler.getErrorStats()
    });
  });

  /**
   * GET /debug/performance
   * Get performance metrics
   */
  router.get('/performance', (req, res) => {
    res.json({
      success: true,
      data: performanceMonitor.getMetrics()
    });
  });

  /**
   * GET /debug/system
   * Get system information
   */
  router.get('/system', (req, res) => {
    res.json({
      success: true,
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV
      }
    });
  });

  /**
   * POST /debug/clear
   * Clear debug data
   */
  router.post('/clear', (req, res) => {
    const { traces, errors, performance } = req.body;
    
    if (traces) requestTracer.clear();
    if (errors) errorHandler.clearErrorLog();
    if (performance) performanceMonitor.reset();

    res.json({
      success: true,
      message: 'Debug data cleared'
    });
  });

  /**
   * POST /debug/test-error
   * Test error handling (development only)
   */
  router.post('/test-error', (req, res, next) => {
    const { code, message } = req.body;
    const { WebDashboardError, ErrorCodes } = require('./errorHandler');
    
    const errorCode = ErrorCodes[code] || ErrorCodes.SERVER_INTERNAL_ERROR;
    next(new WebDashboardError(errorCode, message));
  });

  return router;
}

/**
 * Utility function to wrap async operations with timing
 */
async function timedOperation(category, operationId, fn) {
  const timer = performanceMonitor.startTimer(operationId);
  try {
    const result = await fn();
    performanceMonitor.endTimer(timer, category);
    return result;
  } catch (error) {
    performanceMonitor.endTimer(timer, `${category}_error`);
    throw error;
  }
}

module.exports = {
  isDebugMode,
  RequestTracer,
  PerformanceMonitor,
  requestTracer,
  performanceMonitor,
  debugMiddleware,
  createDebugRoutes,
  timedOperation
};
