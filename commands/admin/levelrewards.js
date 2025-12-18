const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const LevelReward = require('../../schemas/LevelReward');
const { formatNumber } = require('../../util/economyUtils');

module.exports = {
    name: 'levelrewards',
    aliases: ['lr', 'levelroles', 'rolerewards'],
    description: 'Kelola hadiah role otomatis untuk level',
    category: 'admin',
    usage: 'levelrewards [add/remove/list] [level] [@role] [souls_bonus]',
    examples: [
        'levelrewards list',
        'levelrewards add 10 @Member',
        'levelrewards add 20 @Active 500',
        'levelrewards remove 10'
    ],
    permissions: ['Administrator'],
    
    async exec(client, message, args) {
        // Check permissions
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ **|** Kamu membutuhkan permission Administrator untuk menggunakan command ini.');
        }
        
        const subcommand = args[0]?.toLowerCase();
        const guildId = message.guild.id;
        
        if (!subcommand || subcommand === 'list') {
            return this.listRewards(message, guildId);
        }
        
        switch (subcommand) {
            case 'add':
            case 'set':
                return this.addReward(message, args, guildId);
                
            case 'remove':
            case 'delete':
            case 'del':
                return this.removeReward(message, args, guildId);
                
            case 'test':
                return this.testReward(message, args, guildId);
                
            default:
                return this.listRewards(message, guildId);
        }
    },
    
    async listRewards(message, guildId) {
        const config = require('../../config');
        const rewards = await LevelReward.getRewardsForGuild(guildId);
        
        if (rewards.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('🎁 Hadiah Level')
                .setColor(config.colors?.primary || '#5865F2')
                .setDescription('Belum ada hadiah level yang dikonfigurasi.\n\nGunakan `levelrewards add <level> @role [bonus_souls]` untuk menambahkan!')
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setFooter({ text: 'Tips: Pengguna otomatis mendapat role saat mencapai level tertentu', iconURL: message.author.displayAvatarURL() });
            
            return message.reply({ embeds: [embed] });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎁 Hadiah Level')
            .setColor(config.colors?.primary || '#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setDescription(
                rewards.map(r => {
                    const role = message.guild.roles.cache.get(r.roleId);
                    const roleName = role ? `<@&${r.roleId}>` : `~~${r.roleName || 'Role Dihapus'}~~`;
                    const bonus = r.soulsBonus > 0 ? ` (+${formatNumber(r.soulsBonus)} souls)` : '';
                    const stack = r.removeOnHigher ? ' 📤' : ' 📥';
                    return `**Level ${r.level}** → ${roleName}${bonus}${stack}`;
                }).join('\n')
            )
            .addFields(
                { name: 'Keterangan', value: '📥 = Ditumpuk dengan role lain\n📤 = Dihapus saat mendapat role lebih tinggi', inline: false }
            )
            .setFooter({ text: `${rewards.length} hadiah dikonfigurasi`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    },
    
    async addReward(message, args, guildId) {
        const config = require('../../config');
        const level = parseInt(args[1]);
        const role = message.mentions.roles.first();
        const soulsBonus = parseInt(args[3]) || 0;
        
        if (!level || level < 1 || level > 100) {
            return message.reply('❌ **|** Harap tentukan level yang valid (1-100).');
        }
        
        if (!role) {
            return message.reply('❌ **|** Harap mention role yang akan diberikan.');
        }
        
        // Check if role is manageable
        if (role.managed) {
            return message.reply('❌ **|** Role ini dikelola oleh integrasi dan tidak dapat diberikan.');
        }
        
        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply('❌ **|** Saya tidak dapat memberikan role ini karena lebih tinggi dari role tertinggi saya.');
        }
        
        // Check for existing reward at this level
        const existing = await LevelReward.getRewardForLevel(guildId, level);
        
        const embed = new EmbedBuilder()
            .setTitle(existing ? '⚠️ Perbarui Hadiah Level?' : '➕ Tambah Hadiah Level')
            .setColor(existing ? (config.colors?.warning || '#FEE75C') : (config.colors?.primary || '#5865F2'))
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Level', value: `${level}`, inline: true },
                { name: 'Role', value: `${role}`, inline: true },
                { name: 'Bonus Souls', value: soulsBonus > 0 ? formatNumber(soulsBonus) : 'Tidak ada', inline: true }
            );
        
        if (existing) {
            const oldRole = message.guild.roles.cache.get(existing.roleId);
            embed.setDescription(`Ini akan mengganti hadiah yang ada:\n**Level ${level}** → ${oldRole || existing.roleName}`);
        }
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('lr_confirm')
                .setLabel('Konfirmasi')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('lr_stack')
                .setLabel('Hapus Saat Lebih Tinggi')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('lr_cancel')
                .setLabel('Batal')
                .setStyle(ButtonStyle.Danger)
        );
        
        const reply = await message.reply({ embeds: [embed], components: [row] });
        
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000
        });
        
        let removeOnHigher = false;
        
        collector.on('collect', async interaction => {
            if (interaction.customId === 'lr_stack') {
                removeOnHigher = !removeOnHigher;
                const updatedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('lr_confirm')
                        .setLabel('Konfirmasi')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('lr_stack')
                        .setLabel(removeOnHigher ? '✓ Hapus Saat Lebih Tinggi' : 'Hapus Saat Lebih Tinggi')
                        .setStyle(removeOnHigher ? ButtonStyle.Primary : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('lr_cancel')
                        .setLabel('Batal')
                        .setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [updatedRow] });
                return;
            }
            
            if (interaction.customId === 'lr_confirm') {
                await LevelReward.addReward(guildId, level, role.id, role.name, {
                    removeOnHigher,
                    soulsBonus,
                    createdBy: message.author.id
                });
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Hadiah Level Ditambahkan')
                    .setColor('#57F287')
                    .setDescription(`Pengguna yang mencapai **Level ${level}** sekarang akan menerima ${role}${soulsBonus > 0 ? ` dan **${formatNumber(soulsBonus)}** souls` : ''}!`);
                
                await interaction.update({ embeds: [successEmbed], components: [] });
                collector.stop();
            } else if (interaction.customId === 'lr_cancel') {
                await interaction.update({ content: 'Dibatalkan.', embeds: [], components: [] });
                collector.stop();
            }
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({ content: 'Waktu habis.', components: [] }).catch(() => {});
            }
        });
    },
    
    async removeReward(message, args, guildId) {
        const config = require('../../config');
        const level = parseInt(args[1]);
        
        if (!level || level < 1) {
            return message.reply('❌ **|** Harap tentukan level yang valid.');
        }
        
        const existing = await LevelReward.getRewardForLevel(guildId, level);
        
        if (!existing) {
            return message.reply(`❌ **|** Tidak ada hadiah yang dikonfigurasi untuk level ${level}.`);
        }
        
        await LevelReward.removeReward(guildId, level);
        
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Hadiah Level Dihapus')
            .setColor(config.colors?.error || '#ED4245')
            .setDescription(`Hadiah untuk **Level ${level}** (${existing.roleName || 'Role Tidak Dikenal'}) telah dihapus`)
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Dihapus oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    },
    
    async testReward(message, args, guildId) {
        const config = require('../../config');
        const level = parseInt(args[1]) || 1;
        const rewards = await LevelReward.getRewardsUpToLevel(guildId, level);
        
        if (rewards.length === 0) {
            return message.reply(`📋 **|** Tidak ada hadiah yang akan diberikan untuk level ${level}.`);
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📋 Hadiah untuk Level ${level}`)
            .setColor(config.colors?.primary || '#5865F2')
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setDescription(
                rewards.map(r => {
                    const role = message.guild.roles.cache.get(r.roleId);
                    return `• ${role || r.roleName}${r.soulsBonus > 0 ? ` (+${formatNumber(r.soulsBonus)} souls)` : ''}`;
                }).join('\n')
            )
            .setFooter({ text: `Diminta oleh ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
};
