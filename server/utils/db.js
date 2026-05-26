const fs = require('fs');
const path = require('path');

class LocalDB {
    constructor() {
        this.filePath = path.join(process.cwd(), 'database.json');
        this.data = {
            users: [],
            orders: [],
            botAccounts: [],
            proxies: []
        };
        this.load();
    }

    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const fileData = fs.readFileSync(this.filePath, 'utf8');
                this.data = JSON.parse(fileData);
            } catch (e) {
                console.error('[DB] Faylni o\'qishda xato:', e.message);
                this.save();
            }
        } else {
            this.save();
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('[DB] Faylga yozishda xato:', e.message);
        }
    }

    generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

const db = new LocalDB();
module.exports = db;
