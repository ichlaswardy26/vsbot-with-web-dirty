const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "cringe",
  description: "Cringe!",
  action: "cringe",
  apiEndpoint: "cringe",
  requiresTarget: false, // cringe doesn't need a target
});