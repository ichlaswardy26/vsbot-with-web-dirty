const { ActivityType } = require("discord.js");
const logger = require("../../util/logger");
const introCommand = require("../../commands/test/intro");
const { checkGiveaways } = require("../../handlers/giveawayHandler"); // <-- tambahkan ini

module.exports = {
  name: "clientReady",
  exec: async (client) => {
    client.user.setPresence({
      activities: [{ name: `Villain Seraphyx`, type: ActivityType.Custom }],
    });

    // Log bot status when ready
    await logger.log('INFO', 'BOT', `Bot ${client.user.tag} is ready and online!`, {
      guildCount: client.guilds.cache.size,
      userCount: client.users.cache.size,
      uptime: process.uptime()
    });

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
