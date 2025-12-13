const { EmbedBuilder } = require('discord.js');
const configValidator = require('../../util/configValidator');
const rolePermissions = require('../../util/rolePermissions');

module.exports = {
    name: 'validateconfig',
    aliases: ['checkconfig', 'configcheck'],
    description: 'Validate bot configuration and server setup',
    category: 'admin',
    
    async exec(client, message, args) {
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'admin');
        if (permissionError) {
            return message.reply(permissionError);
        }

        const loadingMsg = await message.channel.send('🔄 **|** Memvalidasi konfigurasi bot...');

        try {
            // Check for cached results first
            let results = configValidator.getCachedResults(message.guild.id);
            
            if (!results) {
                // Run full validation
                results = await configValidator.validateAll(message.guild);
            }

            // Create validation report embed
            const embed = configValidator.createValidationReport(results);

            // Add detailed information if there are issues
            if (!results.overall) {
                const issues = [];
                
                // Bot permissions issues
                if (results.validations.botPermissions && !results.validations.botPermissions.valid) {
                    issues.push(`🤖 **Bot Permissions:** ${results.validations.botPermissions.error}`);
                }

                // Role hierarchy issues
                if (results.validations.roleHierarchy && !results.validations.roleHierarchy.valid) {
                    issues.push(`📊 **Role Hierarchy:** ${results.validations.roleHierarchy.error}`);
                }

                // Role configuration issues
                if (results.validations.roles) {
                    const roleIssues = [];
                    for (const [roleName, validation] of Object.entries(results.validations.roles)) {
                        if (!validation.valid && validation.severity === 'error') {
                            roleIssues.push(`${roleName}: ${validation.error}`);
                        }
                    }
                    if (roleIssues.length > 0) {
                        issues.push(`👥 **Role Issues:**\n${roleIssues.join('\n')}`);
                    }
                }

                if (issues.length > 0) {
                    embed.addFields({
                        name: '⚠️ Issues Found',
                        value: issues.join('\n\n'),
                        inline: false
                    });
                }
            }

            // Add recommendations
            const recommendations = [];
            
            if (results.validations.roleHierarchy && !results.validations.roleHierarchy.valid) {
                recommendations.push('• Move bot role higher in server role hierarchy');
            }
            
            if (results.validations.botPermissions && !results.validations.botPermissions.valid) {
                recommendations.push('• Grant missing permissions to bot role');
            }

            // Check for missing role configurations
            const missingRoles = [];
            if (results.validations.roles) {
                for (const [roleName, validation] of Object.entries(results.validations.roles)) {
                    if (!validation.valid && validation.severity === 'warning') {
                        missingRoles.push(roleName);
                    }
                }
            }
            
            if (missingRoles.length > 0) {
                recommendations.push(`• Configure missing roles: ${missingRoles.join(', ')}`);
            }

            if (recommendations.length > 0) {
                embed.addFields({
                    name: '💡 Recommendations',
                    value: recommendations.join('\n'),
                    inline: false
                });
            }

            // Add configuration status
            const configStatus = [];
            configStatus.push(`📊 **Validation Time:** <t:${Math.floor(results.timestamp.getTime() / 1000)}:R>`);
            configStatus.push(`🔧 **Bot Version:** ${require('../../../package.json').version}`);
            configStatus.push(`📈 **Guild Members:** ${message.guild.memberCount}`);
            
            embed.addFields({
                name: '📋 System Info',
                value: configStatus.join('\n'),
                inline: false
            });

            await loadingMsg.edit({ content: null, embeds: [embed] });

            // If there are critical issues, send additional help
            if (!results.overall) {
                const helpEmbed = new EmbedBuilder()
                    .setTitle('🆘 Need Help?')
                    .setColor('#FEE75C')
                    .setDescription('Konfigurasi bot memiliki masalah yang perlu diperbaiki.')
                    .addFields(
                        {
                            name: '📚 Documentation',
                            value: 'Lihat `PERMISSIONS.md` untuk panduan lengkap',
                            inline: true
                        },
                        {
                            name: '🧪 Testing',
                            value: 'Gunakan `testpermissions` untuk debug permission',
                            inline: true
                        },
                        {
                            name: '🔄 Re-validate',
                            value: 'Jalankan command ini lagi setelah perbaikan',
                            inline: true
                        }
                    );

                await message.channel.send({ embeds: [helpEmbed] });
            }

        } catch (error) {
            console.error('Error in validateconfig command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Validation Error')
                .setColor('#ED4245')
                .setDescription('Terjadi kesalahan saat memvalidasi konfigurasi.')
                .addFields({
                    name: 'Error Details',
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false
                });

            await loadingMsg.edit({ content: null, embeds: [errorEmbed] });
        }
    }
};