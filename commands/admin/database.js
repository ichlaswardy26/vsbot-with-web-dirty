const { EmbedBuilder } = require('discord.js');
const databaseOptimizer = require('../../util/databaseOptimizer');
const logger = require('../../util/logger');
const rolePermissions = require('../../util/rolePermissions');
const config = require('../../config.js');

module.exports = {
    name: 'database',
    aliases: ['db', 'dbstats', 'optimize'],
    description: 'Manajemen dan optimasi database',
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
            message.reply(`${config.emojis?.cross || "❌"} **|** Terjadi kesalahan saat mengakses database.`);
        }
    },

    async showDatabaseStats(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Mengambil statistik database...');
        
        const stats = await databaseOptimizer.analyzeCollectionStats();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Statistik Database')
            .setColor(config.colors?.primary || '#5865F2')
            .setTimestamp();

        if (Object.keys(stats).length === 0) {
            embed.setDescription('Tidak ada data statistik yang tersedia.');
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

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

        collections.sort((a, b) => b.documents - a.documents);

        embed.addFields({
            name: '📈 Ringkasan',
            value: [
                `**Total Koleksi:** ${collections.length}`,
                `**Total Dokumen:** ${totalDocuments.toLocaleString()}`,
                `**Total Ukuran:** ${databaseOptimizer.formatBytes(totalSize)}`,
                `**Total Index:** ${totalIndexes}`
            ].join('\n'),
            inline: true
        });

        const topCollections = collections.slice(0, 5)
            .map((coll, index) => 
                `${index + 1}. **${coll.name}** - ${coll.documents.toLocaleString()} docs (${databaseOptimizer.formatBytes(coll.size)})`
            )
            .join('\n');

        if (topCollections) {
            embed.addFields({
                name: '🏆 Koleksi Terbesar',
                value: topCollections,
                inline: false
            });
        }

        const indexInfo = collections
            .filter(coll => coll.documents > 0)
            .map(coll => `**${coll.name}:** ${coll.indexes} index`)
            .slice(0, 8)
            .join('\n');

        if (indexInfo) {
            embed.addFields({
                name: '🔍 Informasi Index',
                value: indexInfo,
                inline: true
            });
        }

        const indicators = [];
        const avgDocsPerCollection = totalDocuments / collections.length;
        
        if (avgDocsPerCollection < 1000) {
            indicators.push('🟢 Ukuran Koleksi: Baik');
        } else if (avgDocsPerCollection < 10000) {
            indicators.push('🟡 Ukuran Koleksi: Sedang');
        } else {
            indicators.push('🔴 Ukuran Koleksi: Besar');
        }

        const avgIndexesPerCollection = totalIndexes / collections.length;
        if (avgIndexesPerCollection >= 2) {
            indicators.push('🟢 Indexing: Baik');
        } else {
            indicators.push('🟡 Indexing: Perlu Perhatian');
        }

        embed.addFields({
            name: '📊 Indikator Performa',
            value: indicators.join('\n'),
            inline: false
        });

        embed.setFooter({ 
            text: `Diminta oleh ${message.author.username}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        });

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    async optimizeDatabase(message) {
        const confirmMsg = await message.channel.send('⚠️ **|** Optimasi database akan dimulai. Proses ini mungkin memakan waktu beberapa menit. Lanjutkan? (ketik `yes` untuk konfirmasi)');
        
        const filter = m => m.author.id === message.author.id && m.content.toLowerCase() === 'yes';
        
        try {
            await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        } catch {
            return confirmMsg.edit(`${config.emojis?.cross || "❌"} **|** Optimasi dibatalkan (waktu habis).`);
        }

        const optimizingMsg = await message.channel.send('🔄 **|** Mengoptimasi database... Mohon tunggu...');
        
        const result = await databaseOptimizer.optimizeDatabase();
        
        const embed = new EmbedBuilder()
            .setTitle('🔧 Hasil Optimasi Database')
            .setColor(result.success ? (config.colors?.success || '#57F287') : (config.colors?.error || '#ED4245'))
            .setTimestamp();

        if (result.success) {
            embed.setDescription('✅ Optimasi database berhasil diselesaikan!');
            
            embed.addFields(
                {
                    name: '📊 Hasil',
                    value: [
                        `**Waktu Eksekusi:** ${result.executionTime}ms`,
                        `**Index Dibuat:** ${result.results.indexesCreated}`,
                        `**Koleksi Dianalisis:** ${result.results.collectionsAnalyzed}`,
                        `**Optimasi Diterapkan:** ${result.results.optimizationsApplied}`,
                        `**Record Dihapus:** ${result.results.recordsRemoved || 0}`
                    ].join('\n'),
                    inline: false
                }
            );

            if (result.results.errors && result.results.errors.length > 0) {
                embed.addFields({
                    name: '⚠️ Peringatan',
                    value: result.results.errors.slice(0, 3).join('\n'),
                    inline: false
                });
            }
        } else {
            embed.setDescription(`${config.emojis?.cross || "❌"} Optimasi database gagal.`);
            embed.addFields({
                name: 'Error',
                value: result.error || 'Terjadi kesalahan tidak diketahui',
                inline: false
            });
        }

        await optimizingMsg.edit({ content: null, embeds: [embed] });
        
        await logger.log('INFO', 'DATABASE', 
            `Optimasi database ${result.success ? 'berhasil' : 'gagal'} oleh ${message.author.tag}`,
            { userId: message.author.id, guildId: message.guild.id, result }
        );
    },

    async cleanupDatabase(message) {
        const embed = new EmbedBuilder()
            .setTitle('🧹 Pembersihan Database')
            .setColor(config.colors?.warning || '#FEE75C')
            .setDescription('Pilih jenis pembersihan yang ingin dilakukan:')
            .addFields(
                {
                    name: '🗑️ Opsi Pembersihan',
                    value: [
                        '`database cleanup old` - Hapus data lama (warns >90 hari, giveaway selesai >30 hari)',
                        '`database cleanup activity` - Hapus data aktivitas lama (>90 hari)',
                        '`database cleanup all` - Jalankan semua pembersihan (HATI-HATI!)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Peringatan',
                    value: 'Pembersihan akan menghapus data secara permanen. Pastikan sudah backup jika diperlukan.',
                    inline: false
                }
            )
            .setFooter({ text: `Diminta oleh ${message.author.username}` });

        await message.channel.send({ embeds: [embed] });
    },

    async showRecommendations(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Menganalisis database untuk rekomendasi...');
        
        const recommendations = await databaseOptimizer.getOptimizationRecommendations();
        
        const embed = new EmbedBuilder()
            .setTitle('💡 Rekomendasi Optimasi Database')
            .setColor(config.colors?.primary || '#5865F2')
            .setTimestamp();

        if (recommendations.length === 0) {
            embed.setDescription('✅ Database sudah optimal! Tidak ada rekomendasi saat ini.');
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

        const highPriority = recommendations.filter(r => r.priority === 'high');
        const mediumPriority = recommendations.filter(r => r.priority === 'medium');
        const lowPriority = recommendations.filter(r => r.priority === 'low');

        if (highPriority.length > 0) {
            embed.addFields({
                name: '🔴 Prioritas Tinggi',
                value: highPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        if (mediumPriority.length > 0) {
            embed.addFields({
                name: '🟡 Prioritas Sedang',
                value: mediumPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        if (lowPriority.length > 0) {
            embed.addFields({
                name: '🟢 Prioritas Rendah',
                value: lowPriority.map(r => `• ${r.message}`).join('\n'),
                inline: false
            });
        }

        embed.addFields({
            name: '🔧 Langkah Selanjutnya',
            value: [
                '• Jalankan `database optimize` untuk optimasi otomatis',
                '• Pertimbangkan perubahan schema untuk item prioritas tinggi',
                '• Monitor performa setelah menerapkan perubahan',
                '• Jadwalkan optimasi rutin'
            ].join('\n'),
            inline: false
        });

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    async showPerformanceMetrics(message) {
        const loadingMsg = await message.channel.send('🔄 **|** Mengambil metrik database...');
        
        const metrics = await databaseOptimizer.getPerformanceMetrics();
        
        const embed = new EmbedBuilder()
            .setTitle('📈 Metrik Performa Database')
            .setColor(config.colors?.primary || '#5865F2')
            .setTimestamp();

        if (metrics.error) {
            embed.setDescription(`${config.emojis?.cross || "❌"} Error: ${metrics.error}`);
            return loadingMsg.edit({ content: null, embeds: [embed] });
        }

        if (metrics.server) {
            embed.addFields({
                name: '🖥️ Info Server',
                value: [
                    `**Versi:** ${metrics.server.version}`,
                    `**Uptime:** ${Math.floor(metrics.server.uptime / 3600)} jam`,
                    `**Koneksi:** ${metrics.server.connections?.current || 'N/A'}`,
                    `**Memori:** ${databaseOptimizer.formatBytes(metrics.server.memory?.resident * 1024 * 1024 || 0)}`
                ].join('\n'),
                inline: true
            });
        }

        if (metrics.database) {
            embed.addFields({
                name: '💾 Statistik Database',
                value: [
                    `**Koleksi:** ${metrics.database.collections}`,
                    `**Dokumen:** ${metrics.database.objects?.toLocaleString() || 'N/A'}`,
                    `**Ukuran Data:** ${databaseOptimizer.formatBytes(metrics.database.dataSize || 0)}`,
                    `**Ukuran Index:** ${databaseOptimizer.formatBytes(metrics.database.indexSize || 0)}`
                ].join('\n'),
                inline: true
            });
        }

        if (metrics.connection) {
            const connectionStates = {
                0: 'Terputus',
                1: 'Terhubung',
                2: 'Menghubungkan',
                3: 'Memutuskan'
            };

            embed.addFields({
                name: '🔗 Info Koneksi',
                value: [
                    `**Status:** ${connectionStates[metrics.connection.readyState] || 'Tidak Diketahui'}`,
                    `**Host:** ${metrics.connection.host || 'N/A'}`,
                    `**Port:** ${metrics.connection.port || 'N/A'}`,
                    `**Database:** ${metrics.connection.name || 'N/A'}`
                ].join('\n'),
                inline: true
            });
        }

        if (metrics.optimization?.lastOptimization) {
            const lastOpt = metrics.optimization.lastOptimization;
            embed.addFields({
                name: '🔧 Optimasi Terakhir',
                value: [
                    `**Waktu:** <t:${Math.floor(lastOpt.timestamp.getTime() / 1000)}:R>`,
                    `**Durasi:** ${lastOpt.executionTime}ms`,
                    `**Index Dibuat:** ${lastOpt.results.indexesCreated}`,
                    `**Record Dihapus:** ${lastOpt.results.recordsRemoved || 0}`
                ].join('\n'),
                inline: false
            });
        }

        await loadingMsg.edit({ content: null, embeds: [embed] });
    },

    async showHelp(message) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Bantuan Command Database')
            .setColor(config.colors?.primary || '#5865F2')
            .setDescription('Alat manajemen dan optimasi database')
            .addFields(
                {
                    name: '📋 Subcommand Tersedia',
                    value: [
                        '`database stats` - Tampilkan statistik database',
                        '`database optimize` - Jalankan optimasi database',
                        '`database cleanup` - Tampilkan opsi pembersihan',
                        '`database recommendations` - Dapatkan rekomendasi optimasi',
                        '`database metrics` - Tampilkan metrik performa detail'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '💡 Contoh',
                    value: [
                        '`database` - Tampilkan stats (default)',
                        '`database optimize` - Optimasi performa database',
                        '`database recommendations` - Dapatkan saran perbaikan'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Catatan Penting',
                    value: [
                        '• Optimasi mungkin memakan waktu beberapa menit',
                        '• Selalu backup sebelum operasi besar',
                        '• Monitor performa setelah perubahan',
                        '• Jalankan optimasi saat penggunaan rendah'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: `Diminta oleh ${message.author.username}` });

        await message.channel.send({ embeds: [embed] });
    }
};
