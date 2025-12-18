const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ping",
  description: "Check bot latency",
  category: "utility",
  async exec(client, message) {
    const msg = await message.channel.send("Pinging...");

    const ping = msg.createdTimestamp - message.createdTimestamp;
    const apiPing = client.ws.ping;
    const embed = new EmbedBuilder()
      .setTitle("Pong!")
      .setDescription(`Bot Latency: ${ping}ms\nAPI Latency: ${apiPing}ms`)
      .setColor("Random")
      .setTimestamp();
    msg.edit({ content: null, embeds: [embed] });
  }
};
