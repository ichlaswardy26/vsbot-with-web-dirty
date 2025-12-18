const mongoose = require('mongoose');

/**
 * Bank Schema
 * Stores user bank accounts for economy system
 */
const bankSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    balance: {
        type: Number,
        default: 0,
        min: 0
    },
    capacity: {
        type: Number,
        default: 10000 // Default bank capacity
    },
    interestRate: {
        type: Number,
        default: 0.01 // 1% daily interest
    },
    lastInterest: {
        type: Date,
        default: Date.now
    },
    transactions: [{
        type: {
            type: String,
            enum: ['DEPOSIT', 'WITHDRAW', 'INTEREST', 'UPGRADE']
        },
        amount: Number,
        timestamp: { type: Date, default: Date.now },
        note: String
    }],
    upgrades: {
        capacityLevel: { type: Number, default: 0 },
        interestLevel: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Compound index
bankSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Methods
bankSchema.methods.deposit = async function(amount) {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };
    if (this.balance + amount > this.capacity) {
        return { success: false, reason: 'capacity_exceeded', maxDeposit: this.capacity - this.balance };
    }
    
    this.balance += amount;
    this.transactions.push({ type: 'DEPOSIT', amount });
    
    // Keep only last 50 transactions
    if (this.transactions.length > 50) {
        this.transactions = this.transactions.slice(-50);
    }
    
    await this.save();
    return { success: true, newBalance: this.balance };
};

bankSchema.methods.withdraw = async function(amount) {
    if (amount <= 0) return { success: false, reason: 'invalid_amount' };
    if (amount > this.balance) {
        return { success: false, reason: 'insufficient_funds' };
    }
    
    this.balance -= amount;
    this.transactions.push({ type: 'WITHDRAW', amount: -amount });
    
    if (this.transactions.length > 50) {
        this.transactions = this.transactions.slice(-50);
    }
    
    await this.save();
    return { success: true, newBalance: this.balance };
};

bankSchema.methods.collectInterest = async function() {
    const now = new Date();
    const lastInterest = new Date(this.lastInterest);
    const hoursSinceLastInterest = (now - lastInterest) / (1000 * 60 * 60);
    
    // Interest every 24 hours
    if (hoursSinceLastInterest < 24) {
        return { success: false, reason: 'cooldown', hoursRemaining: 24 - hoursSinceLastInterest };
    }
    
    const interest = Math.floor(this.balance * this.interestRate);
    if (interest <= 0) {
        return { success: false, reason: 'no_interest' };
    }
    
    // Check capacity
    const actualInterest = Math.min(interest, this.capacity - this.balance);
    
    this.balance += actualInterest;
    this.lastInterest = now;
    this.transactions.push({ type: 'INTEREST', amount: actualInterest });
    
    if (this.transactions.length > 50) {
        this.transactions = this.transactions.slice(-50);
    }
    
    await this.save();
    return { success: true, interest: actualInterest, newBalance: this.balance };
};

bankSchema.methods.upgradeCapacity = async function() {
    const upgradeCosts = [5000, 15000, 50000, 150000, 500000];
    const capacityBonus = [5000, 15000, 50000, 150000, 500000];
    
    const currentLevel = this.upgrades.capacityLevel;
    if (currentLevel >= upgradeCosts.length) {
        return { success: false, reason: 'max_level' };
    }
    
    const cost = upgradeCosts[currentLevel];
    return { 
        success: true, 
        cost, 
        newCapacity: this.capacity + capacityBonus[currentLevel],
        currentLevel,
        nextLevel: currentLevel + 1
    };
};

// Statics
bankSchema.statics.getOrCreate = async function(userId, guildId) {
    let bank = await this.findOne({ userId, guildId });
    if (!bank) {
        bank = await this.create({ userId, guildId });
    }
    return bank;
};

bankSchema.statics.getTopBanks = async function(guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ balance: -1 })
        .limit(limit)
        .lean();
};

module.exports = mongoose.model('Bank', bankSchema);
