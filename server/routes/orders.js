const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const BotAccount = require('../models/BotAccount');
const { JWT_SECRET } = require('./auth');
const router = express.Router();

function authenticateToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ success: false, message: 'Token kerak' });

    try {
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, JWT_SECRET);
        req.userId = decoded.userId;
        req.username = decoded.username;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token yaroqsiz' });
    }
}

const PLATFORM_SERVICES = {
    instagram: ['followers', 'likes', 'views', 'comments', 'shares', 'saves', 'impressions', 'reposts'],
    tiktok: ['followers', 'likes', 'views', 'comments', 'shares', 'saves', 'reposts'],
    youtube: ['subscribers', 'likes', 'views', 'comments', 'shares'],
    telegram: ['members', 'views', 'reactions', 'comments', 'shares'],
    roblox: ['followers', 'friends', 'likes', 'plays', 'favorites', 'group_joins', 'reports'],
    twitter: ['followers', 'likes', 'views', 'comments', 'reposts', 'impressions'],
    facebook: ['followers', 'likes', 'views', 'comments', 'shares', 'reactions'],
    discord: ['members'],
    twitch: ['followers', 'views'],
    spotify: ['followers', 'listeners', 'plays'],
    snapchat: ['followers', 'views'],
    pinterest: ['followers', 'saves', 'views', 'comments'],
    linkedin: ['followers', 'connections', 'likes', 'comments'],
    reddit: ['followers', 'upvotes', 'comments'],
    threads: ['followers', 'likes', 'views', 'reposts']
};

router.get('/platforms', authenticateToken, (req, res) => {
    res.json({ success: true, platforms: PLATFORM_SERVICES });
});

router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { platform, service, target, quantity } = req.body;

        if (!platform || !service || !target || !quantity) {
            return res.status(400).json({ success: false, message: 'Barcha maydonlar toldirilishi shart' });
        }
        if (!PLATFORM_SERVICES[platform]) {
            return res.status(400).json({ success: false, message: 'Notogri platforma' });
        }
        if (!PLATFORM_SERVICES[platform].includes(service)) {
            return res.status(400).json({ success: false, message: 'Bu platforma uchun bunday xizmat yoq' });
        }
        if (quantity < 1 || quantity > 1000000) {
            return res.status(400).json({ success: false, message: 'Miqdor kamida 1 bolishi kerak' });
        }

        const order = await Order.create({
            userId: req.userId,
            platform,
            service,
            target,
            quantity
        });

        res.status(201).json({
            success: true,
            message: 'Buyurtma yaratildi',
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const allUserOrders = await Order.find({ userId: req.userId });
        
        // Sorting manually: newest first
        allUserOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const paginatedOrders = allUserOrders.slice(skip, skip + limit);
        const total = allUserOrders.length;

        // Xuddi eski mantiq kabi
        const formatted = paginatedOrders.map(o => ({
            ...o,
            completedCount: o.completed
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const allUserOrders = await Order.find({ userId: req.userId });
        allUserOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const paginatedOrders = allUserOrders.slice(skip, skip + limit);
        const total = allUserOrders.length;

        res.json({
            success: true,
            orders: paginatedOrders,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.get('/status/:orderId', authenticateToken, async (req, res) => {
    try {
        const allUserOrders = await Order.find({ userId: req.userId });
        const order = allUserOrders.find(o => o._id === req.params.orderId);

        if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });

        res.json({
            success: true,
            order: {
                ...order,
                progress: Math.round((order.completed / order.quantity) * 100)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments({ userId: req.userId });
        const pendingOrders = await Order.countDocuments({ userId: req.userId, status: 'pending' });
        const processingOrders = await Order.countDocuments({ userId: req.userId, status: 'processing' });
        const completedOrders = await Order.countDocuments({ userId: req.userId, status: 'completed' });
        const failedOrders = await Order.countDocuments({ userId: req.userId, status: 'failed' });
        const botAccounts = await BotAccount.countDocuments({ ownerId: req.userId, status: 'active' });

        res.json({
            success: true,
            stats: { totalOrders, pendingOrders, processingOrders, completedOrders, failedOrders, activeBotAccounts: botAccounts },
            total: totalOrders,
            processing: processingOrders,
            completed: completedOrders
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

router.delete('/cancel/:orderId', authenticateToken, async (req, res) => {
    try {
        const allUserOrders = await Order.find({ userId: req.userId });
        const order = allUserOrders.find(o => o._id === req.params.orderId);

        if (!order) return res.status(404).json({ success: false, message: 'Buyurtma topilmadi' });
        if (order.status !== 'pending') return res.status(400).json({ success: false, message: 'Faqat kutilayotganlarni bekor qilish mumkin' });

        await Order.update(order._id, { status: 'cancelled' });
        res.json({ success: true, message: 'Buyurtma bekor qilindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
    }
});

module.exports = router;
