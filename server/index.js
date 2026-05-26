require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const { JWT_SECRET } = require('./routes/auth');
const Order = require('./models/Order');
const User = require('./models/User');
const BotAccount = require('./models/BotAccount');
const Proxy = require('./models/Proxy');

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smm_nexus';
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('[DATABASE] MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('[DATABASE] MongoDB connection failed:', err.message);
    });

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'online',
        workers: activeWorkers.size,
        uptime: process.uptime()
    });
});

app.get('/api/accounts/count', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ success: false });
        }

        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, JWT_SECRET);

        const platforms = [
            'instagram', 'tiktok', 'youtube', 'telegram', 'roblox',
            'twitter', 'facebook', 'discord', 'twitch', 'spotify',
            'snapchat', 'pinterest', 'linkedin', 'reddit', 'threads'
        ];

        const counts = {};
        for (let platform of platforms) {
            counts[platform] = await BotAccount.countDocuments({
                ownerId: decoded.userId,
                platform: platform,
                status: 'active'
            });
        }

        res.json({ success: true, accounts: counts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/proxies/count', async (req, res) => {
    try {
        const alive = await Proxy.countDocuments({ isAlive: true });
        const total = await Proxy.countDocuments();
        res.json({ success: true, alive: alive, total: total });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const activeWorkers = new Map();

io.on('connection', (socket) => {
    console.log('[SOCKET] New connection:', socket.id);

    socket.on('worker-auth', async (data) => {
        try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) {
                socket.emit('auth-failed', { message: 'Foydalanuvchi topilmadi' });
                socket.disconnect();
                return;
            }

            activeWorkers.set(decoded.userId, {
                socketId: socket.id,
                username: decoded.username,
                connectedAt: new Date()
            });

            user.workerOnline = true;
            await user.save();

            socket.userId = decoded.userId;
            socket.emit('auth-success', {
                message: 'Worker muvaffaqiyatli ulandi',
                userId: decoded.userId
            });

            console.log('[WORKER] Authenticated:', decoded.username);

            const pendingOrders = await Order.find({
                userId: decoded.userId,
                status: 'pending'
            }).sort({ priority: -1, createdAt: 1 });

            if (pendingOrders.length > 0) {
                socket.emit('pending-tasks', pendingOrders);
            }
        } catch (error) {
            socket.emit('auth-failed', { message: 'Token yaroqsiz' });
            socket.disconnect();
        }
    });

    socket.on('task-progress', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                await order.incrementProgress(data.amount || 1);
                io.emit('order-updated-' + order.userId, {
                    orderId: order._id,
                    completed: order.completed,
                    quantity: order.quantity,
                    status: order.status
                });
            }
        } catch (error) {
            console.error('[SOCKET] Progress update failed:', error.message);
        }
    });

    socket.on('task-completed', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                await order.markCompleted();
                io.emit('order-updated-' + order.userId, {
                    orderId: order._id,
                    completed: order.quantity,
                    quantity: order.quantity,
                    status: 'completed'
                });
            }
        } catch (error) {
            console.error('[SOCKET] Task complete failed:', error.message);
        }
    });

    socket.on('task-failed', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                await order.markFailed(data.error || 'Nomalum xato');
            }
        } catch (error) {
            console.error('[SOCKET] Task fail report failed:', error.message);
        }
    });

    socket.on('account-created', async (data) => {
        try {
            const account = new BotAccount({
                platform: data.platform,
                username: data.username,
                email: data.email,
                password: data.password,
                displayName: data.displayName || '',
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                birthday: data.birthday || {},
                userAgent: data.userAgent || '',
                cookies: data.cookies || '',
                proxyId: data.proxyId || null,
                ownerId: socket.userId
            });
            await account.save();

            socket.emit('account-saved', {
                id: account._id,
                platform: account.platform,
                username: account.username
            });
        } catch (error) {
            console.error('[SOCKET] Account save failed:', error.message);
        }
    });

    socket.on('account-banned', async (data) => {
        try {
            const account = await BotAccount.findById(data.accountId);
            if (account) {
                await account.markBanned();
            }
        } catch (error) {
            console.error('[SOCKET] Account ban report failed:', error.message);
        }
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            activeWorkers.delete(socket.userId);
            try {
                const user = await User.findById(socket.userId);
                if (user) {
                    user.workerOnline = false;
                    await user.save();
                }
            } catch (error) {
                console.error('[SOCKET] Disconnect cleanup failed:', error.message);
            }
            console.log('[WORKER] Disconnected:', socket.userId);
        }
    });
});

setInterval(async () => {
    try {
        const pendingOrders = await Order.find({ status: 'pending' })
            .sort({ priority: -1, createdAt: 1 })
            .populate('userId');

        for (let order of pendingOrders) {
            const worker = activeWorkers.get(order.userId.toString());
            if (worker) {
                const workerSocket = io.sockets.sockets.get(worker.socketId);
                if (workerSocket) {
                    await order.markProcessing();
                    workerSocket.emit('new-task', {
                        orderId: order._id,
                        platform: order.platform,
                        service: order.service,
                        target: order.target,
                        quantity: order.quantity
                    });
                }
            }
        }
    } catch (error) {
        console.error('[SCHEDULER] Order dispatch failed:', error.message);
    }
}, 10000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('[SERVER] Running on port ' + PORT);
    console.log('[SERVER] Waiting for workers...');
});
