const { EmbedBuilder } = require("discord.js");
const config = require("../../config.js");

module.exports = {
  name: "ping",
  description: "Cek latensi bot",
  category: "utility",
  async exec(client, message) {
    const msg = await message.channel.send("🏓 Mengecek latensi...");

    const ping = msg.createdTimestamp - message.createdTimestamp;
    const apiPing = client.ws.ping;
    
    // Determine status based on ping
    let status, statusColor;
    if (ping < 100) {
      status = "🟢 Sangat Baik";
      statusColor = config.colors?.success || "#57F287";
    } else if (ping < 200) {
      status = "🟡 Baik";
      statusColor = config.colors?.warning || "#FEE75C";
    } else {
      status = "🔴 Lambat";
      statusColor = config.colors?.error || "#ED4245";
    }

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setDescription(`Status koneksi bot saat ini`)
      .addFields(
        { name: "📡 Latensi Bot", value: `\`${ping}ms\``, inline: true },
        { name: "🌐 Latensi API", value: `\`${apiPing}ms\``, inline: true },
        { name: "📊 Status", value: status, inline: true }
      )
      .setColor(statusColor)
      .setFooter({ 
        text: `Diminta oleh ${message.author.username}`, 
        iconURL: message.author.displayAvatarURL({ dynamic: true }) 
      })
      .setTimestamp();
      
    msg.edit({ content: null, embeds: [embed] });
  }
};
