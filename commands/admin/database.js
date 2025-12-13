const { EmbedBuilder } = require('discord.js');
const databaseOptimizer = require('../../util/databaseOptimizer');
const logger = require('../../util/logger');
const rolePermissions = require('../../util/rolePermissions');

module.exports = {
    name: 'database',
    aliases: ['db', 'dbstats', 'optimize'],
    description: 'Database management and optimization commands',
    category: 'admin',
    usage: 'database [stats|optimize|cleanup|recommendations]',
    
    async exec(client, message, args) {
        // Check permission using standardized system
        const permissionError = rolePermissions.checkPermission(message.member, 'admin');
        if (permissionError) {
            return message.reply(permissionError);
        }

        const subcommand = args[0]?.toLowerCase() || 'stats';

        try {
            switch (subcommand) {
                case 'stats':
                    await this.showDatabaseStats(message);
                    break;
                case 'optimize':
                    await this.optimizeDatabase(message);
                    break;
                case 'cleanup':
                    await this.cleanupDatabase(message);
                    break;
                case 'recommendations':
                    await this.showRecommendations(message);
                    break;
                case 'metrics':
                    await this.showPerformanceMetrics(message);
                    break;
                default:
                    await this.showHelp(message);
            }
        } catch (error) {
            console.error('Error in database command:', error);
            await logger.logError(error, 'database command');
            message.reply('❌ **|** Terjadi kesalahan saat mengakses database.');
        }
    },

    /**
     * Show database statistics
     */
    async showDatabaseStats(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Mengambil statistik database...');
        
        const stats = await databaseOptimizer.analyzeCollectionStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Database Statistics')
            .setColor('#5865F2')
            .setTimestamp();

        if (Object.keys(stats).length === 0) {
            embed.setDescription('Tidak ada data statistik yang tersedia.');
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

        // Calculate totals
        let totalDocuments = 0;
        let totalSize = 0;
        let totalIndexes = 0;
        const collections = [];

        for (const [collectionName, collStats] of Object.entries(stats)) {
            if (collStats.error) continue;
            
            totalDocuments += collStats.documentCount || 0;
            totalSize += collStats.totalSize || 0;
            totalIndexes += collStats.indexCount || 0;
            
            collections.push({
                name: collectionName,
                documents: collStats.documentCount || 0,
                size: collStats.totalSize || 0,
                indexes: collStats.indexCount || 0,
                avgSize: collStats.avgDocumentSize || 0
            });
        }

        // Sort collections by document count
        collections.sort((a, b) => b.documents - a.documents);

        // Overview
        embed.addFields({
            name: '📈 Overview',
            value: [
                `**Total Collections:** ${collections.length}`,
                `**Total Documents:** ${totalDocuments.toLocaleString()}`,
                `**Total Size:** ${databaseOptimizer.formatBytes(totalSize)}`,
                `**Total Indexes:** ${totalIndexes}`
            ].join('\n'),
            inline: true
        });

        // Top collections
        const topCollections = collections.slice(0, 5)
            .map((coll, index) => 
                `${index + 1}. **${coll.name}** - ${coll.documents.toLocaleString()} docs (${databaseOptimizer.formatBytes(coll.size)})`
            )
            .join('\n');

        if (topCollections) {
            embed.addFields({
                name: '🏆 Top Collections',
                value: topCollections,
                inline: false
            });
        }

        // Index information
        const indexInfo = collections
            .filter(coll => coll.documents > 0)
            .map(coll => `**${coll.name}:** ${coll.indexes} indexes`)
            .slice(0, 8)
            .join('\n');

        if (indexInfo) {
            embed.addFields({
                name: '🔍 Index Information',
                value: indexInfo,
                inline: true
            });
        }

        // Performance indicators
        const indicators = [];
        const avgDocsPerCollection = totalDocuments / collections.length;
        
        if (avgDocsPerCollection < 1000) {
            indicators.push('🟢 Collection Size: Good');
        } else if (avgDocsPerCollection < 10000) {
            indicators.push('🟡 Collection Size: Moderate');
        } else {
            indicators.push('🔴 Collection Size: Large');
        }

        const avgIndexesPerCollection = totalIndexes / collections.length;
        if (avgIndexesPerCollection >= 2) {
            indicators.push('🟢 Indexing: Good');
        } else {
            indicators.push('🟡 Indexing: Needs Attention');
        }

        embed.addFields({
            name: '📊 Performance Indicators',
            value: indicators.join('\n'),
            inline: false
        });

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    /**
     * Optimize database
     */
    async optimizeDatabase(message) {
        const confirmMsg = await message.channel.send('⚠️ **|** Database optimization akan dimulai. Proses ini mungkin memakan waktu beberapa menit. Lanjutkan? (ketik `yes` untuk konfirmasi)');
        
        const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
        
        try {
            await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        } catch {
            return confirmMsg.edit('❌ **|** Optimization dibatalkan (timeout).');
        }

        const optimizingMsg = await message.channel.send('🔄 **|** Mengoptimasi database... Mohon tunggu...');
        
        const result = await databaseOptimizer.optimizeDatabase();
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Database Optimization Results')
            .setColor(result.success ? '#57F287' : '#ED4245')
            .setTimestamp();

        if (result.success) {
            embed.setDescription('✅ Database optimization berhasil diselesaikan!');
            
            embed.addFields(
                {
                    name: '📊 Results',
                    value: [
                        `**Execution Time:** ${result.executionTime}ms`,
                        `**Indexes Created:** ${result.results.indexesCreated}`,
                        `**Collections Analyzed:** ${result.results.collectionsAnalyzed}`,
                        `**Optimizations Applied:** ${result.results.optimizationsApplied}`,
                        `**Records Removed:** ${result.results.recordsRemoved || 0}`
                    ].join('\n'),
                    inline: false
                }
            );

            if (result.results.errors && result.results.errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Warnings',
                    value: result.results.errors.slice(0, 3).join('\n'),
                    inline: false
                });
            }
        } else {
            embed.setDescription('❌ Database optimization gagal.');
            embed.addFields({
                name: 'Error',
                value: result.error || 'Unknown error occurred',
                inline: false
            });
        }

        await optimizingMsg.edit({ content: null, embeds: [embed] });
        
        // Log the optimization
        await logger.log('INFO', 'DATABASE', 
            `Database optimization ${result.success ? 'completed' : 'failed'} by ${message.author.tag}`,
            { userId: message.author.id, guildId: message.guild.id, result }
        );
    },

    /**
     * Show database cleanup options
     */
    async cleanupDatabase(message) {
        const embed = new EmbedBuilder()
            .setTitle('🧹 Database Cleanup')
            .setColor('#FEE75C')
            .setDescription('Pilih jenis cleanup yang ingin dilakukan:')
            .addFields(
                {
                    name: '🗑️ Available Cleanup Options',
                    value: [
                        '`database cleanup old` - Hapus data lama (warns >90 hari, giveaway selesai >30 hari)',
                        '`database cleanup activity` - Hapus activity data lama (>90 hari)',
                        '`database cleanup all` - Jalankan semua cleanup (HATI-HATI!)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Warning',
                    value: 'Cleanup akan menghapus data secara permanen. Pastikan Anda sudah backup jika diperlukan.',
                    inline: false
                }
            );

        await message.channel.send({ embeds: [embed] });
    },

    /**
     * Show optimization recommendations
     */
    async showRecommendations(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Menganalisis database untuk rekomendasi...');
        
        const recommendations = await databaseOptimizer.getOptimizationRecommendations();
        
        const embed = new EmbedBuilder()
            .setTitle('💡 Database Optimization Recommendations')
            .setColor('#5865F2')
            .setTimestamp();

        if (recommendations.length === 0) {
            embed.setDescription('✅ Database sudah optimal! Tidak ada rekomendasi saat ini.');
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

        // Group recommendations by priority
        const highPriority = recommendations.filter(r => r.priority === 'high');
        const mediumPriority = recommendations.filter(r => r.priority === 'medium');
        const lowPriority = recommendations.filter(r => r.priority === 'low');

        if (highPriority.length > 0) {
            embed.addFields({
                name: '🔴 High Priority',
                value: highPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        if (mediumPriority.length > 0) {
            embed.addFields({
                name: '🟡 Medium Priority',
                value: mediumPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        if (lowPriority.length > 0) {
            embed.addFields({
                name: '🟢 Low Priority',
                value: lowPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        embed.addFields({
            name: '🔧 Next Steps',
            value: [
                '• Run `database optimize` to apply automatic optimizations',
                '• Consider manual schema changes for high priority items',
                '• Monitor performance after applying changes',
                '• Schedule regular optimization runs'
            ].join('\n'),
            inline: false
        });

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    /**
     * Show detailed performance metrics
     */
    async showPerformanceMetrics(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Mengambil metrics database...');
        
        const metrics = await databaseOptimizer.getPerformanceMetrics();
        
        const embed = new EmbedBuilder()
            .setTitle('📈 Database Performance Metrics')
            .setColor('#5865F2')
            .setTimestamp();

        if (metrics.error) {
            embed.setDescription(`❌ Error: ${metrics.error}`);
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

        // Server information
        if (metrics.server) {
            embed.addFields({
                name: '🖥️ Server Info',
                value: [
                    `**Version:** ${metrics.server.version}`,
                    `**Uptime:** ${Math.floor(metrics.server.uptime / 3600)} hours`,
                    `**Connections:** ${metrics.server.connections?.current || 'N/A'}`,
                    `**Memory:** ${databaseOptimizer.formatBytes(metrics.server.memory?.resident * 1024 * 1024 || 0)}`
                ].join('\n'),
                inline: true
            });
        }

        // Database statistics
        if (metrics.database) {
            embed.addFields({
                name: '💾 Database Stats',
                value: [
                    `**Collections:** ${metrics.database.collections}`,
                    `**Documents:** ${metrics.database.objects?.toLocaleString() || 'N/A'}`,
                    `**Data Size:** ${databaseOptimizer.formatBytes(metrics.database.dataSize || 0)}`,
                    `**Index Size:** ${databaseOptimizer.formatBytes(metrics.database.indexSize || 0)}`
                ].join('\n'),
                inline: true
            });
        }

        // Connection status
        if (metrics.connection) {
            const connectionStates = {
                0: 'Disconnected',
                1: 'Connected',
                2: 'Connecting',
                3: 'Disconnecting'
            };

            embed.addFields({
                name: '🔗 Connection Info',
                value: [
                    `**Status:** ${connectionStates[metrics.connection.readyState] || 'Unknown'}`,
                    `**Host:** ${metrics.connection.host || 'N/A'}`,
                    `**Port:** ${metrics.connection.port || 'N/A'}`,
                    `**Database:** ${metrics.connection.name || 'N/A'}`
                ].join('\n'),
                inline: true
            });
        }

        // Optimization history
        if (metrics.optimization?.lastOptimization) {
            const lastOpt = metrics.optimization.lastOptimization;
            embed.addFields({
                name: '🔧 Last Optimization',
                value: [
                    `**Time:** <t:${Math.floor(lastOpt.timestamp.getTime() / 1000)}:R>`,
                    `**Duration:** ${lastOpt.executionTime}ms`,
                    `**Indexes Created:** ${lastOpt.results.indexesCreated}`,
                    `**Records Removed:** ${lastOpt.results.recordsRemoved || 0}`
                ].join('\n'),
                inline: false
            });
        }

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    /**
     * Show help for database command
     */
    async showHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Database Command Help')
            .setColor('#5865F2')
            .setDescription('Database management and optimization tools')
            .addFields(
                {
                    name: '📋 Available Subcommands',
                    value: [
                        '`database stats` - Show database statistics',
                        '`database optimize` - Run database optimization',
                        '`database cleanup` - Show cleanup options',
                        '`database recommendations` - Get optimization recommendations',
                        '`database metrics` - Show detailed performance metrics'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Examples',
                    value: [
                        '`database` - Show stats (default)',
                        '`database optimize` - Optimize database performance',
                        '`database recommendations` - Get improvement suggestions'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Important Notes',
                    value: [
                        '• Optimization may take several minutes',
                        '• Always backup before major operations',
                        '• Monitor performance after changes',
                        '• Run optimization during low usage periods'
                    ].join('\n'),
                    inline: false
                }
            );

        await message.channel.send({ embeds: [embed] });
    }
};