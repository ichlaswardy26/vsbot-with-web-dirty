const { EmbedBuilder } = require('discord.js');

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
        .setTitle("<:roles:1368177567114330224> Information Role")
        .setDescription(`───────୨ৎ───────
⚝ <@&1277873590607548427> — **Owner**
⚝ <@&1277871965432188941> — **Co-Owner**
⚝ <@&1338451263439896576> — **Engineer**
⚝ <@&1306882734593015809> — **Admin**
⚝ <@&1306882819066167366> — **Moderator**
⚝ <@&1306883048264175648> — **Event Organizer**
⚝ <@&1309154823358124073> — **Partner Manager**
⚝ <@&1310896227696640010> — **Designer**
───────୨ৎ───────`)
        .setColor(0xffffff);
      break;

    case 'list':
      responseEmbed = new EmbedBuilder()
        .setTitle("<:info:1368177794026045440> Information Staff")
        .setDescription(`─────⊹⊱ Information Role ⊰⊹─────
───────୨ৎ───────
⚝ Owner : <@354799934920327168> 
⚝ Co - Owner : <@1302164153565446154> 
⚝ Engineer : <@707254056535588924> 
⚝ Admin : <@902542130667458590>, <@1058131180593102939>
⚝ Moderator : <@764711027022888981>, <@800305845795291156>
⚝ Staffs Helper : <@1269247235263303772>, <@851112610614214666>, <@1288739535588425789>, <@904243402021933086>
⚝ Staffs Partnership : <@1222394549331300413>, <@1325734551754117182>
⚝ Designer : <@813223540748320799>
───────୨ৎ───────`)
        .setColor(0xffffff);
      break;

    case 'social':
      responseEmbed = new EmbedBuilder()
        .setTitle("<:website:1368177916063514719> Sosial Media")
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
