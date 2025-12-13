const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Database Optimizer Utility
 * Provides database optimization, indexing, and maintenance functions
 */

class DatabaseOptimizer {
    constructor() {
        this.optimizationHistory = [];
        this.indexCreationQueue = [];
        this.isOptimizing = false;
    }

    /**
     * Initialize database optimization
     */
    async initialize() {
        try {
            await this.createOptimalIndexes();
            await this.analyzeCollectionStats();
            await logger.log('INFO', 'DATABASE', 'Database optimizer initialized successfully');
        } catch (error) {
            await logger.logError(error, 'database optimizer initialization');
        }
    }

    /**
     * Create optimal indexes for all collections
     */
    async createOptimalIndexes() {
        const indexDefinitions = {
            // Leveling collection indexes
            levelings: [
                { fields: { userId: 1, guildId: 1 }, options: { unique: true, name: 'user_guild_unique' } },
                { fields: { guildId: 1, level: -1 }, options: { name: 'guild_level_desc' } },
                { fields: { guildId: 1, xp: -1 }, options: { name: 'guild_xp_desc' } },
                { fields: { lastMessageXp: 1 }, options: { sparse: true, name: 'last_message_xp' } },
                { fields: { lastVoiceXp: 1 }, options: { sparse: true, name: 'last_voice_xp' } }
            ],

            // Custom Role collection indexes
            customroles: [
                { fields: { guildId: 1, createdBy: 1, roleType: 1 }, options: { name: 'guild_creator_type' } },
                { fields: { guildId: 1, roleType: 1 }, options: { name: 'guild_type' } },
                { fields: { roleId: 1 }, options: { unique: true, name: 'role_id_unique' } },
                { fields: { createdAt: -1 }, options: { name: 'created_desc' } },
                { fields: { members: 1 }, options: { name: 'members_array' } }
            ],

            // User Balance collection indexes
            userbalances: [
                { fields: { userId: 1, guildId: 1 }, options: { unique: true, name: 'user_guild_balance' } },
                { fields: { guildId: 1, balance: -1 }, options: { name: 'guild_balance_desc' } },
                { fields: { lastDaily: 1 }, options: { sparse: true, name: 'last_daily' } },
                { fields: { lastCollect: 1 }, options: { sparse: true, name: 'last_collect' } }
            ],

            // Activity collection indexes
            activities: [
                { fields: { userId: 1, guildId: 1 }, options: { unique: true, name: 'user_guild_activity' } },
                { fields: { guildId: 1, characters: -1 }, options: { name: 'guild_characters_desc' } },
                { fields: { lastMessageAt: -1 }, options: { name: 'last_message_desc' } }
            ],

            // Voice Activity collection indexes
            voiceactivities: [
                { fields: { userId: 1, guildId: 1 }, options: { unique: true, name: 'user_guild_voice' } },
                { fields: { guildId: 1, totalDuration: -1 }, options: { name: 'guild_duration_desc' } },
                { fields: { lastJoined: -1 }, options: { sparse: true, name: 'last_joined_desc' } }
            ],

            // Warn collection indexes
            warns: [
                { fields: { guildId: 1, userId: 1 }, options: { name: 'guild_user_warns' } },
                { fields: { guildId: 1, timestamp: -1 }, options: { name: 'guild_timestamp_desc' } },
                { fields: { moderatorId: 1, timestamp: -1 }, options: { name: 'moderator_timestamp' } }
            ],

            // Giveaway collection indexes
            giveaways: [
                { fields: { guildId: 1, ended: 1 }, options: { name: 'guild_ended' } },
                { fields: { endAt: 1, ended: 1 }, options: { name: 'end_time_status' } },
                { fields: { messageId: 1 }, options: { unique: true, name: 'message_id_unique' } },
                { fields: { hostId: 1, createdAt: -1 }, options: { name: 'host_created_desc' } }
            ],

            // Shop Role collection indexes
            shoproles: [
                { fields: { guildId: 1, name: 1 }, options: { unique: true, name: 'guild_name_unique' } },
                { fields: { guildId: 1, price: 1 }, options: { name: 'guild_price' } },
                { fields: { roleId: 1 }, options: { name: 'role_id' } }
            ],

            // Ticket collection indexes
            tickets: [
                { fields: { guildId: 1, userId: 1 }, options: { name: 'guild_user_tickets' } },
                { fields: { channelId: 1 }, options: { unique: true, sparse: true, name: 'channel_id_unique' } },
                { fields: { createdAt: -1 }, options: { name: 'created_desc' } },
                { fields: { status: 1, createdAt: -1 }, options: { name: 'status_created' } }
            ]
        };

        for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
            await this.createCollectionIndexes(collectionName, indexes);
        }
    }

    /**
     * Create indexes for a specific collection
     * @param {string} collectionName - Collection name
     * @param {Array} indexes - Array of index definitions
     */
    async createCollectionIndexes(collectionName, indexes) {
        try {
            const db = mongoose.connection.db;
            const collection = db.collection(collectionName);

            for (const indexDef of indexes) {
                try {
                    const startTime = Date.now();
                    await collection.createIndex(indexDef.fields, indexDef.options);
                    const executionTime = Date.now() - startTime;

                    await logger.logDatabaseOperation(
                        'createIndex',
                        collectionName,
                        true,
                        executionTime,
                        { indexName: indexDef.options.name, fields: indexDef.fields }
                    );
                } catch (error) {
                    // Index might already exist, which is fine
                    if (error.code !== 85) { // Index already exists error code
                        await logger.logError(error, `creating index ${indexDef.options.name} on ${collectionName}`);
                    }
                }
            }
        } catch (error) {
            await logger.logError(error, `creating indexes for collection ${collectionName}`);
        }
    }

    /**
     * Analyze collection statistics
     */
    async analyzeCollectionStats() {
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            
            const stats = {};
            
            for (const collection of collections) {
                const collectionName = collection.name;
                try {
                    const collStats = await db.collection(collectionName).stats();
                    const indexes = await db.collection(collectionName).indexes();
                    
                    stats[collectionName] = {
                        documentCount: collStats.count || 0,
                        avgDocumentSize: collStats.avgObjSize || 0,
                        totalSize: collStats.size || 0,
                        storageSize: collStats.storageSize || 0,
                        indexCount: indexes.length,
                        indexes: indexes.map(idx => ({
                            name: idx.name,
                            keys: idx.key,
                            unique: idx.unique || false,
                            sparse: idx.sparse || false
                        }))
                    };
                } catch (error) {
                    // Some collections might not support stats
                    stats[collectionName] = { error: error.message };
                }
            }

            await logger.log('INFO', 'DATABASE', 'Collection statistics analyzed', { stats });
            return stats;
        } catch (error) {
            await logger.logError(error, 'analyzing collection statistics');
            return {};
        }
    }

    /**
     * Optimize database performance
     */
    async optimizeDatabase() {
        if (this.isOptimizing) {
            return { success: false, message: 'Optimization already in progress' };
        }

        this.isOptimizing = true;
        const startTime = Date.now();

        try {
            const results = {
                indexesCreated: 0,
                collectionsAnalyzed: 0,
                optimizationsApplied: 0,
                errors: []
            };

            // Create missing indexes
            await this.createOptimalIndexes();
            results.indexesCreated = this.indexCreationQueue.length;

            // Analyze collection performance
            const stats = await this.analyzeCollectionStats();
            results.collectionsAnalyzed = Object.keys(stats).length;

            // Apply performance optimizations
            const optimizations = await this.applyPerformanceOptimizations(stats);
            results.optimizationsApplied = optimizations.length;

            // Clean up old data
            const cleanupResults = await this.cleanupOldData();
            results.recordsRemoved = cleanupResults.recordsRemoved;

            const executionTime = Date.now() - startTime;
            
            this.optimizationHistory.push({
                timestamp: new Date(),
                executionTime,
                results
            });

            await logger.log('INFO', 'DATABASE', 
                `Database optimization completed in ${executionTime}ms`, 
                results
            );

            return { success: true, results, executionTime };
        } catch (error) {
            await logger.logError(error, 'database optimization');
            return { success: false, error: error.message };
        } finally {
            this.isOptimizing = false;
        }
    }

    /**
     * Apply performance optimizations based on collection stats
     * @param {Object} stats - Collection statistics
     * @returns {Array} Applied optimizations
     */
    async applyPerformanceOptimizations(stats) {
        const optimizations = [];

        for (const [collectionName, collStats] of Object.entries(stats)) {
            if (collStats.error) continue;

            // Check for collections that might benefit from compound indexes
            if (collStats.documentCount > 1000 && collStats.indexCount < 3) {
                optimizations.push({
                    type: 'missing_indexes',
                    collection: collectionName,
                    recommendation: 'Consider adding compound indexes for frequent queries'
                });
            }

            // Check for large collections that might need partitioning
            if (collStats.documentCount > 100000) {
                optimizations.push({
                    type: 'large_collection',
                    collection: collectionName,
                    recommendation: 'Consider implementing data archiving or partitioning'
                });
            }

            // Check for collections with large average document size
            if (collStats.avgDocumentSize > 10000) { // 10KB
                optimizations.push({
                    type: 'large_documents',
                    collection: collectionName,
                    recommendation: 'Consider normalizing large documents or using GridFS'
                });
            }
        }

        return optimizations;
    }

    /**
     * Clean up old data to improve performance
     */
    async cleanupOldData() {
        const results = { recordsRemoved: 0, errors: [] };
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

        try {
            // Clean old warns (older than 90 days)
            const Warn = mongoose.model('Warn');
            const oldWarns = await Warn.deleteMany({ timestamp: { $lt: ninetyDaysAgo } });
            results.recordsRemoved += oldWarns.deletedCount || 0;

            // Clean old giveaways (ended and older than 30 days)
            const Giveaway = mongoose.model('Giveaway');
            const oldGiveaways = await Giveaway.deleteMany({ 
                ended: true, 
                endAt: { $lt: thirtyDaysAgo } 
            });
            results.recordsRemoved += oldGiveaways.deletedCount || 0;

            // Clean old activity data (older than 90 days with no recent activity)
            const Activity = mongoose.model('Activity');
            const oldActivity = await Activity.deleteMany({ 
                lastMessageAt: { $lt: ninetyDaysAgo } 
            });
            results.recordsRemoved += oldActivity.deletedCount || 0;

            await logger.log('INFO', 'DATABASE', 
                `Cleanup completed: ${results.recordsRemoved} records removed`
            );
        } catch (error) {
            results.errors.push(error.message);
            await logger.logError(error, 'database cleanup');
        }

        return results;
    }

    /**
     * Get database performance metrics
     */
    async getPerformanceMetrics() {
        try {
            const db = mongoose.connection.db;
            const admin = db.admin();
            
            // Get server status
            const serverStatus = await admin.serverStatus();
            
            // Get database stats
            const dbStats = await db.stats();
            
            // Get connection info
            const connectionStats = {
                readyState: mongoose.connection.readyState,
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                name: mongoose.connection.name
            };

            return {
                server: {
                    version: serverStatus.version,
                    uptime: serverStatus.uptime,
                    connections: serverStatus.connections,
                    memory: serverStatus.mem,
                    opcounters: serverStatus.opcounters
                },
                database: {
                    collections: dbStats.collections,
                    objects: dbStats.objects,
                    avgObjSize: dbStats.avgObjSize,
                    dataSize: dbStats.dataSize,
                    storageSize: dbStats.storageSize,
                    indexes: dbStats.indexes,
                    indexSize: dbStats.indexSize
                },
                connection: connectionStats,
                optimization: {
                    lastOptimization: this.optimizationHistory[this.optimizationHistory.length - 1],
                    totalOptimizations: this.optimizationHistory.length,
                    isOptimizing: this.isOptimizing
                }
            };
        } catch (error) {
            await logger.logError(error, 'getting database performance metrics');
            return { error: error.message };
        }
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get optimization recommendations
     */
    async getOptimizationRecommendations() {
        const stats = await this.analyzeCollectionStats();
        const recommendations = [];

        for (const [collectionName, collStats] of Object.entries(stats)) {
            if (collStats.error) continue;

            // Performance recommendations based on collection stats
            if (collStats.documentCount > 10000 && collStats.indexCount < 2) {
                recommendations.push({
                    priority: 'high',
                    type: 'indexing',
                    collection: collectionName,
                    message: `Collection ${collectionName} has ${collStats.documentCount} documents but only ${collStats.indexCount} indexes. Consider adding compound indexes.`
                });
            }

            if (collStats.avgDocumentSize > 16000) { // 16KB
                recommendations.push({
                    priority: 'medium',
                    type: 'document_size',
                    collection: collectionName,
                    message: `Collection ${collectionName} has large average document size (${this.formatBytes(collStats.avgDocumentSize)}). Consider document normalization.`
                });
            }

            if (collStats.storageSize > collStats.totalSize * 2) {
                recommendations.push({
                    priority: 'low',
                    type: 'storage_fragmentation',
                    collection: collectionName,
                    message: `Collection ${collectionName} may have storage fragmentation. Consider running compact operation.`
                });
            }
        }

        return recommendations;
    }
}

// Export singleton instance
module.exports = new DatabaseOptimizer();