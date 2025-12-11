// Input validation middleware

const validateUserId = (req, res, next) => {
  const { userId } = req.params;
  
  if (!userId || !/^\d{17,19}$/.test(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Discord User ID format'
    });
  }
  
  next();
};

const validateUserUpdate = (req, res, next) => {
  const { cash } = req.body;
  
  if (cash === undefined || cash === null) {
    return res.status(400).json({
      success: false,
      error: 'Cash value is required'
    });
  }
  
  const cashNum = parseInt(cash);
  if (isNaN(cashNum) || cashNum < 0) {
    return res.status(400).json({
      success: false,
      error: 'Cash must be a positive number'
    });
  }
  
  if (cashNum > 999999999) {
    return res.status(400).json({
      success: false,
      error: 'Cash value too large (max: 999,999,999)'
    });
  }
  
  next();
};

const validateLevelUpdate = (req, res, next) => {
  const { level, xp } = req.body;
  
  if (level === undefined || xp === undefined) {
    return res.status(400).json({
      success: false,
      error: 'Level and XP are required'
    });
  }
  
  const levelNum = parseInt(level);
  const xpNum = parseInt(xp);
  
  if (isNaN(levelNum) || levelNum < 1 || levelNum > 1000) {
    return res.status(400).json({
      success: false,
      error: 'Level must be between 1 and 1000'
    });
  }
  
  if (isNaN(xpNum) || xpNum < 0) {
    return res.status(400).json({
      success: false,
      error: 'XP must be a positive number'
    });
  }
  
  next();
};

const validateConfig = (req, res, next) => {
  const { config } = req.body;
  
  if (!config || typeof config !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Invalid configuration format'
    });
  }
  
  // Validate required fields
  const requiredFields = ['TOKEN', 'CLIENT_ID', 'GUILD_ID', 'MONGO_URI'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    });
  }
  
  next();
};

module.exports = {
  validateUserId,
  validateUserUpdate,
  validateLevelUpdate,
  validateConfig
};
