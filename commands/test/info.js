
const { InfoCardBuilder } = require("discord-card-canvas");
const fs = require('fs');

module.exports = {
  name: "info",
  async exec(client, message) {
    const canvasInfo = await new InfoCardBuilder({
      // backgroundImgURL: 'any_image.png', ( you can also use )
      backgroundColor: {background: '#fff', waves: '#0ca7ff'},
      mainText: { content: 'CIHUYY' },
    }).build();

    fs.writeFileSync('info.png', canvasInfo.toBuffer());
    await message.channel.send({ files: [{ attachment: canvasInfo.toBuffer(), name: 'rank.png' }] });
  }
}