const { AttachmentBuilder } = require("discord.js");

module.exports = async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  let transcript = `Transkrip Tiket: #${channel.name}\n\n`;

  for (const [, msg] of sorted) {
    const time = new Date(msg.createdTimestamp).toLocaleString();
    const author = `${msg.author.tag}`;
    const content = msg.content || "[Embed/Attachment]";
    transcript += `[${time}] ${author}: ${content}\n`;
  }

  const buffer = Buffer.from(transcript, "utf-8");
  const file = new AttachmentBuilder(buffer, { name: `${channel.name}-transcript.txt` });

  return file;
};
