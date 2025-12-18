const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "kick",
  description: "Kick someone! (fun)",
  action: "kick",
  apiEndpoint: "kick",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});