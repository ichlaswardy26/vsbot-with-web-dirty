const confessionHandler = require('./confessionHandler');
const ticketHandler = require('./ticketHandler');
const partnerHandler = require('./partnerHandler');
const infoHandler = require('./infoHandler');
const introHandler = require('./introHandler');
const embedBuilderHandler = require('./embedBuilderHandler');
const wordChainHandler = require('./wordChainHandler');
const shopHandler = require('./shopHandler');
const leaderboardHandler = require('./leaderboardHandler');
const { MessageFlags } = require("discord.js");

/**
 * Main button interaction router
 * @param {Client} client Discord client instance
 * @param {Interaction} interaction Button interaction object
 */
async function handleButton(client, interaction) {
  // Early return if not a button interaction
  if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isStringSelectMenu()) return;

  console.log('Button interaction received:', interaction.customId);

  try {
    if (interaction.customId.startsWith('wc_')) return await wordChainHandler(client, interaction);
    if (interaction.customId.startsWith('ce_')) return await embedBuilderHandler(client, interaction);
    if (interaction.customId === 'submit_intro' || interaction.customId === 'modal_submit_intro')
      return await introHandler(client, interaction);
    if (
      interaction.customId.startsWith('submit_confession') ||
      interaction.customId.startsWith('reply_confession') ||
      interaction.customId === 'modal_submit_confession' ||
      interaction.customId.startsWith('modal_reply_confession')
    )
      return await confessionHandler(client, interaction);

    // 🟣 Route ke partnerHandler
    if (
      interaction.customId === 'create_partner_ticket' ||
      interaction.customId === 'partner_modal') {
        return await partnerHandler(client, interaction);
      }



    // 🟠 Route ke ticketHandler biasa
    if (interaction.customId.startsWith('create_ticket') ||
        interaction.customId === 'close_ticket' ||
        interaction.customId === 'select_ticket_subject') {
      console.log('Routing to ticketHandler for:', interaction.customId);
      return await ticketHandler(client, interaction);
    }

    if (interaction.customId === 'info_select_menu') return await infoHandler(client, interaction);
    
    // Shop handler
    if (interaction.customId === 'view_exclusive_items' || interaction.customId === 'back_to_main_shop') 
      return await shopHandler(client, interaction);
    
    // Leaderboard handler
    if (interaction.customId.startsWith('leaderboard_voice_')) return await leaderboardHandler(client, interaction);
  } catch (error) {
    console.error('Error handling button interaction:', error);
    
    // Only try to respond if the interaction hasn't been handled yet
    try {
      if (!interaction.replied && !interaction.deferred) {
        // Check if this is an emoji-related error
        if (error.code === 50035 && error.message.includes('INVALID_EMOJI')) {
          console.error('Invalid emoji detected in interaction response');
          await interaction.reply({
            content: '❌ Terjadi kesalahan dengan emoji. Silakan coba lagi.',
            flags: MessageFlags.Ephemeral
          });
        } else {
          await interaction.reply({
            content: '❌ Terjadi kesalahan saat memproses interaksi.',
            flags: MessageFlags.Ephemeral
          });
        }
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ Terjadi kesalahan saat memproses interaksi.'
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message:', replyError);
    }
  }
}

module.exports = handleButton;
