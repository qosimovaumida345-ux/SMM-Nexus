const mongoose = require('mongoose');

const botAccountSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        enum: [
            'instagram', 'tiktok', 'youtube', 'telegram', 'roblox',
            'twitter', 'facebook', 'discord', 'twitch', 'spotify',
            'snapchat', 'pinterest', 'linkedin', 'reddit', 'threads',
            'google'
        ]
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    displayName: {
        type: String
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    birthday: {
        year: Number,
        month: Number,
        day: Number
    },
    proxyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proxy'
    },
    cookies: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String
    },
    status: {
        type: String,
        default: 'active',
        enum: ['active', 'banned', 'suspended', 'cooldown', 'unverified', 'dead']
    },
    actionsToday: {
        type: Number,
        default: 0
    },
    maxActionsPerDay: {
        type: Number,
        default: 50
    },
    lastActionAt: {
        type: Date
    },
    lastResetAt: {
        type: Date,
        default: Date.now
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

botAccountSchema.methods.canPerformAction = function () {
    const now = new Date();
    const lastReset = new Date(this.lastResetAt);
    const hoursSinceReset = (now - lastReset) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24) {
        this.actionsToday = 0;
        this.lastResetAt = now;
    }

    return this.status === 'active' && this.actionsToday < this.maxActionsPerDay;
};

botAccountSchema.methods.recordAction = function () {
    this.actionsToday += 1;
    this.lastActionAt = new Date();
    return this.save();
};

botAccountSchema.methods.markBanned = function () {
    this.status = 'banned';
    return this.save();
};

botAccountSchema.methods.setCooldown = function () {
    this.status = 'cooldown';
    return this.save();
};

module.exports = mongoose.model('BotAccount', botAccountSchema);
