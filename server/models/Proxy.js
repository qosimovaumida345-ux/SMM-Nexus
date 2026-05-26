const mongoose = require('mongoose');

const proxySchema = new mongoose.Schema({
    host: {
        type: String,
        required: true
    },
    port: {
        type: Number,
        required: true
    },
    username: {
        type: String,
        default: ''
    },
    password: {
        type: String,
        default: ''
    },
    protocol: {
        type: String,
        default: 'http',
        enum: ['http', 'https', 'socks4', 'socks5']
    },
    country: {
        type: String,
        default: 'US'
    },
    isAlive: {
        type: Boolean,
        default: true
    },
    lastChecked: {
        type: Date,
        default: Date.now
    },
    responseTime: {
        type: Number,
        default: 0
    },
    assignedAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotAccount',
        default: null
    },
    failCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

proxySchema.methods.getConnectionString = function () {
    if (this.username && this.password) {
        return this.protocol + '://' + this.username + ':' + this.password + '@' + this.host + ':' + this.port;
    }
    return this.protocol + '://' + this.host + ':' + this.port;
};

proxySchema.methods.markDead = function () {
    this.isAlive = false;
    this.failCount += 1;
    return this.save();
};

proxySchema.methods.markAlive = function (responseTime) {
    this.isAlive = true;
    this.lastChecked = new Date();
    this.responseTime = responseTime;
    this.failCount = 0;
    return this.save();
};

proxySchema.statics.getAvailableProxy = async function () {
    const proxy = await this.findOne({
        isAlive: true,
        assignedAccountId: null
    }).sort({ responseTime: 1 });
    return proxy;
};

proxySchema.statics.getRandomAliveProxy = async function () {
    const proxies = await this.find({ isAlive: true });
    if (proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
};

module.exports = mongoose.model('Proxy', proxySchema);
