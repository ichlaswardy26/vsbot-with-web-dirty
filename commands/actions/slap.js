const { createActionCommand } = require("../../util/actionCommandHelper");

// Using helper for cleaner, standardized action command
const command = createActionCommand({
  name: "slap",
  description: "Slap someone!",
  action: "slap",
  apiEndpoint: "slap",
  requiresTarget: true,
  allowSelf: false,
  allowBot: false,
});

// Add aliases
command.aliases = ["tampol"];

module.exports = command;