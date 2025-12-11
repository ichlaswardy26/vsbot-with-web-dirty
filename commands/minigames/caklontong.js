const { escapeMarkdown, EmbedBuilder } = require("discord.js");
const superfetch = require("node-superfetch");

const util = require("../../util/util");

module.exports = {
    name: "caklontong",
    category: "games",
    aliases: ['cl'],
    description: "permainan tss cak lontong",
    async exec(client, message) {
        // Only allow users with a specific role to run this command
        const allowedRole = '1365953400902254632'; // Change to your required role name or ID
        if (!message.member.roles.cache.some(role => role.name === allowedRole || role.id === allowedRole)) {
            return message.reply('Kamu tidak memiliki izin untuk menjalankan perintah ini.');
        }
        const gameId = `${this.name}-${message.channel.id}`;
        if (client.games.has(gameId)) return message.reply("Permainan sedang berlangsung di channel ini");

        client.games.set(gameId, Date.now());

        const stopWords = ["nyerah", "stop", "Nyerah", "Stop"];
        const datas = await this.getData();
        if (!datas)
            return message.reply("data cak lontong tidak ditemukan");

        const data = datas[Math.floor(Math.random() * datas.length)];

        if (!data.jawaban || typeof data.jawaban !== 'string') {
            client.games.delete(gameId);
            return message.reply("Jawaban tidak valid!");
        }

        const soalEmbed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("Cak Lontong")
            .setTimestamp()
            .setFooter({ text: "Waktu akan berakhir dalam 30 detik!" })
            .setDescription(`**Soal: ${data.soal}**\n**Clue: ${this.hintJawaban(data.jawaban)}**\n\n\`Note: Jika kamu tidak tau jawabannya, Kamu bisa ketik nyerah\``);

        const soalMessage = await message.reply({
            embeds: [soalEmbed.toJSON()],
            allowedMentions: { repliedUser: false }
        });

        const filter = (m) => !m.author.bot;
        const collector = message.channel.createMessageCollector({
            filter,
            time: 30000,
            errors: ["time"],
        });

        collector.on("collect", (m) => {
            const content = m.content.trim();
            if (
                stopWords.includes(content) &&
                m.author.id === message.author.id
            ) {
                return collector.stop("nyerah");
            }

            if (this.resolve(content, data)) return collector.stop("win");
           // return m.reply("Salah!");
        });

        collector.on("end", (col, reason) => {
            client.games.delete(gameId);
            const lastCollect = col.at(-1);

            const stopText = (reason) =>
                `> Permainan dihentikan karena ${reason}\n> **Jawaban yang benar:** ||${data.jawaban}||\n> ${data.deskripsi}`;

            soalMessage.delete().catch(() => {});
            if (reason === "time")
                return message.channel.send(stopText("waktu habis!"));
            if (reason === "nyerah")
                return message.channel.send(stopText("menyerah"));
            if (reason === "win") {
                const embed = new EmbedBuilder()
                    .setTitle("Kamu Benar!")
                    .setTimestamp()
                    .setColor("Green")
                    .setDescription(`Jawabannya **${escapeMarkdown(
                        data.jawaban
                    )}**\n\n\`${data.deskripsi}\``);

                return lastCollect.reply({
                    embeds: [embed.toJSON()]
                });
            }
        });
    },
    resolve(keyword, data) {
    if (typeof keyword !== "string" || typeof data.jawaban !== "string") return false;
    // Accept answer if it matches (case-insensitive, trimmed, ignore spaces)
    const userAns = keyword.replace(/\s+/g, '').toLowerCase();
    const correctAns = data.jawaban.replace(/\s+/g, '').toLowerCase();
    return userAns === correctAns;
    },
    hintJawaban(word) {
        if (typeof word !== 'string' || !word.trim()) {
            return 'Invalid hint data';
        }
        // Show first and last letter, hide others with _
        return word
            .split(' ')
            .map(str =>
                str
                    .split('')
                    .map((char, i, arr) => (i === 0 || i === arr.length - 1 ? char : '_'))
                    .join('')
            )
            .join(' ');
    },
    async getData() {
        return util
            .request(
                "https://raw.githubusercontent.com/zyflou/assets/refs/heads/main/data/game/caklontong.json"
            )
            .then((data) => data.data)
            .catch(() => null);
    }
}