const Responder = require('../../schemas/autoresponder');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'addresponder',
  aliases: ["addres"],
  description: 'Tambah autoresponder baru secara interaktif',
  category: 'autores',
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    const filter = response => response.author.id === message.author.id;

    const triggerEmbed = new EmbedBuilder()
      .setColor(config.colors?.primary || '#5865F2')
      .setTitle(`${config.emojis?.info || 'ℹ️'} Tambah Autoresponder`)
      .setDescription('Kirimkan **trigger** autoresponder (atau ketik `cancel` untuk membatalkan):')
      .setFooter({ text: 'Waktu: 30 detik' })
      .setTimestamp();

    await message.reply({ embeds: [triggerEmbed] });

    const collector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

    collector.on('collect', async (triggerMessage) => {
      const trigger = triggerMessage.content.toLowerCase();

      if (trigger === 'cancel') {
        const cancelEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`${config.emojis?.info || 'ℹ️'} Dibatalkan`)
          .setDescription('Proses penambahan autoresponder dibatalkan.')
          .setTimestamp();
        return message.reply({ embeds: [cancelEmbed] });
      }

      const responseEmbed = new EmbedBuilder()
        .setColor(config.colors?.primary || '#5865F2')
        .setTitle(`${config.emojis?.info || 'ℹ️'} Tambah Autoresponder`)
        .setDescription('Kirimkan **response** autoresponder (atau ketik `cancel` untuk membatalkan):')
        .addFields({ name: '🎯 Trigger', value: `\`${trigger}\``, inline: true })
        .setFooter({ text: 'Waktu: 30 detik' })
        .setTimestamp();

      await message.reply({ embeds: [responseEmbed] });

      const responseCollector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

      responseCollector.on('collect', async (responseMessage) => {
        const response = responseMessage.content;

        if (response.toLowerCase() === 'cancel') {
          const cancelEmbed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle(`${config.emojis?.info || 'ℹ️'} Dibatalkan`)
            .setDescription('Proses penambahan autoresponder dibatalkan.')
            .setTimestamp();
          return message.reply({ embeds: [cancelEmbed] });
        }

        try {
          const newResponder = new Responder({ trigger, response });
          await newResponder.save();

          const successEmbed = new EmbedBuilder()
            .setColor(config.colors?.success || '#57F287')
            .setTitle(`${config.emojis?.check || '✅'} Autoresponder Ditambahkan`)
            .setDescription('Autoresponder baru berhasil ditambahkan!')
            .addFields(
              { name: '🎯 Trigger', value: `\`${trigger}\``, inline: true },
              { name: '💬 Response', value: response.substring(0, 100) + (response.length > 100 ? '...' : ''), inline: false }
            )
            .setFooter({ text: `Ditambahkan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

          await message.reply({ embeds: [successEmbed] });
        } catch (err) {
          console.error(err);
          const errorEmbed = new EmbedBuilder()
            .setColor(config.colors?.error || '#ED4245')
            .setTitle(`${config.emojis?.cross || '❌'} Gagal Menambahkan`)
            .setDescription('Gagal menambahkan autoresponder. Mungkin sudah ada trigger yang sama.')
            .setTimestamp();

          await message.reply({ embeds: [errorEmbed] });
        }
      });

      responseCollector.on('end', (collected) => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setColor(config.colors?.warning || '#FEE75C')
            .setTitle(`${config.emojis?.info || 'ℹ️'} Waktu Habis`)
            .setDescription('Waktu habis! Autoresponder tidak ditambahkan.')
            .setTimestamp();

          message.reply({ embeds: [timeoutEmbed] });
        }
      });
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`${config.emojis?.info || 'ℹ️'} Waktu Habis`)
          .setDescription('Waktu habis! Autoresponder tidak ditambahkan.')
          .setTimestamp();

        message.reply({ embeds: [timeoutEmbed] });
      }
    });
  },
};