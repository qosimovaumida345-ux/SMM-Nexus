const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_smm_ultra_secret_key_2024';
const TOKEN_EXPIRY = '30d';

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username va password kiritilishi shart' });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ success: false, message: 'Username 3 dan 30 gacha belgi bolishi kerak' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password kamida 6 ta belgi bolishi kerak' });
        }

        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Bu username allaqachon band' });
        }

        const user = await User.create({
            username: username.toLowerCase(),
            password: password
        });

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.status(201).json({
            success: true,
            message: 'Muvaffaqiyatli royxatdan otildi',
            token: token,
            user: { id: user._id, username: user.username, balance: user.balance }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username va password kiritilishi shart' });
        }

        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Username yoki password notogri' });
        }

        const isMatch = await User.comparePassword(user, password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username yoki password notogri' });
        }

        await User.update(user._id, { lastLogin: new Date().toISOString() });

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: TOKEN_EXPIRY }
        );

        res.json({
            success: true,
            message: 'Muvaffaqiyatli kirildi',
            token: token,
            user: { id: user._id, username: user.username, balance: user.balance, workerOnline: user.workerOnline }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ success: false, message: 'Token topilmadi' });

        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

        res.json({
            success: true,
            user: { id: user._id, username: user.username, balance: user.balance, workerOnline: user.workerOnline, createdAt: user.createdAt }
        });
    } catch (error) {
        res.status(401).json({ success: false, message: 'Token yaroqsiz' });
    }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
