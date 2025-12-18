const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "cuddle",
  description: "Cuddle someone!",
  action: "cuddle",
  apiEndpoint: "cuddle",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});