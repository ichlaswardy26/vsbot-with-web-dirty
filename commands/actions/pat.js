const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "pat",
  description: "Pat someone!",
  action: "pat",
  apiEndpoint: "pat",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});