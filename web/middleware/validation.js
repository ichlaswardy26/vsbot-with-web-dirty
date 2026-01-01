/**
 * Validation Middleware
 * Request validation and sanitization
 */

const { body, param, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const crypto = require('crypto');

/**
 * Add unique request ID to each request
 */
function addRequestId(req, res, next) {
  req.requestId = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Validate request and return errors if any
 */
function validateRequest() {
  return (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.requestId
      });
    }
    next();
  };
}

/**
 * Validate Discord guild ID
 */
function validateGuildId(req, res, next) {
  const guildId = req.params.guildId;
  
  if (!guildId) {
    return res.status(400).json({
      success: false,
      error: 'Guild ID is required'
    });
  }
  
  // Discord snowflake validation (17-19 digits)
  if (!/^\d{17,19}$/.test(guildId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid guild ID format'
    });
  }
  
  next();
}

/**
 * Validate configuration section
 */
function validateConfigSection(req, res, next) {
  const section = req.params.section;
  const validSections = [
    'channels', 'roles', 'features', 'colors', 'emojis', 
    'images', 'language', 'categories', 'appearance'
  ];
  
  if (section && !validSections.includes(section)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid configuration section',
      validSections
    });
  }
  
  next();
}

/**
 * Sanitize input data
 */
function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Sanitize HTML and remove potentially dangerous content
      sanitized[key] = DOMPurify.sanitize(value, { 
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      }).trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate configuration structure
 */
function validateConfigStructure(req, res, next) {
  const config = req.body;
  
  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Configuration must be an object'
    });
  }
  
  // Validate specific sections if present
  const validationErrors = [];
  
  // Validate channels
  if (config.channels) {
    const channelErrors = validateChannelsSection(config.channels);
    validationErrors.push(...channelErrors);
  }
  
  // Validate roles
  if (config.roles) {
    const roleErrors = validateRolesSection(config.roles);
    validationErrors.push(...roleErrors);
  }
  
  // Validate features
  if (config.features) {
    const featureErrors = validateFeaturesSection(config.features);
    validationErrors.push(...featureErrors);
  }
  
  // Validate colors
  if (config.colors) {
    const colorErrors = validateColorsSection(config.colors);
    validationErrors.push(...colorErrors);
  }
  
  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Configuration validation failed',
      details: validationErrors
    });
  }
  
  next();
}

/**
 * Validate channels section
 */
function validateChannelsSection(channels) {
  const errors = [];
  
  for (const [key, channelId] of Object.entries(channels)) {
    if (channelId !== null && channelId !== undefined && channelId !== '') {
      if (typeof channelId !== 'string' || !/^\d{17,19}$/.test(channelId)) {
        errors.push({
          field: `channels.${key}`,
          message: 'Invalid channel ID format',
          value: channelId
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate roles section
 */
function validateRolesSection(roles) {
  const errors = [];
  
  for (const [key, roleId] of Object.entries(roles)) {
    if (roleId !== null && roleId !== undefined && roleId !== '') {
      if (typeof roleId !== 'string' || !/^\d{17,19}$/.test(roleId)) {
        errors.push({
          field: `roles.${key}`,
          message: 'Invalid role ID format',
          value: roleId
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate features section
 */
function validateFeaturesSection(features) {
  const errors = [];
  
  for (const [featureName, featureConfig] of Object.entries(features)) {
    if (typeof featureConfig !== 'object' || featureConfig === null) {
      errors.push({
        field: `features.${featureName}`,
        message: 'Feature configuration must be an object',
        value: featureConfig
      });
      continue;
    }
    
    // Validate enabled property
    if ('enabled' in featureConfig && typeof featureConfig.enabled !== 'boolean') {
      errors.push({
        field: `features.${featureName}.enabled`,
        message: 'Enabled property must be a boolean',
        value: featureConfig.enabled
      });
    }
    
    // Validate specific feature properties
    if (featureName === 'leveling') {
      if ('xpMin' in featureConfig && (!Number.isInteger(featureConfig.xpMin) || featureConfig.xpMin < 1)) {
        errors.push({
          field: `features.${featureName}.xpMin`,
          message: 'XP minimum must be a positive integer',
          value: featureConfig.xpMin
        });
      }
      
      if ('xpMax' in featureConfig && (!Number.isInteger(featureConfig.xpMax) || featureConfig.xpMax < 1)) {
        errors.push({
          field: `features.${featureName}.xpMax`,
          message: 'XP maximum must be a positive integer',
          value: featureConfig.xpMax
        });
      }
      
      if ('xpMin' in featureConfig && 'xpMax' in featureConfig && featureConfig.xpMin >= featureConfig.xpMax) {
        errors.push({
          field: `features.${featureName}`,
          message: 'XP minimum must be less than XP maximum',
          value: { xpMin: featureConfig.xpMin, xpMax: featureConfig.xpMax }
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate colors section
 */
function validateColorsSection(colors) {
  const errors = [];
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  
  for (const [key, color] of Object.entries(colors)) {
    if (color !== null && color !== undefined && color !== '') {
      if (typeof color !== 'string' || !hexColorRegex.test(color)) {
        errors.push({
          field: `colors.${key}`,
          message: 'Color must be a valid hex color (e.g., #FF0000)',
          value: color
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validation rules for specific endpoints
 */
const validationRules = {
  guildId: param('guildId').isLength({ min: 17, max: 19 }).isNumeric(),
  configSection: param('section').isIn([
    'channels', 'roles', 'features', 'colors', 'emojis', 
    'images', 'language', 'categories', 'appearance'
  ]),
  channelId: body('channelId').optional().isLength({ min: 17, max: 19 }).isNumeric(),
  roleId: body('roleId').optional().isLength({ min: 17, max: 19 }).isNumeric(),
  hexColor: body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  boolean: (field) => body(field).optional().isBoolean(),
  positiveInteger: (field) => body(field).optional().isInt({ min: 1 })
};

module.exports = {
  addRequestId,
  validateRequest,
  validateGuildId,
  validateConfigSection,
  sanitizeInput,
  validateConfigStructure,
  validationRules
};