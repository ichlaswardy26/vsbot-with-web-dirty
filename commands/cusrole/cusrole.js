const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas'); // optional for image editing
const fs = require('fs');
const CustomRoleModel = require('../../schemas/customRole'); // Pastikan schema MongoDB Anda sesuai
const { BOOST_ROLE_ID, DONATE_ROLE_ID } = require('../../config');
const config = require('../../config.js');

module.exports = {
  name: 'cr',
  aliases: [],
  description: 'Manage your custom role',
  usage: '!cusrole <create|edit|delete>',
  async exec(client, message, args) {
    const sub = args[0];

    if (sub === 'up') {
      // Move custom role above user's highest role (excluding managed and @everyone)
      const filter = m => m.author.id === message.author.id;
      const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID);
      const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID);
      let roleType;
      if (isBoost && isDonate) {
        await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin dinaikkan.");
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const typeInput = collected.first().content.toLowerCase();
        if (!['boost', 'donate'].includes(typeInput)) {
          return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
        }
        roleType = typeInput;
      } else if (isBoost) {
        roleType = 'boost';
      } else if (isDonate) {
        roleType = 'donate';
      } else {
        return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
      }

      const customRole = await CustomRoleModel.findOne({
        guildId: message.guild.id,
        createdBy: message.author.id,
        roleType
      });
      if (!customRole) {
        return message.reply(`${config.emojis.important} **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
      }
      const role = message.guild.roles.cache.get(customRole.roleId);
      if (!role) {
        return message.reply('${config.emojis.important} **|** Role custom tidak ditemukan di server.');
      }
      if (!role.editable) {
        return message.reply('${config.emojis.important} **|** Saya tidak memiliki izin untuk mengatur posisi role ini.');
      }
      // Find user's highest role (excluding managed and @everyone and the custom role itself)
      const userRoles = message.member.roles.cache
        .filter(r => r.id !== message.guild.id && !r.managed && r.id !== role.id)
        .sort((a, b) => b.position - a.position);
      const highest = userRoles.first();
      if (!highest) {
        return message.reply('${config.emojis.important} **|** Tidak ada role lain yang bisa dijadikan referensi.');
      }
      try {
        await role.setPosition(highest.position + 1);
        return message.channel.send(`<a:check:1367395457529282581> **|** Role custom kamu telah dinaikkan di atas <@&${highest.id}>.`);
      } catch (err) {
        console.error(err);
        return message.channel.send('${config.emojis.important} **|** Gagal menaikkan role. Pastikan bot memiliki izin dan role bot lebih tinggi.');
      }
    } else if (sub === 'create') {
      const filter = m => m.author.id === message.author.id;

      const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
      const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

      let roleType;
      if (isBoost && isDonate) {
        await message.channel.send("${config.emojis.seraphyx} **|** Kamu memiliki role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih jenis custom role yang ingin dibuat.");
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const typeInput = collected.first().content.toLowerCase();
        if (!['boost', 'donate'].includes(typeInput)) {
          return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
        }
        roleType = typeInput;
      } else if (isBoost) {
        roleType = 'boost';
      } else if (isDonate) {
        roleType = 'donate';
      } else {
        return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
      }

      // Cek apakah user sudah memiliki custom role untuk tipe ini
      const existingRole = await CustomRoleModel.findOne({
        guildId: message.guild.id,
        createdBy: message.author.id,
        roleType
      });
      if (existingRole) {
        return message.reply(`${config.emojis.important} **|** Anda sudah memiliki custom role bertipe **${roleType}**.`);
      }

      try {
        // Step 1: Ask for role name
        await message.channel.send('${config.emojis.seraphyx} **|** Silakan ketik nama role yang kamu inginkan (dalam 30 detik)...');
        const nameMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const roleName = nameMsg.first().content;


        // Step 2: Ask for role color or gradient
        await message.channel.send('${config.emojis.seraphyx} **|** Ketik warna role dalam format HEX (contoh: `#FF0000`) atau dua kode HEX untuk gradient (contoh: `#34ebd8 #34eb77`)');
        const colorMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const colorInput = colorMsg.first().content.trim();
        const colorParts = colorInput.split(/\s+/);
        let roleColor = colorParts[0];
        let gradientColor = null;

        // Validate single or double hex codes
        if (colorParts.length === 1) {
          if (!/^#([0-9A-F]{6})$/i.test(roleColor)) {
            return message.channel.send('${config.emojis.important} **|** Format warna tidak valid. Gunakan format HEX seperti `#RRGGBB`.');
          }
        } else if (colorParts.length === 2) {
          if (!/^#([0-9A-F]{6})$/i.test(colorParts[0]) || !/^#([0-9A-F]{6})$/i.test(colorParts[1])) {
            return message.channel.send('${config.emojis.important} **|** Kedua warna harus format HEX seperti `#RRGGBB #RRGGBB`.');
          }
          gradientColor = colorParts[1];
        } else {
          return message.channel.send('${config.emojis.important} **|** Masukkan satu atau dua kode warna HEX.');
        }

        // Step 3: Ask for icon
        await message.channel.send('${config.emojis.seraphyx} **|** Kirim gambar untuk icon role kamu (hanya image), atau ketik `cancel` untuk lewati (30 detik)...');
        const iconMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

        const iconContent = iconMsg.first().content?.toLowerCase();
        const hasAttachment = iconMsg.first().attachments.size > 0;


        let role;
        let iconAttachment = null;

        // Helper to create role with color or gradient
        async function createRoleWithColor(options) {
          if (gradientColor && typeof options.setColors === 'function') {
            // If setColors is available, use it after creation
            const r = await message.guild.roles.create({
              name: roleName,
              colors: { primaryColor: roleColor, secondaryColor: gradientColor },
              reason: `Custom role ${roleType} dibuat oleh ${message.author.tag}`
            });
            try {
              await r.setColors({ primaryColor: roleColor, secondaryColor: gradientColor });
            } catch (e) {
              // Fallback to single color if gradient fails
              await message.channel.send('${config.emojis.important} **|** Gagal mengatur gradient, menggunakan warna utama saja.');
            }
            return r;
          } else {
            // Fallback: create with single color
            return await message.guild.roles.create({
              name: roleName,
              colors: { primaryColor: roleColor },
              reason: `Custom role ${roleType} dibuat oleh ${message.author.tag}`
            });
          }
        }

        if (iconContent === 'cancel' || !hasAttachment) {
          // Buat role tanpa icon
          role = await createRoleWithColor({});
          await message.channel.send('<a:check:1367395457529282581> **|** Role berhasil dibuat tanpa icon.');
        } else {
          const attachment = iconMsg.first().attachments.first();
          if (!attachment.contentType?.startsWith('image')) {
            return message.channel.send('${config.emojis.important} **|** File yang dikirim bukan gambar.');
          }

          iconAttachment = attachment;

          // Buat role dan atur icon
          role = await createRoleWithColor({});

          try {
            const imageBuffer = await fetch(attachment.url).then(res => res.arrayBuffer());
            await role.setIcon(Buffer.from(imageBuffer));
          } catch (err) {
            console.warn('${config.emojis.important} **|** Gagal menetapkan icon role:', err.message);
            message.channel.send('${config.emojis.seraphyx} **|** Role berhasil dibuat, tapi gagal mengatur icon (mungkin karena batasan level boost server).');
          }
        }

        // Simpan ke database
        const newCustomRole = new CustomRoleModel({
          guildId: message.guild.id,
          roleId: role.id,
          roleName: role.name,
          roleColor: role.hexColor || role.color,
          roleIcon: iconAttachment ? iconAttachment.url : null,
          createdBy: message.author.id,
          members: [message.author.id],
          roleType
        });

        await newCustomRole.save();

        // Set posisi role
        const rolePembatasId = '1062374982778376192'; // Role referensi untuk posisi
        const batasRole = message.guild.roles.cache.get(rolePembatasId);
        if (batasRole) {
          try {
            await role.setPosition(batasRole.position + 1);
          } catch (error) {
            console.warn('Gagal mengatur posisi role:', error.message);
          }
        }

        // Tambahkan ke user
        try {
          await message.member.roles.add(role);
        } catch (err) {
          console.warn('Gagal menambahkan role ke user:', err.message);
          message.channel.send('${config.emojis.seraphyx} **|** Role berhasil dibuat, namun gagal memberikan role ke Anda.');
        }

        await message.channel.send(`<a:check:1367395457529282581> **|** Role berhasil dibuat: <@&${role.id}>`);

      } catch (err) {
        console.error(err);
        message.channel.send('${config.emojis.important} **|** Waktu habis atau terjadi kesalahan. Silakan coba lagi.');
      }
    }

      else if (sub === 'delete') {
        // Allow user to delete their own custom role and DB entry
        const filter = m => m.author.id === message.author.id;
        const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID);
        const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID);
        let roleType;
        if (isBoost && isDonate) {
          await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin dihapus.");
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const typeInput = collected.first().content.toLowerCase();
          if (!['boost', 'donate'].includes(typeInput)) {
            return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
          }
          roleType = typeInput;
        } else if (isBoost) {
          roleType = 'boost';
        } else if (isDonate) {
          roleType = 'donate';
        } else {
          return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
        }

        const customRole = await CustomRoleModel.findOne({
          guildId: message.guild.id,
          createdBy: message.author.id,
          roleType
        });
        if (!customRole) {
          return message.reply(`${config.emojis.important} **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
        }
        const role = message.guild.roles.cache.get(customRole.roleId);
        let deleted = false;
        if (role) {
          try {
            await role.delete(`Custom role ${roleType} dihapus oleh ${message.author.tag}`);
            deleted = true;
          } catch (err) {
            console.warn('Gagal menghapus role:', err);
          }
        }
        await CustomRoleModel.deleteOne({ _id: customRole._id });
        if (deleted) {
          return message.channel.send(`<a:check:1367395457529282581> **|** Custom role kamu berhasil dihapus dari server dan database.`);
        } else {
          return message.channel.send(`<a:check:1367395457529282581> **|** Data custom role di database dihapus. Role tidak ditemukan di server.`);
        }
      }
      else if (sub === 'edit') {
        const filter = m => m.author.id === message.author.id;

        const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
        const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

        let roleType;

        if (isBoost && isDonate) {
          await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin diedit.");
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const typeInput = collected.first().content.toLowerCase();
          if (!['boost', 'donate'].includes(typeInput)) {
            return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
          }
          roleType = typeInput;
        } else if (isBoost) {
          roleType = 'boost';
        } else if (isDonate) {
          roleType = 'donate';
        } else {
          return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
        }

        const customRole = await CustomRoleModel.findOne({
          guildId: message.guild.id,
          createdBy: message.author.id,
          roleType
        });

        if (!customRole) {
          return message.reply(`${config.emojis.important} **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
        }

        try {
          await message.channel.send('${config.emojis.seraphyx} **|** Apa yang ingin kamu edit? Pilih salah satu: `name`, `color`, atau `icon`.');
          const editChoiceMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const editChoice = editChoiceMsg.first().content.toLowerCase();

          const roleToEdit = message.guild.roles.cache.get(customRole.roleId);

          if (!roleToEdit) {
            return message.channel.send('${config.emojis.important} **|** Role yang ingin kamu edit tidak ditemukan.');
          }

          if (!roleToEdit.editable) {
            return message.channel.send('${config.emojis.important} **|** Saya tidak memiliki izin untuk mengedit role ini.');
          }

          if (editChoice === 'name') {
            await message.channel.send('${config.emojis.seraphyx} **|** Ketik nama baru untuk role kamu:');
            const newNameMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const newRoleName = newNameMsg.first().content;

            await roleToEdit.edit({ name: newRoleName });
            customRole.roleName = newRoleName;
            await customRole.save();

            message.channel.send(`<a:check:1367395457529282581> **|** Nama role berhasil diubah menjadi **${newRoleName}**.`);

          } else if (editChoice === 'color') {

            await message.channel.send('${config.emojis.seraphyx} **|** Ketik warna baru dalam format HEX (contoh: `#FF0000`) atau dua kode HEX untuk gradient (contoh: `#34ebd8 #34eb77`):');
            const newColorMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const colorInput = newColorMsg.first().content.trim();
            const colorParts = colorInput.split(/\s+/);
            let mainColor = colorParts[0];
            let gradientColor = null;

            if (colorParts.length === 1) {
              if (!/^#([0-9A-F]{6})$/i.test(mainColor)) {
                return message.channel.send('${config.emojis.important} **|** Format warna tidak valid. Gunakan HEX seperti `#RRGGBB`.');
              }
              await roleToEdit.edit({ colors: { primaryColor: mainColor } });
              customRole.roleColor = mainColor;
              await customRole.save();
              message.channel.send(`<a:check:1367395457529282581> **|** Warna role berhasil diubah menjadi **${mainColor}**.`);
            } else if (colorParts.length === 2) {
              if (!/^#([0-9A-F]{6})$/i.test(colorParts[0]) || !/^#([0-9A-F]{6})$/i.test(colorParts[1])) {
                return message.channel.send('${config.emojis.important} **|** Kedua warna harus format HEX seperti `#RRGGBB #RRGGBB`.');
              }
              gradientColor = colorParts[1];
              // Try setColors if available
              if (typeof roleToEdit.setColors === 'function') {
                try {
                  await roleToEdit.setColors({ primaryColor: mainColor, secondaryColor: gradientColor });
                  customRole.roleColor = `${mainColor},${gradientColor}`;
                  await customRole.save();
                  message.channel.send(`<a:check:1367395457529282581> **|** Gradient role berhasil diubah menjadi **${mainColor} | ${gradientColor}**.`);
                } catch (e) {
                  await roleToEdit.edit({ colors: { primaryColor: mainColor } });
                  customRole.roleColor = mainColor;
                  await customRole.save();
                  message.channel.send('${config.emojis.important} **|** Gagal mengatur gradient, menggunakan warna utama saja.');
                }
              } else {
                await roleToEdit.edit({ colors: { primaryColor: mainColor } });
                customRole.roleColor = mainColor;
                await customRole.save();
                message.channel.send('${config.emojis.important} **|** Gradient tidak didukung, menggunakan warna utama saja.');
              }
            } else {
              return message.channel.send('${config.emojis.important} **|** Masukkan satu atau dua kode warna HEX.');
            }

          } else if (editChoice === 'icon') {
            await message.channel.send('${config.emojis.seraphyx} **|** Kirim gambar baru untuk icon role kamu (image saja), atau ketik `cancel` untuk batal.');

            const iconMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

            const iconContent = iconMsg.first().content?.toLowerCase();
            const hasAttachment = iconMsg.first().attachments.size > 0;

            if (iconContent === 'cancel' || !hasAttachment) {
              return message.channel.send('${config.emojis.important} **|** Tidak ada perubahan icon dilakukan.');
            }

            const attachment = iconMsg.first().attachments.first();
            if (!attachment.contentType?.startsWith('image')) {
              return message.channel.send('${config.emojis.important} **|** File yang dikirim bukan gambar.');
            }

            try {
              const imageBuffer = await fetch(attachment.url).then(res => res.arrayBuffer());
              await roleToEdit.setIcon(Buffer.from(imageBuffer));

              customRole.roleIcon = attachment.url;
              await customRole.save();

              message.channel.send('<a:check:1367395457529282581> **|** Icon role berhasil diubah.');
            } catch (err) {
              console.error(err);
              message.channel.send('${config.emojis.important} **|** Gagal mengubah icon. Coba lagi atau pastikan server memiliki boost level yang cukup.');
            }

          } else {
            message.reply("${config.emojis.important} **|** Pilihan tidak valid. Harus `name`, `color`, atau `icon`.");
          }
        } catch (err) {
          console.error(err);
          message.channel.send('${config.emojis.important} **|** Waktu habis atau terjadi kesalahan. Silakan coba lagi.');
        }
      }

        else if (sub === 'add') {
          const filter = m => m.author.id === message.author.id;

          const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
          const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

          let roleType;

          if (isBoost && isDonate) {
            await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin ditambahkan anggota.");
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const typeInput = collected.first().content.toLowerCase();
            if (!['boost', 'donate'].includes(typeInput)) {
              return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
            }
            roleType = typeInput;
          } else if (isBoost) {
            roleType = 'boost';
          } else if (isDonate) {
            roleType = 'donate';
          } else {
            return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
          }

          const customRole = await CustomRoleModel.findOne({
            guildId: message.guild.id,
            createdBy: message.author.id,
            roleType
          });

          if (!customRole) {
            return message.reply(`${config.emojis.important} **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
          }

          const maxMembers = roleType === 'boost' ? 3 : 2;

          if (customRole.members.length >= maxMembers) {
            return message.reply(`${config.emojis.important} **|** Anda sudah mencapai batas anggota untuk role tipe **${roleType}**.`);
          }

          const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);

          if (!target) {
            return message.reply('${config.emojis.important} **|** Harap mention user yang ingin Anda tambahkan ke custom role.\nContoh: `seracr adduser @username`');
          }

          if (customRole.members.includes(target.id)) {
            return message.reply('${config.emojis.important} **|** User ini sudah menjadi bagian dari custom role.');
          }

          const role = message.guild.roles.cache.get(customRole.roleId);
          if (!role) {
            return message.reply('${config.emojis.important} **|** Role tidak ditemukan di server.');
          }

          try {
            await target.roles.add(role, `Ditambahkan ke custom role oleh ${message.author.tag}`);
            customRole.members.push(target.id);
            await customRole.save();

            message.channel.send(`<a:check:1367395457529282581> **|** <@${target.id}> berhasil ditambahkan ke custom role <@&${role.id}>.`);
          } catch (error) {
            console.error(error);
            message.reply('${config.emojis.important} **|** Gagal menambahkan user ke role. Periksa apakah bot memiliki izin yang cukup.');
          }
        }

          else if (sub === 'remove') {
            const filter = m => m.author.id === message.author.id;

            const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
            const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

            let roleType;

            if (isBoost && isDonate) {
              await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin diatur.");
              const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
              const typeInput = collected.first().content.toLowerCase();
              if (!['boost', 'donate'].includes(typeInput)) {
                return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
              }
              roleType = typeInput;
            } else if (isBoost) {
              roleType = 'boost';
            } else if (isDonate) {
              roleType = 'donate';
            } else {
              return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
            }

            const customRole = await CustomRoleModel.findOne({
              guildId: message.guild.id,
              createdBy: message.author.id,
              roleType
            });

            if (!customRole) {
              return message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('${config.emojis.important} **|** Custom Role Tidak Ditemukan')
                    .setDescription(`Anda belum memiliki custom role untuk tipe **${roleType}**.`)
                ]
              });
            }

            if (customRole.members.length <= 1) {
              return message.reply({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Orange')
                    .setTitle('${config.emojis.seraphyx} **|** Tidak Ada Member Lain')
                    .setDescription('Tidak ada member lain dalam custom role yang dapat dihapus.')
                ]
              });
            }

            const removableMembers = customRole.members.filter(id => id !== message.author.id);
            const memberMentions = removableMembers.map(id => `<@${id}>`).join("\n");

            await message.channel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor('White')
                  .setTitle('${config.emojis.seraphyx} **|** Hapus Member dari Custom Role')
                  .setDescription(`Silakan ketik **mention** atau **ID** dari salah satu user berikut:\n\n${memberMentions}`)
                  .setFooter({ text: 'Waktu input: 30 detik' })
              ]
            });

            try {
              const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
              const target = collected.first().mentions.users.first() || await message.guild.members.fetch(collected.first().content).catch(() => null);

              if (!target) {
                return message.channel.send({
                  embeds: [
                    new EmbedBuilder()
                      .setColor('Red')
                      .setTitle('${config.emojis.important} **|** User Tidak Ditemukan')
                      .setDescription('Pastikan mention atau ID yang Anda masukkan benar.')
                  ]
                });
              }

              if (!customRole.members.includes(target.id)) {
                return message.channel.send({
                  embeds: [
                    new EmbedBuilder()
                      .setColor('Red')
                      .setTitle('${config.emojis.important} **|** User Bukan Member Role')
                      .setDescription('User tersebut tidak termasuk dalam anggota custom role Anda.')
                  ]
                });
              }

              if (target.id === message.author.id) {
                return message.channel.send({
                  embeds: [
                    new EmbedBuilder()
                      .setColor('Red')
                      .setTitle('${config.emojis.important} **|** Tidak Bisa Menghapus Diri Sendiri')
                      .setDescription('Anda tidak dapat menghapus diri sendiri dari role.')
                  ]
                });
              }

              const role = message.guild.roles.cache.get(customRole.roleId);
              if (role) {
                const member = message.guild.members.cache.get(target.id);
                if (member) {
                  await member.roles.remove(role).catch(() => {});
                }
              }

              customRole.members = customRole.members.filter(id => id !== target.id);
              await customRole.save();

              return message.channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('<a:check:1367395457529282581> **|** Member Berhasil Dihapus')
                    .setDescription(`<@${target.id}> telah dihapus dari custom role Anda.`)
                ]
              });
            } catch (err) {
              console.error(err);
              return message.channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('${config.emojis.important} **|** Waktu Habis atau Kesalahan')
                    .setDescription('Anda tidak memberikan input dalam waktu yang ditentukan.')
                ]
              });
            }
          }

            else if (sub === 'info') {
              const filter = m => m.author.id === message.author.id;

              const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
              const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

              let roleType;

              if (isBoost && isDonate) {
                await message.channel.send("${config.emojis.seraphyx} **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk melihat info custom role yang sesuai.");
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
                const typeInput = collected.first().content.toLowerCase();
                if (!['boost', 'donate'].includes(typeInput)) {
                  return message.channel.send("${config.emojis.important} **|** Tipe tidak valid. Harus `boost` atau `donate`.");
                }
                roleType = typeInput;
              } else if (isBoost) {
                roleType = 'boost';
              } else if (isDonate) {
                roleType = 'donate';
              } else {
                return message.reply("${config.emojis.important} **|** Anda tidak memiliki role Boost atau Donate.");
              }

              const customRole = await CustomRoleModel.findOne({
                guildId: message.guild.id,
                createdBy: message.author.id,
                roleType
              });

              if (!customRole) {
                return message.reply({
                  embeds: [
                    new EmbedBuilder()
                      .setColor('Red')
                      .setTitle('${config.emojis.important} **|** Custom Role Tidak Ditemukan')
                      .setDescription(`Anda belum memiliki custom role untuk tipe **${roleType}**.`)
                  ]
                });
              }

              const role = message.guild.roles.cache.get(customRole.roleId);
              const maxMembers = roleType === 'boost' ? 3 : 2;

              const embed = new EmbedBuilder()
                .setColor('White')
                .setTitle('ℹ️ Informasi Custom Role')
                .addFields(
                  { name: '📛 Nama Role', value: role ? role.name : '*Role tidak ditemukan di server*', inline: true },
                  { name: '🆔 Role ID', value: customRole.roleId, inline: true },
                  { name: '👤 Dibuat Oleh', value: `<@${customRole.createdBy}>`, inline: true },
                  { name: '👥 Member dalam Role', value: customRole.members.map(id => `<@${id}>`).join('\n') || 'Tidak ada', inline: false },
                  { name: '📈 Jumlah Member / Maksimum', value: `${customRole.members.length} / ${maxMembers}`, inline: true },
                  { name: '🏷️ Tipe Role', value: `\`${roleType}\``, inline: true }
                )
                .setTimestamp();

              return message.channel.send({ embeds: [embed] });
            }

              else if (sub === 'delete') {
                const staffRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'staff');
                const hasPermission =
                  message.author.id === message.guild.ownerId ||
                  message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
                  (staffRole && message.member.roles.cache.has(staffRole.id));

                if (!hasPermission) {
                  return message.reply({
                    embeds: [
                      new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('${config.emojis.important} **|** Akses Ditolak')
                        .setDescription('Hanya user dengan **role Staff**, **Manage Roles**, atau **owner server** yang dapat menggunakan perintah ini.')
                    ]
                  });
                }

                const targetUser = message.mentions.users.first() || (args[1] && await message.client.users.fetch(args[1]).catch(() => null));
                const type = args[2]?.toLowerCase(); // boost / donate

                if (!targetUser || !['boost', 'donate'].includes(type)) {
                  return message.reply({
                    embeds: [
                      new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('${config.emojis.important} **|** Format Salah')
                        .setDescription('Gunakan format: `!cusrole delete @user boost` atau `!cusrole delete @user donate`.')
                    ]
                  });
                }

                const customRole = await CustomRoleModel.findOne({ guildId: message.guild.id, createdBy: targetUser.id, roleType: type });

                if (!customRole) {
                  return message.reply({
                    embeds: [
                      new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('${config.emojis.important} **|** Custom Role Tidak Ditemukan')
                        .setDescription(`<@${targetUser.id}> tidak memiliki custom role dengan tipe **${type}**.`)
                    ]
                  });
                }

                const role = message.guild.roles.cache.get(customRole.roleId);
                if (role) {
                  try {
                    await role.delete(`Custom role tipe ${type} dihapus oleh ${message.author.tag}`);
                  } catch (err) {
                    console.warn('⚠️ Gagal menghapus role:', err);
                    return message.reply({
                      embeds: [
                        new EmbedBuilder()
                          .setColor('Orange')
                          .setTitle('${config.emojis.seraphyx} **|** Role Tidak Bisa Dihapus')
                          .setDescription('Gagal menghapus role dari server. Mungkin role sudah dihapus atau bot tidak memiliki izin.')
                      ]
                    });
                  }
                }

                await CustomRoleModel.deleteOne({ _id: customRole._id });

                return message.reply({
                  embeds: [
                    new EmbedBuilder()
                      .setColor('Green')
                      .setTitle('<a:check:1367395457529282581> **|** Custom Role Dihapus')
                      .setDescription(`Custom role milik <@${targetUser.id}> dengan tipe **${type}** berhasil dihapus.`)
                  ]
                });
              }

    else {

      const embed = new EmbedBuilder()
      .setColor('Red')
      .setDescription(`${config.emojis.seraphyx} **|** List Command:\n\`seracr create\` - **Membuat Custom Role**\n\`seracr edit\` - **Mengedit Custom Role**\n\`seracr add\` - **Menambahkan User ke Custom Role**\n\`seracr remove\` - **Menghapus User dari Custom Role**\n\`seracr info\` - **Melihat Informasi Custom Role**\n\n${config.emojis.seraphyx} **|** Jika kamu menemukan bug atau error, silahkan laporkan ke staff yang sedang online.`);
      message.reply({ embeds: [embed] });
    }
  }
};
