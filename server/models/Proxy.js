const db = require('../utils/db');

class Proxy {
    static async countDocuments(query = {}) {
        let count = 0;
        for (let p of db.data.proxies) {
            if (query.isAlive !== undefined && p.isAlive !== query.isAlive) continue;
            count++;
        }
        return count;
    }
}

module.exports = Proxy;
