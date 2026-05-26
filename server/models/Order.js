const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    platform: {
        type: String,
        required: true,
        enum: [
            'instagram', 'tiktok', 'youtube', 'telegram', 'roblox',
            'twitter', 'facebook', 'discord', 'twitch', 'spotify',
            'snapchat', 'pinterest', 'linkedin', 'reddit', 'threads'
        ]
    },
    service: {
        type: String,
        required: true,
        enum: [
            'followers', 'likes', 'views', 'comments', 'shares',
            'subscribers', 'members', 'reactions', 'reposts',
            'saves', 'impressions', 'plays', 'friends',
            'connections', 'upvotes', 'listeners'
        ]
    },
    target: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    completed: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: 'pending',
        enum: ['pending', 'queued', 'processing', 'completed', 'failed', 'cancelled', 'partial']
    },
    priority: {
        type: Number,
        default: 0
    },
    errorLog: {
        type: String,
        default: ''
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

orderSchema.methods.markProcessing = function () {
    this.status = 'processing';
    this.startedAt = new Date();
    return this.save();
};

orderSchema.methods.markCompleted = function () {
    this.status = 'completed';
    this.completed = this.quantity;
    this.completedAt = new Date();
    return this.save();
};

orderSchema.methods.markFailed = function (errorMessage) {
    this.status = 'failed';
    this.errorLog = errorMessage;
    return this.save();
};

orderSchema.methods.incrementProgress = function (amount) {
    this.completed = Math.min(this.completed + amount, this.quantity);
    if (this.completed >= this.quantity) {
        this.status = 'completed';
        this.completedAt = new Date();
    }
    return this.save();
};

module.exports = mongoose.model('Order', orderSchema);
