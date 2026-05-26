const db = require('../utils/db');
const bcrypt = require('bcryptjs');

class User {
    static async findOne(query) {
        if (query.username) {
            return db.data.users.find(u => u.username === query.username.toLowerCase());
        }
        if (query._id) {
            return db.data.users.find(u => u._id === query._id);
        }
        return null;
    }

    static async findById(id) {
        return db.data.users.find(u => u._id === id);
    }

    static async create(userData) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const newUser = {
            _id: db.generateId(),
            username: userData.username.toLowerCase(),
            password: hashedPassword,
            balance: 0,
            workerOnline: false,
            lastLogin: null,
            createdAt: new Date().toISOString()
        };

        db.data.users.push(newUser);
        db.save();
        return newUser;
    }

    static async update(id, updates) {
        const idx = db.data.users.findIndex(u => u._id === id);
        if (idx !== -1) {
            db.data.users[idx] = { ...db.data.users[idx], ...updates };
            db.save();
            return db.data.users[idx];
        }
        return null;
    }

    static async comparePassword(user, enteredPassword) {
        return await bcrypt.compare(enteredPassword, user.password);
    }
}

module.exports = User;
