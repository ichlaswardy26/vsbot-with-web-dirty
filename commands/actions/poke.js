const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "poke",
  description: "Poke someone!",
  action: "poke",
  apiEndpoint: "poke",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});