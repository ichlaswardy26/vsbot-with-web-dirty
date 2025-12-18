const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "cry",
  description: "Cry!",
  action: "cry",
  apiEndpoint: "cry",
  requiresTarget: false, // cry doesn't need a target
});