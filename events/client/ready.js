const { ActivityType } = require("discord.js");
const logStatus = require("../../util/logger");
const introCommand = require("../../commands/test/intro");
const { checkGiveaways } = require("../../handlers/giveawayHandler"); // <-- tambahkan ini

module.exports = {
  name: "clientReady",
  exec: async (client) => {
    client.user.setPresence({
      activities: [{ name: `Villain Seraphyx`, type: ActivityType.Custom }],
    });

    logStatus(client);

    // Jalankan sistem giveaway di sini
    await checkGiveaways(client);
    console.log('🎁 Giveaway system initialized and monitoring...');

    if (!client.introHandlersRegistered) {
      introCommand.exec(client, {
        channel: {
          send: () => {},
        },
      });
    }
  },
};
