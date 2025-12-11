const handleButton = require('../../handlers/buttons');

module.exports = {
  name: "interactionCreate",
  async exec(client, interaction) {
    // Route all button/modal/select menu interactions to our handler
    if (interaction.isButton() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
      return await handleButton(client, interaction);
    }
  },
};
