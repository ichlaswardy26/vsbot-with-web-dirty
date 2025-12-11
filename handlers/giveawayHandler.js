const { EmbedBuilder } = require("discord.js");
const Giveaway = require("../schemas/Giveaway");

/**
 * Ambil pemenang dari array peserta (objects User) sebanyak count, random tanpa pengulangan.
 * Mengembalikan array pemenang.
 */
function pickWinners(participants, count) {
  const pool = [...participants];
  const winners = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

/**
 * Mengakhiri giveaway: edit embed original menjadi "ENDED" + kirim follow-up pesan.
 */
async function endGiveaway(client, giveawayData) {
  try {
    const { channelId, messageId, prize, winnerCount, hostId } = giveawayData;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.log(`[giveaway] Channel tidak ditemukan: ${channelId}`);
      giveawayData.ended = true;
      await giveawayData.save();
      return;
    }

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) {
      console.log(`[giveaway] Message tidak ditemukan: ${messageId}`);
      giveawayData.ended = true;
      await giveawayData.save();
      return;
    }

    // Ambil reaction 🎉 (jika reaction tidak ada, anggap tidak ada peserta)
    const reaction = msg.reactions.cache.get("🎉");
    const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
    const participants = users ? users.filter(u => !u.bot).map(u => u) : [];

    // Jika tidak ada peserta
    if (!participants || participants.length === 0) {
      // Build embed "ENDED" (edit embed asli bila ada, kalau tidak buat baru)
      const baseEmbed = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : null;
      const noWinnerEmbed = baseEmbed
        ? EmbedBuilder.from(baseEmbed)
          .setTitle(`${prize}`)
            .setDescription(`🎁 Hadiah: **${prize}**\n😢 Tidak ada peserta.`)
            .setColor(0xff0000)
            .setFooter({ text: "Giveaway telah berakhir" })
            .setTimestamp()
        : new EmbedBuilder()
          .setTitle(`${prize}`)
            .setDescription(`🎁 Hadiah: **${prize}**\n😢 Tidak ada peserta.`)
            .setColor(0xff0000)
            .setFooter({ text: "Giveaway telah berakhir" })
            .setTimestamp();

      await msg.edit({ content: `🎉 **GIVEAWAY ENDED** 🎉`, embeds: [noWinnerEmbed] }).catch(err => console.log("[giveaway] gagal edit no-winner embed:", err));
      await channel.send(`😢 Tidak ada peserta untuk giveaway **${prize}**.`);
      giveawayData.ended = true;
      await giveawayData.save();
      return;
    }

    // Pilih pemenang
    const winners = pickWinners(participants, winnerCount);
    const winnerMentions = winners.map(w => `<@${w.id}>`).join(", ");

    // Edit embed original menjadi "ENDED"
    const baseEmbed = msg.embeds[0] ? EmbedBuilder.from(msg.embeds[0]) : null;
    const endedEmbed = baseEmbed
      ? EmbedBuilder.from(baseEmbed)
          .setTitle(`${prize}`)
          .setDescription(`🏆 Pemenang: ${winnerMentions}`)
          .setColor(0xffd700)
          .setFooter({ text: "Giveaway telah berakhir" })
          .setTimestamp()
      : new EmbedBuilder()
          .setTitle(`${prize}`)
          .setDescription(`🏆 Pemenang: ${winnerMentions}`)
          .setColor(0xffd700)
          .setFooter({ text: "Giveaway telah berakhir" })
          .setTimestamp();

    await msg.edit({ content: `🎉 **GIVEAWAY ENDED** 🎉`, embeds: [endedEmbed] }).catch(err => console.log("[giveaway] gagal edit ended embed:", err));

    // Kirim follow-up seperti contoh: mention pemenang + instruksi claim
    await channel.send(`${winnerMentions} won this giveaway! 🎉 DM <@${hostId}> to claim your prize!`).catch(() => null);

    giveawayData.ended = true;
    await giveawayData.save();
    console.log(`[giveaway] Giveaway ${messageId} ended. Winners: ${winnerMentions}`);
  } catch (err) {
    console.error("[giveaway] endGiveaway error:", err);
  }
}

/**
 * Schedule a single giveaway instance (dipanggil saat membuat giveaway baru atau saat restore)
 * - Jika waktu sudah lewat => panggil endGiveaway langsung
 * - Jika belum => setTimeout untuk endGiveaway
 */
function scheduleGiveaway(client, giveawayData) {
  const timeLeft = new Date(giveawayData.endAt).getTime() - Date.now();

  if (timeLeft <= 0) {
    // expired -> end sekarang
    endGiveaway(client, giveawayData).catch(() => null);
  } else {
    // set timeout untuk menutup giveaway nanti
    setTimeout(() => {
      endGiveaway(client, giveawayData).catch(() => null);
    }, timeLeft);
  }
}

/**
 * Baca semua giveaway aktif di DB dan schedule satu per satu.
 * Panggil fungsi ini di ready.js
 */
async function checkGiveaways(client) {
  try {
    const giveaways = await Giveaway.find({ ended: false });
    for (const g of giveaways) {
      scheduleGiveaway(client, g);
    }
    console.log(`[giveaway] Loaded and scheduled ${giveaways.length} active giveaways from DB.`);
  } catch (err) {
    console.error("[giveaway] checkGiveaways error:", err);
  }
}

/**
 * Utility untuk reroll pemenang pada giveaway yang sudah berakhir (ended: true).
 * Akan memilih pemenang baru dari reaction message jika masih ada peserta.
 */
async function rerollGiveaway(client, messageId) {
  try {
    const giveaway = await Giveaway.findOne({ messageId });
    if (!giveaway) return { ok: false, reason: "Giveaway not found" };

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return { ok: false, reason: "Channel not found" };

    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (!msg) return { ok: false, reason: "Message not found" };

    const reaction = msg.reactions.cache.get("🎉");
    const users = reaction ? await reaction.users.fetch().catch(() => null) : null;
    const participants = users ? users.filter(u => !u.bot).map(u => u) : [];

    if (!participants || participants.length === 0) return { ok: false, reason: "No participants" };

    const winners = pickWinners(participants, giveaway.winnerCount);
    const winnerMentions = winners.map(w => `<@${w.id}>`).join(", ");

    await channel.send(`🔁 New winners for **${giveaway.prize}**: ${winnerMentions}`);
    return { ok: true, winners };
  } catch (err) {
    console.error("[giveaway] rerollGiveaway error:", err);
    return { ok: false, reason: "Internal error" };
  }
}

module.exports = {
  checkGiveaways,
  scheduleGiveaway,
  endGiveaway,
  rerollGiveaway,
};
