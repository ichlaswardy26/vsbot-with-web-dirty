const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "wave",
  description: "Wave!",
  action: "wave",
  apiEndpoint: "wave",
  requiresTarget: false, // wave doesn't need a target
});