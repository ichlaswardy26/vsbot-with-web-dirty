const { EmbedBuilder, version: djsVersion } = require("discord.js");
const config = require("../../config.js");
const os = require("os");

module.exports = {
  name: "info",
  aliases: ["botinfo", "stats"],
  description: "Menampilkan informasi bot",
  category: "utility",
  async exec(client, message) {
    const uptime = formatUptime(client.uptime);
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    
    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis?.seraphyx || "🤖"} Informasi Bot`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setColor(config.colors?.primary || "#5865F2")
      .addFields(
        { 
          name: "📊 Statistik", 
          value: [
            `> 🏠 **Server:** ${client.guilds.cache.size}`,
            `> 👥 **User:** ${client.users.cache.size}`,
            `> 📁 **Channel:** ${client.channels.cache.size}`,
            `> ⚡ **Command:** ${client.commands?.size || 0}`
          ].join("\n"),
          inline: true 
        },
        { 
          name: "⚙️ Sistem", 
          value: [
            `> 💾 **RAM:** ${memUsage} MB`,
            `> 🖥️ **OS:** ${os.platform()}`,
            `> 📦 **Node:** ${process.version}`,
            `> 🔧 **Discord.js:** v${djsVersion}`
          ].join("\n"),
          inline: true 
        },
        { 
          name: "⏱️ Uptime", 
          value: `\`\`\`${uptime}\`\`\``,
          inline: false 
        },
        {
          name: "🔗 Link",
          value: `[Support Server](https://discord.gg/seraphyx) • [Invite Bot](https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands)`,
          inline: false
        }
      )
      .setFooter({ 
        text: `© 2025 Villain Seraphyx • Diminta oleh ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};

function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0) parts.push(`${seconds} detik`);
  
  return parts.join(" ") || "0 detik";
}
