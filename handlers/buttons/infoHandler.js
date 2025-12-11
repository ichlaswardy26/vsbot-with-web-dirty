const { EmbedBuilder } = require('discord.js');
const config = require('../../config.js');

/**
 * Handle info-related dropdown interactions
 * @param {Client} client Discord client instance
 * @param {Interaction} interaction Select menu interaction object
 */
async function infoHandler(client, interaction) {
  const selected = interaction.values[0];
  let responseEmbed;

  switch (selected) {
    case 'roles':
      responseEmbed = new EmbedBuilder()
        .setTitle(`${config.emojis.roles} Information Role`)
        .setDescription(`───────୨ৎ───────
⚝ ${config.roles.owner ? `<@&${config.roles.owner}>` : '@Owner'} — **Owner**
⚝ ${config.roles.coOwner ? `<@&${config.roles.coOwner}>` : '@Co-Owner'} — **Co-Owner**
⚝ ${config.roles.engineer ? `<@&${config.roles.engineer}>` : '@Engineer'} — **Engineer**
⚝ ${config.roles.admin ? `<@&${config.roles.admin}>` : '@Admin'} — **Admin**
⚝ ${config.roles.moderator ? `<@&${config.roles.moderator}>` : '@Moderator'} — **Moderator**
⚝ ${config.roles.eventOrganizer ? `<@&${config.roles.eventOrganizer}>` : '@Event Organizer'} — **Event Organizer**
⚝ ${config.roles.partnerManager ? `<@&${config.roles.partnerManager}>` : '@Partner Manager'} — **Partner Manager**
⚝ ${config.roles.designer ? `<@&${config.roles.designer}>` : '@Designer'} — **Designer**
───────୨ৎ───────`)
        .setColor(0xffffff);
      break;

    case 'list':
      responseEmbed = new EmbedBuilder()
        .setTitle(`${config.emojis.info} Information Staff`)
        .setDescription(`─────⊹⊱ Information Role ⊰⊹─────
───────୨ৎ───────
⚝ Owner : *Lihat role ${config.roles.owner ? `<@&${config.roles.owner}>` : '@Owner'}*
⚝ Co - Owner : *Lihat role ${config.roles.coOwner ? `<@&${config.roles.coOwner}>` : '@Co-Owner'}*
⚝ Engineer : *Lihat role ${config.roles.engineer ? `<@&${config.roles.engineer}>` : '@Engineer'}*
⚝ Admin : *Lihat role ${config.roles.admin ? `<@&${config.roles.admin}>` : '@Admin'}*
⚝ Moderator : *Lihat role ${config.roles.moderator ? `<@&${config.roles.moderator}>` : '@Moderator'}*
⚝ Staffs Helper : *Lihat role ${config.roles.helper ? `<@&${config.roles.helper}>` : '@Helper'}*
⚝ Staffs Partnership : *Lihat role ${config.roles.partnerManager ? `<@&${config.roles.partnerManager}>` : '@Partner Manager'}*
⚝ Designer : *Lihat role ${config.roles.designer ? `<@&${config.roles.designer}>` : '@Designer'}*
───────୨ৎ───────`)
        .setColor(0xffffff);
      break;

    case 'social':
      responseEmbed = new EmbedBuilder()
        .setTitle(`${config.emojis.website} Sosial Media`)
        .setDescription("📸 Instagram: [@vseraphyx](https://instagram.com/vseraphyx)\n🌐 Website: Dalam perkembangan")
        .setColor(0xffffff);
      break;

    default:
      responseEmbed = new EmbedBuilder()
        .setTitle("Error")
        .setDescription("Invalid selection")
        .setColor(0xff0000);
  }

  // Check if already replied/deferred before responding
  if (interaction.replied || interaction.deferred) {
    return interaction.editReply({
      embeds: [responseEmbed]
    });
  }
  
  return interaction.reply({
    embeds: [responseEmbed],
    flags: 64 // 64 = MessageFlags.Ephemeral
  });
}

module.exports = infoHandler;
