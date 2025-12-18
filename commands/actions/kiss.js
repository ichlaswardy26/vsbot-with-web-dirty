const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
const command = createActionCommand({
  name: "kiss",
  description: "Kiss someone!",
  action: "kiss",
  apiEndpoint: "kiss",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});

// Add aliases
command.aliases = ["kokop"];

module.exports = command;