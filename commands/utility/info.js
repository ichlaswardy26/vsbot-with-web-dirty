const { InfoCardBuilder } = require("discord-card-canvas");
const fs = require('fs');

module.exports = {
  name: "info",
  description: "Display info card",
  category: "utility",
  async exec(client, message) {
    const canvasInfo = await new InfoCardBuilder({
      backgroundColor: {background: '#fff', waves: '#0ca7ff'},
      mainText: { content: 'CIHUYY' },
    }).build();

    fs.writeFileSync('info.png', canvasInfo.toBuffer());
    await message.channel.send({ files: [{ attachment: canvasInfo.toBuffer(), name: 'info.png' }] });
  }
};
