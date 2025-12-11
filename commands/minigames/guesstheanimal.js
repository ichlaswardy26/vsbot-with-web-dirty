const { escapeMarkdown, EmbedBuilder } = require("discord.js");
const util = require("../../util/util");

module.exports = {
    name: "tebakhewan",
    category: "games",
    aliases: ['th'],
    description: "Tebak nama hewan dari gambar!",
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
            return message.reply("data tebak hewan tidak ditemukan");

        const data = datas[Math.floor(Math.random() * datas.length)];
        const soalEmbed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("Tebak Hewan!")
            .setTimestamp()
            .setImage(data.img)
            .setFooter({ text: "Waktu akan berakhir dalam 1 menit!" })
            .setDescription(`Jawab dengan benar ya guys!!`);
        const soalMessage = await message.reply({
            embeds: [soalEmbed.data],
            allowedMentions: { repliedUser: false }
        });

        const filter = (m) => !m.author.bot;
        const collector = message.channel.createMessageCollector({
            filter,
            time: 60000,
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

            if (this.resolve(content, data)) {
                return collector.stop("win");
            } /*else {
                m.reply("Salah!");
            }*/
        });

        collector.on("end", (col, reason) => {
            client.games.delete(gameId);
            const lastCollect = col.at(-1);

            const stopText = (reason) =>
                `> Permainan dihentikan karena ${reason}\n> **Jawaban yang benar:** ||${data.jawaban}||`;

            soalMessage.delete();
            if (reason === "time")
                return message.channel.send(stopText("waktu habis!"));
            if (reason === "nyerah")
                return message.channel.send(stopText("menyerah"));
            if (reason === "win") {
                const embed = new EmbedBuilder()
                    .setTitle("Kamu Benar!")
                    .setTimestamp()
                    .setColor("Green")
                    .setImage(data.img2)
                    .setDescription(`Jawabannya **${escapeMarkdown(
                        data.jawaban
                    )}**`);

                return lastCollect.reply({
                    embeds: [embed.data]
                });
            }
        });
    },
    resolve(keyword, data) {
        if (typeof keyword !== "string") return;
        return new RegExp(data.jawaban, "gi").test(keyword);
    },
    async getData() {
        return util
            .request(
                "https://gist.githubusercontent.com/ichlaswardy26/6eed24c5cf8cde136783c92997991c9e/raw/f8f7b6f324802ad1b5b23a52c51c6389e399fb23/tebakhewan.json"
            )
            .then((data) => data.data)
            .catch(() => null);
    }
};
