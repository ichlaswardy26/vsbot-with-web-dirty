const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const i18n = require('../../util/i18nManager');

module.exports = {
    name: 'language',
    aliases: ['lang', 'bahasa'],
    description: 'Change bot language / Ubah bahasa bot',
    category: 'utility',
    usage: 'language [code]',
    examples: ['language', 'language en', 'language id'],
    
    async exec(client, message, args) {
        const guildId = message.guild?.id;
        const userId = message.author.id;
        
        // If language code provided, set it directly
        if (args[0]) {
            const langCode = args[0].toLowerCase();
            
            if (!i18n.isLanguageSupported(langCode)) {
                const available = i18n.getAvailableLanguages()
                    .map(l => `\`${l.code}\` - ${l.flag} ${l.nativeName}`)
                    .join('\n');
                
                return message.reply({
                    content: `❌ Language \`${langCode}\` is not supported.\n\n**Available languages:**\n${available}`
                });
            }
            
            // Check if user wants to set for guild or self
            const isAdmin = message.member?.permissions.has('Administrator');
            
            if (args[1] === 'server' && isAdmin) {
                await i18n.setGuildLanguage(guildId, langCode);
                const langInfo = i18n.getAvailableLanguages().find(l => l.code === langCode);
                
                return message.reply({
                    content: `${langInfo.flag} Server language set to **${langInfo.nativeName}**`
                });
            } else {
                await i18n.setUserLanguage(userId, langCode);
                const langInfo = i18n.getAvailableLanguages().find(l => l.code === langCode);
                
                return message.reply({
                    content: `${langInfo.flag} Your language set to **${langInfo.nativeName}**`
                });
            }
        }
        
        // Show language selection menu
        const languages = i18n.getAvailableLanguages();
        const currentUserLang = i18n.getLanguage(userId, guildId);
        const currentGuildLang = i18n.getLanguage(null, guildId);
        
        const embed = new EmbedBuilder()
            .setTitle('🌐 Language Settings / Pengaturan Bahasa')
            .setDescription(
                `**Your language / Bahasamu:** ${languages.find(l => l.code === currentUserLang)?.flag || '🏳️'} ${currentUserLang}\n` +
                `**Server language / Bahasa server:** ${languages.find(l => l.code === currentGuildLang)?.flag || '🏳️'} ${currentGuildLang}\n\n` +
                `Select a language below to change your preference.\n` +
                `Pilih bahasa di bawah untuk mengubah preferensimu.`
            )
            .setColor('#5865F2')
            .setFooter({ text: 'Your preference overrides server language / Preferensimu menggantikan bahasa server' });
        
        const options = languages.map(lang => ({
            label: lang.nativeName,
            description: lang.name,
            value: lang.code,
            emoji: lang.flag,
            default: lang.code === currentUserLang
        }));
        
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('language_select')
            .setPlaceholder('Select language / Pilih bahasa')
            .addOptions(options);
        
        const row = new ActionRowBuilder().addComponents(selectMenu);
        
        const reply = await message.reply({
            embeds: [embed],
            components: [row]
        });
        
        // Create collector for selection
        const collector = reply.createMessageComponentCollector({
            filter: i => i.user.id === userId,
            time: 60000
        });
        
        collector.on('collect', async interaction => {
            const selectedLang = interaction.values[0];
            await i18n.setUserLanguage(userId, selectedLang);
            
            const langInfo = languages.find(l => l.code === selectedLang);
            
            const successEmbed = new EmbedBuilder()
                .setTitle(`${langInfo.flag} Language Changed / Bahasa Diubah`)
                .setDescription(
                    `Your language has been set to **${langInfo.nativeName}**\n` +
                    `Bahasamu telah diatur ke **${langInfo.nativeName}**`
                )
                .setColor('#57F287');
            
            await interaction.update({
                embeds: [successEmbed],
                components: []
            });
            
            collector.stop();
        });
        
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                reply.edit({
                    components: []
                }).catch(() => {});
            }
        });
    }
};
