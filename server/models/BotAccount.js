const db = require('../utils/db');

class BotAccount {
    static async create(accountData) {
        const newBot = {
            _id: db.generateId(),
            platform: accountData.platform,
            username: accountData.username,
            email: accountData.email || '',
            password: accountData.password || '',
            displayName: accountData.displayName || '',
            firstName: accountData.firstName || '',
            lastName: accountData.lastName || '',
            birthday: accountData.birthday || {},
            userAgent: accountData.userAgent || '',
            cookies: accountData.cookies || '',
            proxyId: accountData.proxyId || null,
            ownerId: accountData.ownerId,
            status: 'active', // active, shadow_banned, banned, verification_required
            createdAt: new Date().toISOString()
        };

        db.data.botAccounts.push(newBot);
        db.save();
        return newBot;
    }

    static async findById(id) {
        return db.data.botAccounts.find(b => b._id === id);
    }

    static async countDocuments(query) {
        let count = 0;
        for (let b of db.data.botAccounts) {
            if (query.ownerId && b.ownerId !== query.ownerId) continue;
            if (query.platform && b.platform !== query.platform) continue;
            if (query.status && b.status !== query.status) continue;
            count++;
        }
        return count;
    }

    static async update(id, updates) {
        const idx = db.data.botAccounts.findIndex(b => b._id === id);
        if (idx !== -1) {
            db.data.botAccounts[idx] = { ...db.data.botAccounts[idx], ...updates };
            db.save();
            return db.data.botAccounts[idx];
        }
        return null;
    }
}

module.exports = BotAccount;
