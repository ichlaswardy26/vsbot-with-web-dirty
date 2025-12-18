const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
module.exports = createActionCommand({
  name: "kill",
  description: "Kill someone! (fun)",
  action: "kill",
  apiEndpoint: "kill",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});