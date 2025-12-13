const { escapeMarkdown, EmbedBuilder } = require("discord.js");

const util = require("../../util/util");
module.exports = {
    name: "tebakgambar",
    category: "games",
    aliases: ['tg'],
    description: "permainan tebak gambar",
    async exec(client, message) {
        const rolePermissions = require("../../util/rolePermissions");
        
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'staff');
        if (permissionError) {
            return message.reply(permissionError);
        }
        const gameId = `${this.name}-${message.channel.id}`;
        if (client.games.has(gameId)) return message.reply("Permainan sedang berlangsung di channel ini");

        client.games.set(gameId, Date.now());

        const stopWords = ["nyerah", "stop", "Nyerah", "Stop"];
        const datas = await this.getData();
        if (!datas)
            return message.reply("data tebak kata tidak ditemukan");

        const data = datas[Math.floor(Math.random() * datas.length)];
        const soalEmbed = new EmbedBuilder()
            .setColor("Random")
            .setTitle("Tebak Gambar")
            .setTimestamp()
            .setImage(data.img)
            .setFooter({ text: "Waktu akan berakhir dalam 1 menit!" })
            .setDescription(`\`Note: Jika kamu tidak tau jawabannya, Kamu bisa ketik nyerah\``);
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
            const content = m.content;
            if (
                stopWords.includes(content) &&
                m.author.id === message.author.id
            ) {
                return collector.stop("nyerah");
            }

            if (this.resolve(content, data)) return collector.stop("win");
            //return m.reply("Salah!");
        });

        collector.on("end", (col, reason) => {
            client.games.delete(gameId);
            const lastCollect = col.at(-1);

            const stopText = (reason) =>
                `> Permainan dihentikan karena ${reason}\n> **Jawaban yang benar:** ||${data.jawaban}||\n> \`${data.deskripsi}\``;

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
                    .setDescription(`Jawabannya **${escapeMarkdown(
                        data.jawaban
                    )}**\n\`${data.deskripsi}\``);

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
    hintJawaban(word) {
        return word
            .split(" ")
            .map((str) =>
                str
                    .split("")
                    .map((s, i) =>
                        !str[i - 1] || !str[i + 1] || s === " " ? s : "_"
                    )
                    .join("")
            )
            .join(" ");
    },
    async getData() {
        return util
            .request(
                "https://gist.githubusercontent.com/ichlaswardy26/7d9fce9a9a32da63d3b67e8ca1194089/raw/e5973050f33b59b85bf3bbce689a220c84438cce/tebakgambar.json"
            )
            .then((data) => data.data)
            .catch(() => null);
    }
}