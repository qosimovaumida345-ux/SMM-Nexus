const db = require('../utils/db');

class Order {
    static async create(orderData) {
        const newOrder = {
            _id: db.generateId(),
            userId: orderData.userId,
            platform: orderData.platform,
            service: orderData.service,
            target: orderData.target,
            quantity: orderData.quantity,
            completed: 0,
            status: 'pending', // pending, processing, completed, failed, cancelled
            error: null,
            startedAt: null,
            completedAt: null,
            createdAt: new Date().toISOString()
        };

        db.data.orders.push(newOrder);
        db.save();
        return newOrder;
    }

    static async findById(id) {
        return db.data.orders.find(o => o._id === id);
    }

    static async find(query) {
        let results = db.data.orders;
        
        if (query.userId) {
            results = results.filter(o => o.userId === query.userId);
        }
        if (query.status) {
            results = results.filter(o => o.status === query.status);
        }
        
        return results;
    }

    static async update(id, updates) {
        const idx = db.data.orders.findIndex(o => o._id === id);
        if (idx !== -1) {
            db.data.orders[idx] = { ...db.data.orders[idx], ...updates };
            db.save();
            return db.data.orders[idx];
        }
        return null;
    }

    static async countDocuments(query) {
        let results = await this.find(query);
        return results.length;
    }
}

module.exports = Order;
