const express = require('express');
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const BotAccount = require('../models/BotAccount');
const { JWT_SECRET } = require('./auth');
const router = express.Router();

function authenticateToken(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token kerak' });
    }

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
    roblox: ['followers', 'friends', 'likes', 'plays'],
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
    res.json({
        success: true,
        platforms: PLATFORM_SERVICES
    });
});

router.post('/create', authenticateToken, async (req, res) => {
    try {
        const { platform, service, target, quantity } = req.body;

        if (!platform || !service || !target || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Barcha maydonlar toldirilishi shart'
            });
        }

        if (!PLATFORM_SERVICES[platform]) {
            return res.status(400).json({
                success: false,
                message: 'Notogri platforma'
            });
        }

        if (!PLATFORM_SERVICES[platform].includes(service)) {
            return res.status(400).json({
                success: false,
                message: 'Bu platforma uchun bunday xizmat mavjud emas'
            });
        }

        if (quantity < 1 || quantity > 1000000) {
            return res.status(400).json({
                success: false,
                message: 'Miqdor 1 dan 1000000 gacha bolishi kerak'
            });
        }

        const order = new Order({
            userId: req.userId,
            platform: platform,
            service: service,
            target: target,
            quantity: quantity
        });
        await order.save();

        res.status(201).json({
            success: true,
            message: 'Buyurtma yaratildi',
            order: {
                id: order._id,
                platform: order.platform,
                service: order.service,
                target: order.target,
                quantity: order.quantity,
                status: order.status,
                createdAt: order.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

router.get('/my-orders', authenticateToken, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Order.countDocuments({ userId: req.userId });

        res.json({
            success: true,
            orders: orders,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

router.get('/status/:orderId', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi'
            });
        }

        res.json({
            success: true,
            order: {
                id: order._id,
                platform: order.platform,
                service: order.service,
                target: order.target,
                quantity: order.quantity,
                completed: order.completed,
                status: order.status,
                progress: Math.round((order.completed / order.quantity) * 100),
                createdAt: order.createdAt,
                startedAt: order.startedAt,
                completedAt: order.completedAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
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
            stats: {
                totalOrders: totalOrders,
                pendingOrders: pendingOrders,
                processingOrders: processingOrders,
                completedOrders: completedOrders,
                failedOrders: failedOrders,
                activeBotAccounts: botAccounts
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

router.delete('/cancel/:orderId', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: req.userId
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Buyurtma topilmadi'
            });
        }

        if (order.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Faqat kutilayotgan buyurtmalarni bekor qilish mumkin'
            });
        }

        order.status = 'cancelled';
        await order.save();

        res.json({
            success: true,
            message: 'Buyurtma bekor qilindi'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

module.exports = router;
