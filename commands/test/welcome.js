const canvafy = require('canvafy');
const config = require('../../config.js');

module.exports = {
    name: 'welcometest',
    description: 'card welcome',
    async exec(client, message) {

        const { member } = message;
        const welcome = await new canvafy.WelcomeLeave()
        .setAvatar(member.user.displayAvatarURL({ forceStatic: true, extension: "png" }))
        .setBackground("image", "https://i.pinimg.com/736x/30/c3/05/30c305ad8c91a17f2444281e32ffe500.jpg")
        .setTitle("Welcome", "#0a0a0a")
        .setAvatarBorder("#2a2e35")
        .build();
    
          message.channel.send({ content: `## ╔═══════════════════╗\n## ✦ Welcome to Villain Seraphyx  ✦\n## ╚═══════════════════╝\n_Tempat di mana cahaya dan kegelapan saling sapa, tapi tetep vibes-nya gokil dan nggak ngebosenin._\n\n${config.emojis.clouds} <@${member.user.id}>, akhirnya nyasar juga ke sini ya~\nDi sini nggak ada yang bener-bener suci atau jahat, semua cuma pengen have fun bareng — kita hidup dalam dunia dua sisi: para **villain** yang punya ambisi gelap, dan **seraph** yang pura-pura suci.\n\n\n**༶•┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈•༶**\n**${config.emojis.witch} Langkah pertama sebelum lo hilang arah:**\n**•** Intip aturan server dan informasi di ${config.channels.rules1 ? `<#${config.channels.rules1}>` : 'rules channel'} & ${config.channels.rules2 ? `<#${config.channels.rules2}>` : 'info channel'} — __kalau gak mau dikutuk dan kehilangan arah!.__\n**•** Buka topeng lo di ${config.channels.intro ? `<#${config.channels.intro}>` : 'intro channel'} — __biar kami tahu dan tidak mencurigai lo.__\n**•** Dan masuk ke arus obrolan di ${config.channels.chat1 ? `<#${config.channels.chat1}>` : 'chat channel'} — __tempat semua energi bertabrakan.__\n**༶•┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈•༶**\n\n**⭑⭑⭑⭑⭑**\nThanks udah gabung, dan inget…\n_Di sini chaos itu seni, dan kamu bagian dari lukisannya._\nEnjoy the madness. Let the story begin..`, files: [{ attachment: welcome, name: 'welcome.png' }] });
    }
};