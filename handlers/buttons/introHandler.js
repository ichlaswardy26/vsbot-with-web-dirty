const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require('discord.js');
const Canvas = require('canvas');
const config = require('../../config.js');

/**
 * Create a custom identity card canvas image
 */
async function createIdentityCard(data, user) {
  // Set up canvas
  const canvas = Canvas.createCanvas(900, 500);
  const ctx = canvas.getContext('2d');

  // Create background with gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 900, 500);
  bgGradient.addColorStop(0, '#0a0a0a');   // Dark black
  bgGradient.addColorStop(1, '#1a1a1a');   // Lighter black
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 900, 500);

  // Add decorative elements
  // Top left corner design
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, 0);
  ctx.lineTo(0, 150);
  ctx.closePath();
  ctx.fillStyle = '#2a2a2a';
  ctx.fill();

  // Bottom right corner design
  ctx.beginPath();
  ctx.moveTo(900, 500);
  ctx.lineTo(750, 500);
  ctx.lineTo(900, 350);
  ctx.closePath();
  ctx.fillStyle = '#2a2a2a';
  ctx.fill();

  // Add glowing effect border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.strokeRect(20, 20, 860, 460);
  ctx.shadowBlur = 0;

  // Server Name split: "Villain" left, "Seraphyx" right
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Villain', 50, 50);

  ctx.textAlign = 'right';
  ctx.fillText('Seraphyx', 850, 50);

  // Title
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText("Villain's IDENTITY", 450, 100);

  // Decorative line under title
  const lineGradient = ctx.createLinearGradient(200, 0, 700, 0);
  lineGradient.addColorStop(0, '#ffffff');
  lineGradient.addColorStop(0.5, '#808080');
  lineGradient.addColorStop(1, '#ffffff');
  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 120);
  ctx.lineTo(700, 120);
  ctx.stroke();

  // Load and draw user avatar
  try {
    const avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    // Draw circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(120, 220, 60, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    // Draw avatar
    ctx.drawImage(avatar, 60, 160, 120, 120);
    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(120, 220, 60, 0, Math.PI * 2, true);
    ctx.stroke();
  } catch (error) {
    console.error('Error loading avatar:', error);
  }

  // Add user info with stylish layout
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';

  const startY = 200;
  const spacing = 60;
  const labels = ['Name', 'Age', 'Gender', 'Hobby', 'Note'];
  const values = [data.name, data.age, data.gender, data.hobby, data.note];

  labels.forEach((label, i) => {
    const y = startY + (spacing * i);
    
    // Label background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(220, y - 30, 120, 40);
    
    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, 230, y);
    
    // Value background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(360, y - 30, 490, 40);
    
    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(': ' + values[i], 370, y);
  });

  // Add join date
  const joinDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#808080';
  ctx.fillText('Joined: ' + joinDate, 50, 470);

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'identity-card.png' });
}

async function introHandler(client, interaction) {
  if (interaction.customId === 'submit_intro') {
    const modal = new ModalBuilder()
      .setCustomId('modal_submit_intro')
      .setTitle('📝 Introduction Form');

    const nameInput = new TextInputBuilder()
      .setCustomId('intro_name')
      .setLabel('Nama kamu:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20)
      .setPlaceholder('Contoh: drian. (max 20 karakter)');

    const ageInput = new TextInputBuilder()
      .setCustomId('intro_age')
      .setLabel('Age:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(3)
      .setPlaceholder('Contoh: 18');

    const genderInput = new TextInputBuilder()
      .setCustomId('intro_gender')
      .setLabel('Gender:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(20)
      .setPlaceholder('Contoh: Pria (max 20 karakter)');

    const hobbyInput = new TextInputBuilder()
      .setCustomId('intro_hobby')
      .setLabel('Hobby:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(25)
      .setPlaceholder('Contoh: Jalan jalan (max 25 karakter)');

    const noteInput = new TextInputBuilder()
      .setCustomId('intro_note')
      .setLabel('Note:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(25)
      .setPlaceholder('Contoh: suka bercanda (max 25 karakter)');

    const row1 = new ActionRowBuilder().addComponents(nameInput);
    const row2 = new ActionRowBuilder().addComponents(ageInput);
    const row3 = new ActionRowBuilder().addComponents(genderInput);
    const row4 = new ActionRowBuilder().addComponents(hobbyInput);
    const row5 = new ActionRowBuilder().addComponents(noteInput);

    modal.addComponents(row1, row2, row3, row4, row5);
    return await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_submit_intro') {
    const introChannelId = config.channels.intro;
    const introChannel = interaction.guild.channels.cache.get(introChannelId);

    if (!introChannel?.isTextBased()) {
      return await interaction.reply({
        content: "❌ Channel introduction tidak ditemukan.",
        ephemeral: true,
      });
    }

    const data = {
      name: interaction.fields.getTextInputValue('intro_name'),
      age: interaction.fields.getTextInputValue('intro_age'),
      gender: interaction.fields.getTextInputValue('intro_gender'),
      hobby: interaction.fields.getTextInputValue('intro_hobby'),
      note: interaction.fields.getTextInputValue('intro_note')
    };

    const introImage = await createIdentityCard(data, interaction.user, interaction.guild);

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("submit_intro")
        .setLabel("📝 Isi Form Intro")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✨")
    );

     await introChannel.send({
      content: `<@${interaction.user.id}> telah memperkenalkan diri!`,
      files: [introImage],
      components: [buttonRow]
    });

    return await interaction.reply({
content: "✅ Introduction kamu telah dikirim!",
ephemeral: true
});
  }
}

module.exports = introHandler;
