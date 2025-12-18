const Responder = require('../../schemas/autoresponder');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');

module.exports = {
  name: 'listresponder',
  aliases: ["listres"],
  description: 'Tampilkan daftar semua autoresponder',
  category: 'autores',
  async exec(client, message) {
    const rolePermissions = require("../../util/rolePermissions");
    
    const permissionError = rolePermissions.checkPermission(message.member, 'admin');
    if (permissionError) {
      return message.reply(permissionError);
    }
    
    try {
      const responders = await Responder.find();
      if (responders.length === 0) {
        const emptyEmbed = new EmbedBuilder()
          .setColor(config.colors?.warning || '#FEE75C')
          .setTitle(`${config.emojis?.info || 'ℹ️'} Tidak Ada Autoresponder`)
          .setDescription(`Belum ada autoresponder yang dibuat.\nGunakan \`${config.prefix}addres\` untuk menambahkan.`)
          .setTimestamp();
        return message.reply({ embeds: [emptyEmbed] });
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors?.primary || '#5865F2')
        .setTitle('📋 Daftar Autoresponder')
        .setDescription(`Total: **${responders.length}** autoresponder`)
        .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
        .setTimestamp();

      const respondersToShow = responders.slice(0, 10);

      respondersToShow.forEach((r, index) => {
        const position = index + 1;
        embed.addFields({ 
          name: `#${position} 🎯 ${r.trigger}`, 
          value: `💬 ${r.response.substring(0, 100)}${r.response.length > 100 ? '...' : ''}`, 
          inline: false 
        });
      });

      embed.setFooter({ 
        text: `Halaman 1/${Math.ceil(responders.length / 10)} • Diminta oleh ${message.author.username}`, 
        iconURL: message.author.displayAvatarURL() 
      });

      let row;
      if (responders.length > 10) {
        row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('more_responders')
              .setLabel('📄 Halaman Selanjutnya')
              .setStyle(ButtonStyle.Primary),
          );
      }

      const replyMessage = await message.reply({ embeds: [embed], components: row ? [row] : [] });

      if (row) {
        const filter = i => {
          i.deferUpdate();
          return i.customId === 'more_responders' && i.user.id === message.author.id;
        };

        const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });
        let currentPage = 1;

        collector.on('collect', async i => {
          currentPage++;
          const startIndex = (currentPage - 1) * 10;
          const nextResponders = responders.slice(startIndex, startIndex + 10);

          if (nextResponders.length === 0) {
            currentPage = 1;
            const firstResponders = responders.slice(0, 10);
            const newEmbed = new EmbedBuilder()
              .setColor(config.colors?.primary || '#5865F2')
              .setTitle('📋 Daftar Autoresponder')
              .setDescription(`Total: **${responders.length}** autoresponder`)
              .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
              .setTimestamp();

            firstResponders.forEach((r, index) => {
              newEmbed.addFields({ 
                name: `#${index + 1} 🎯 ${r.trigger}`, 
                value: `💬 ${r.response.substring(0, 100)}${r.response.length > 100 ? '...' : ''}`, 
                inline: false 
              });
            });

            newEmbed.setFooter({ 
              text: `Halaman 1/${Math.ceil(responders.length / 10)} • Diminta oleh ${message.author.username}`, 
              iconURL: message.author.displayAvatarURL() 
            });

            await i.editReply({ embeds: [newEmbed], components: [row] });
            return;
          }

          const newEmbed = new EmbedBuilder()
            .setColor(config.colors?.primary || '#5865F2')
            .setTitle('📋 Daftar Autoresponder')
            .setDescription(`Total: **${responders.length}** autoresponder`)
            .setThumbnail(message.guild.iconURL({ dynamic: true, size: 256 }))
            .setTimestamp();

          nextResponders.forEach((r, index) => {
            const position = startIndex + index + 1;
            newEmbed.addFields({ 
              name: `#${position} 🎯 ${r.trigger}`, 
              value: `💬 ${r.response.substring(0, 100)}${r.response.length > 100 ? '...' : ''}`, 
              inline: false 
            });
          });

          newEmbed.setFooter({ 
            text: `Halaman ${currentPage}/${Math.ceil(responders.length / 10)} • Diminta oleh ${message.author.username}`, 
            iconURL: message.author.displayAvatarURL() 
          });

          await i.editReply({ embeds: [newEmbed], components: [row] });
        });

        collector.on('end', () => {
          row.components[0].setDisabled(true);
          replyMessage.edit({ components: [row] }).catch(() => {});
        });
      }

    } catch (err) {
      console.error(err);
      const errorEmbed = new EmbedBuilder()
        .setColor(config.colors?.error || '#ED4245')
        .setTitle(`${config.emojis?.cross || '❌'} Terjadi Kesalahan`)
        .setDescription('Gagal menampilkan daftar autoresponder.')
        .setTimestamp();
      message.reply({ embeds: [errorEmbed] });
    }
  },
};