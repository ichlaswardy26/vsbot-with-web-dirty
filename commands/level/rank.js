const { AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const Leveling = require('../../schemas/Leveling');
const Boost = require('../../schemas/Boost');
const { getXpRequirement } = require('../../util/levelUtils');
const { getUserRank } = require('../../util/leaderboardUtils');

function getTierName(level) {
  if (level >= 50) return 'Seraphyx';
  if (level >= 40) return 'Nephilim';
  if (level >= 30) return 'Eldritch';
  if (level >= 20) return 'Sovereign';
  if (level >= 10) return 'Soulborne';
  return 'Refining Souls';
}

// Format durasi boost (jam & menit)
function formatRemainingTime(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

module.exports = {
  name: "rank",
  aliases: ["profile", "level", "tier"],
  description: "Menampilkan profil XP dan level user dengan desain canvas modern dan tier role.",
  async exec(client, message) {
    try {
      const target = message.mentions.users.first() || message.author;
      const guild = message.guild;
      const guildId = guild.id;

      let userData = await Leveling.findOne({ userId: target.id, guildId });
      if (!userData) {
        return message.reply("❌ User ini belum memiliki data level. Kirim pesan atau join voice untuk mendapatkan XP!");
      }

      const xpRequired = getXpRequirement(userData.level);
      const xpProgress = userData.xp;

      // Get user rank
      const rank = await getUserRank(guildId, target.id);

      // Determine tier name based on level
      const tierName = getTierName(userData.level);

      // Cek apakah ada boost aktif
      const boost = await Boost.findOne({ guildId });
      let activeBoost = null;
      let remainingTime = null;
      if (boost && boost.expiresAt > new Date()) {
        activeBoost = boost.multiplier;
        remainingTime = formatRemainingTime(boost.expiresAt - Date.now());
      }

      // Canvas setup
      const width = 700;
      const height = 220;
      const canvas = Canvas.createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background dark blue
      ctx.fillStyle = '#0B1E3D';
      ctx.fillRect(0, 0, width, height);

      // Rounded corners background
      const radius = 30;
      ctx.fillStyle = '#0B1E3D';
      ctx.beginPath();
      ctx.moveTo(radius, 0);
      ctx.lineTo(width - radius, 0);
      ctx.quadraticCurveTo(width, 0, width, radius);
      ctx.lineTo(width, height - radius);
      ctx.quadraticCurveTo(width, height, width - radius, height);
      ctx.lineTo(radius, height);
      ctx.quadraticCurveTo(0, height, 0, height - radius);
      ctx.lineTo(0, radius);
      ctx.quadraticCurveTo(0, 0, radius, 0);
      ctx.closePath();
      ctx.fill();

      // Decorative circles
      const circleColor = '#1E3A72';
      const smallCircleColor = '#14406C';
      const circles = [
        { x: 50, y: 90, r: 40, color: circleColor },
        { x: 650, y: 40, r: 20, color: smallCircleColor },
        { x: 600, y: 130, r: 15, color: smallCircleColor },
        { x: 100, y: 30, r: 10, color: smallCircleColor },
      ];
      circles.forEach(c => {
        ctx.beginPath();
        ctx.fillStyle = c.color;
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw avatar circle
      const avatarSize = 120;
      const avatarX = 20;
      const avatarY = (height - avatarSize) / 2 - 10;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();

      const avatar = await Canvas.loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();

      // Text styles
      ctx.fillStyle = '#4DA6FF';
      ctx.textBaseline = 'top';

      // Username
      ctx.font = 'bold 32px Sans-serif';
      ctx.fillText(target.username, avatarX + avatarSize + 20, 20);

      // Level and Rank top right
      ctx.textAlign = 'right';
      ctx.font = 'bold 28px Sans-serif';
      ctx.fillText(`LVL ${userData.level}`, width - 150, 20);
      ctx.fillText(`RANK ${rank || 'N/A'}`, width - 20, 20);

      // XP text right below level/rank
      ctx.font = '20px Sans-serif';
      ctx.fillStyle = '#A0A0A0';
      ctx.fillText(`${xpProgress.toLocaleString()} / ${xpRequired.toLocaleString()} xp`, width - 20, 60);

      // Tier name below username
      ctx.textAlign = 'left';
      ctx.fillStyle = '#4DA6FF';
      ctx.font = 'italic 22px Sans-serif';
      ctx.fillText(`Tier: ${tierName}`, avatarX + avatarSize + 20, 70);

      // Progress bar background
      const barX = avatarX + avatarSize + 20;
      const barY = 110;
      const barWidth = width - barX - 40;
      const barHeight = 30;
      const barRadius = 15;

      ctx.fillStyle = '#14406C';
      ctx.beginPath();
      ctx.moveTo(barX + barRadius, barY);
      ctx.lineTo(barX + barWidth - barRadius, barY);
      ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + barRadius);
      ctx.lineTo(barX + barWidth, barY + barHeight - barRadius);
      ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - barRadius, barY + barHeight);
      ctx.lineTo(barX + barRadius, barY + barHeight);
      ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
      ctx.lineTo(barX, barY + barRadius);
      ctx.quadraticCurveTo(barX, barY, barX + barRadius, barY);
      ctx.closePath();
      ctx.fill();

      // Progress bar fill with gradient
      const progressWidth = Math.floor((xpProgress / xpRequired) * barWidth);
      const gradient = ctx.createLinearGradient(barX, barY, barX + progressWidth, barY);
      gradient.addColorStop(0, '#4DA6FF');
      gradient.addColorStop(1, '#1E90FF');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(barX + barRadius, barY);
      ctx.lineTo(barX + progressWidth - barRadius, barY);
      ctx.quadraticCurveTo(barX + progressWidth, barY, barX + progressWidth, barY + barRadius);
      ctx.lineTo(barX + progressWidth, barY + barHeight - barRadius);
      ctx.quadraticCurveTo(barX + progressWidth, barY + barHeight, barX + progressWidth - barRadius, barY + barHeight);
      ctx.lineTo(barX + barRadius, barY + barHeight);
      ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - barRadius);
      ctx.lineTo(barX, barY + barRadius);
      ctx.quadraticCurveTo(barX, barY, barX + barRadius, barY);
      ctx.closePath();
      ctx.fill();

      // Jika ada boost aktif, tampilkan teks "BOOST xN - sisa waktu"
      if (activeBoost) {
        ctx.font = 'bold 18px Sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'center';
        ctx.fillText(`🔥 BOOST x${activeBoost} (sisa ${remainingTime})`, barX + barWidth / 2, barY + barHeight + 15);
      }

      // Send image
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
      message.reply({ files: [attachment] });
    } catch (error) {
      console.error('Error in rank command:', error);
      message.reply('❌ Terjadi kesalahan saat membuat profil level.');
    }
  }
};
