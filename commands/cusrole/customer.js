const { EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas'); // optional for image editing
const fs = require('fs');
const CustomRoleModel = require('../../schemas/customRole'); // Pastikan schema MongoDB Anda sesuai
const { BOOST_ROLE_ID, DONATE_ROLE_ID } = require('../../config');

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
        await message.channel.send("<:seraphyx:1367175101711388783> **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin dinaikkan.");
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const typeInput = collected.first().content.toLowerCase();
        if (!['boost', 'donate'].includes(typeInput)) {
          return message.channel.send("<a:important:1367186288297377834> **|** Tipe tidak valid. Harus `boost` atau `donate`.");
        }
        roleType = typeInput;
      } else if (isBoost) {
        roleType = 'boost';
      } else if (isDonate) {
        roleType = 'donate';
      } else {
        return message.reply("<a:important:1367186288297377834> **|** Anda tidak memiliki role Boost atau Donate.");
      }

      const customRole = await CustomRoleModel.findOne({
        guildId: message.guild.id,
        createdBy: message.author.id,
        roleType
      });
      if (!customRole) {
        return message.reply(`<a:important:1367186288297377834> **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
      }
      const role = message.guild.roles.cache.get(customRole.roleId);
      if (!role) {
        return message.reply('<a:important:1367186288297377834> **|** Role custom tidak ditemukan di server.');
      }
      if (!role.editable) {
        return message.reply('<a:important:1367186288297377834> **|** Saya tidak memiliki izin untuk mengatur posisi role ini.');
      }
      // Find user's highest role (excluding managed and @everyone and the custom role itself)
      const userRoles = message.member.roles.cache
        .filter(r => r.id !== message.guild.id && !r.managed && r.id !== role.id)
        .sort((a, b) => b.position - a.position);
      const highest = userRoles.first();
      if (!highest) {
        return message.reply('<a:important:1367186288297377834> **|** Tidak ada role lain yang bisa dijadikan referensi.');
      }
      try {
        await role.setPosition(highest.position + 1);
        return message.channel.send(`<a:check:1367395457529282581> **|** Role custom kamu telah dinaikkan di atas <@&${highest.id}>.`);
      } catch (err) {
        console.error(err);
        return message.channel.send('<a:important:1367186288297377834> **|** Gagal menaikkan role. Pastikan bot memiliki izin dan role bot lebih tinggi.');
      }
    } else if (sub === 'create') {
      const filter = m => m.author.id === message.author.id;

      const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID); // ID role Boost
      const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID); // ID role Donate

      let roleType;
      if (isBoost && isDonate) {
        await message.channel.send("<:seraphyx:1367175101711388783> **|** Kamu memiliki role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih jenis custom role yang ingin dibuat.");
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const typeInput = collected.first().content.toLowerCase();
        if (!['boost', 'donate'].includes(typeInput)) {
          return message.channel.send("<a:important:1367186288297377834> **|** Tipe tidak valid. Harus `boost` atau `donate`.");
        }
        roleType = typeInput;
      } else if (isBoost) {
        roleType = 'boost';
      } else if (isDonate) {
        roleType = 'donate';
      } else {
        return message.reply("<a:important:1367186288297377834> **|** Anda tidak memiliki role Boost atau Donate.");
      }

      // Cek apakah user sudah memiliki custom role untuk tipe ini
      const existingRole = await CustomRoleModel.findOne({
        guildId: message.guild.id,
        createdBy: message.author.id,
        roleType
      });
      if (existingRole) {
        return message.reply(`<a:important:1367186288297377834> **|** Anda sudah memiliki custom role bertipe **${roleType}**.`);
      }

      try {
        // Step 1: Ask for role name
        await message.channel.send('<:seraphyx:1367175101711388783> **|** Silakan ketik nama role yang kamu inginkan (dalam 30 detik)...');
        const nameMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const roleName = nameMsg.first().content;


        // Step 2: Ask for role color or gradient
        await message.channel.send('<:seraphyx:1367175101711388783> **|** Ketik warna role dalam format HEX (contoh: `#FF0000`) atau dua kode HEX untuk gradient (contoh: `#34ebd8 #34eb77`)');
        const colorMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const colorInput = colorMsg.first().content.trim();
        const colorParts = colorInput.split(/\s+/);
        let roleColor = colorParts[0];
        let gradientColor = null;

        // Validate single or double hex codes
        if (colorParts.length === 1) {
          if (!/^#([0-9A-F]{6})$/i.test(roleColor)) {
            return message.channel.send('<a:important:1367186288297377834> **|** Format warna tidak valid. Gunakan format HEX seperti `#RRGGBB`.');
          }
        } else if (colorParts.length === 2) {
          if (!/^#([0-9A-F]{6})$/i.test(colorParts[0]) || !/^#([0-9A-F]{6})$/i.test(colorParts[1])) {
            return message.channel.send('<a:important:1367186288297377834> **|** Kedua warna harus format HEX seperti `#RRGGBB #RRGGBB`.');
          }
          gradientColor = colorParts[1];
        } else {
          return message.channel.send('<a:important:1367186288297377834> **|** Masukkan satu atau dua kode warna HEX.');
        }

        // Step 3: Ask for icon
        await message.channel.send('<:seraphyx:1367175101711388783> **|** Kirim gambar untuk icon role kamu (hanya image), atau ketik `cancel` untuk lewati (30 detik)...');
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
              await message.channel.send('<a:important:1367186288297377834> **|** Gagal mengatur gradient, menggunakan warna utama saja.');
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
            return message.channel.send('<a:important:1367186288297377834> **|** File yang dikirim bukan gambar.');
          }

          iconAttachment = attachment;

          // Buat role dan atur icon
          role = await createRoleWithColor({});

          try {
            const imageBuffer = await fetch(attachment.url).then(res => res.arrayBuffer());
            await role.setIcon(Buffer.from(imageBuffer));
          } catch (err) {
            console.warn('<a:important:1367186288297377834> **|** Gagal menetapkan icon role:', err.message);
            message.channel.send('<:seraphyx:1367175101711388783> **|** Role berhasil dibuat, tapi gagal mengatur icon (mungkin karena batasan level boost server).');
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
          message.channel.send('<:seraphyx:1367175101711388783> **|** Role berhasil dibuat, namun gagal memberikan role ke Anda.');
        }

        await message.channel.send(`<a:check:1367395457529282581> **|** Role berhasil dibuat: <@&${role.id}>`);

      } catch (err) {
        console.error(err);
        message.channel.send('<a:important:1367186288297377834> **|** Waktu habis atau terjadi kesalahan. Silakan coba lagi.');
      }
    }

      else if (sub === 'delete') {
        // Allow user to delete their own custom role and DB entry
        const filter = m => m.author.id === message.author.id;
        const isBoost = message.member.roles.cache.has(BOOST_ROLE_ID);
        const isDonate = message.member.roles.cache.has(DONATE_ROLE_ID);
        let roleType;
        if (isBoost && isDonate) {
          await message.channel.send("<:seraphyx:1367175101711388783> **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin dihapus.");
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const typeInput = collected.first().content.toLowerCase();
          if (!['boost', 'donate'].includes(typeInput)) {
            return message.channel.send("<a:important:1367186288297377834> **|** Tipe tidak valid. Harus `boost` atau `donate`.");
          }
          roleType = typeInput;
        } else if (isBoost) {
          roleType = 'boost';
        } else if (isDonate) {
          roleType = 'donate';
        } else {
          return message.reply("<a:important:1367186288297377834> **|** Anda tidak memiliki role Boost atau Donate.");
        }

        const customRole = await CustomRoleModel.findOne({
          guildId: message.guild.id,
          createdBy: message.author.id,
          roleType
        });
        if (!customRole) {
          return message.reply(`<a:important:1367186288297377834> **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
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
          await message.channel.send("<:seraphyx:1367175101711388783> **|** Kamu punya role **Boost** dan **Donate**. Ketik `boost` atau `donate` untuk memilih custom role yang ingin diedit.");
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const typeInput = collected.first().content.toLowerCase();
          if (!['boost', 'donate'].includes(typeInput)) {
            return message.channel.send("<a:important:1367186288297377834> **|** Tipe tidak valid. Harus `boost` atau `donate`.");
          }
          roleType = typeInput;
        } else if (isBoost) {
          roleType = 'boost';
        } else if (isDonate) {
          roleType = 'donate';
        } else {
          return message.reply("<a:important:1367186288297377834> **|** Anda tidak memiliki role Boost atau Donate.");
        }

        const customRole = await CustomRoleModel.findOne({
          guildId: message.guild.id,
          createdBy: message.author.id,
          roleType
        });

        if (!customRole) {
          return message.reply(`<a:important:1367186288297377834> **|** Anda belum memiliki custom role bertipe **${roleType}**.`);
        }

        try {
          await message.channel.send('<:seraphyx:1367175101711388783> **|** Apa yang ingin kamu edit? Pilih salah satu: `name`, `color`, atau `icon`.');
          const editChoiceMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
          const editChoice = editChoiceMsg.first().content.toLowerCase();

          const roleToEdit = message.guild.roles.cache.get(customRole.roleId);

          if (!roleToEdit) {
            return message.channel.send('<a:important:1367186288297377834> **|** Role yang ingin kamu edit tidak ditemukan.');
          }

          if (!roleToEdit.editable) {
            return message.channel.send('<a:important:1367186288297377834> **|** Saya tidak memiliki izin untuk mengedit role ini.');
          }

          if (editChoice === 'name') {
            await message.channel.send('<:seraphyx:1367175101711388783> **|** Ketik nama baru untuk role kamu:');
            const newNameMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const newRoleName = newNameMsg.first().content;

            await roleToEdit.edit({ name: newRoleName });
            customRole.roleName = newRoleName;
            await customRole.save();

            message.channel.send(`<a:check:1367395457529282581> **|** Nama role berhasil diubah menjadi **${newRoleName}**.`);

          } else if (editChoice === 'color') {

            await message.channel.send('<:seraphyx:1367175101711388783> **|** Ketik warna baru dalam format HEX (contoh: `#FF0000`) atau dua kode HEX untuk gradient (contoh: `#34ebd8 #34eb77`):');
            const newColorMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
            const colorInput = newColorMsg.first().content.trim();
            const colorParts = colorInput.split(/\s+/);
            let mainColor = colorParts[0];
            let gradientColor = null;

            if (colorParts.length === 1) {
              if (!/^#([0-9A-F]{6})$/i.test(mainColor)) {
                return message.channel.send('<a:important:1367186288297377834> **|** Format warna tidak valid. Gunakan HEX seperti `#RRGGBB`.');
              }
              await roleToEdit.edit({ colors: { primaryColor: mainColor } });
              customRole.roleColor = mainColor;
              await customRole.save();
              message.channel.send(`<a:check:1367395457529282581> **|** Warna role berhasil diubah menjadi **${mainColor}**.`);
            } else if (colorParts.length === 2) {
              if (!/^#([0-9A-F]{6})$/i.test(colorParts[0]) || !/^#([0-9A-F]{6})$/i.test(colorParts[1])) {
                return message.channel.send('<a:important:1367186288297377834> **|** Kedua warna harus format HEX seperti `#RRGGBB #RRGGBB`.');
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
                  message.channel.send('<a:important:1367186288297377834> **|** Gagal mengatur gradient, menggunakan warna utama saja.');
                }
              } else {
                await roleToEdit.edit({ colors: { primaryColor: mainColor } });
                customRole.roleColor = mainColor;
                await customRole.save();
                message.channel.send('<a:important:1367186288297377834> **|** Gradient tidak didukung, menggunakan warna utama saja.');
              }
            } else {
              return message.channel.send('<a:important:1367186288297377834> **|** Masukkan satu atau dua kode warna HEX.');
            }

          } else if (editChoice === 'icon') {
            await message.channel.send('<:seraphyx:1367175101711388783> **|** Kirim gambar baru untuk icon role kamu (image saja), atau ketik `cancel` untuk batal.');

            const iconMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });

            const iconContent = iconMsg.first().content?.toLowerCase();
            const hasAttachment = iconMsg.first().attachments.size > 0;

            if (iconContent === 'cancel' || !hasAttachment) {
              return message.channel.send('<a:important:1367186288297377834> **|** Tidak ada perubahan icon dilakukan.');
            }

            const attachment = iconMsg.first().attachments.first();
            if (!attachment.contentType?.startsWith('image')) {
              return message.channel.send('<a:important:13671862882973778
