require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000
});

console.log('[DATABASE] Local JSON DB faollashdi!');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'online', workers: activeWorkers.size, uptime: process.uptime() });
});

app.get('/api/accounts/count', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ success: false });

        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, JWT_SECRET);

        const platforms = ['instagram', 'tiktok', 'youtube', 'telegram', 'roblox', 'twitter', 'discord'];
        const counts = {};
        for (let platform of platforms) {
            counts[platform] = await BotAccount.countDocuments({ ownerId: decoded.userId, platform, status: 'active' });
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
        res.json({ success: true, alive, total });
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

            activeWorkers.set(decoded.userId, { socketId: socket.id, username: decoded.username, connectedAt: new Date() });
            await User.update(decoded.userId, { workerOnline: true });

            socket.userId = decoded.userId;
            socket.emit('auth-success', { message: 'Worker ulandi', userId: decoded.userId });

            const pendingOrders = await Order.find({ userId: decoded.userId, status: 'pending' });
            if (pendingOrders.length > 0) socket.emit('pending-tasks', pendingOrders);

        } catch (error) {
            socket.emit('auth-failed', { message: 'Token yaroqsiz' });
            socket.disconnect();
        }
    });

    socket.on('task-progress', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                const newCompleted = (order.completed || 0) + (data.amount || 1);
                await Order.update(order._id, { completed: newCompleted });
                
                io.emit('order-updated-' + order.userId, {
                    orderId: order._id,
                    completed: newCompleted,
                    quantity: order.quantity,
                    status: order.status
                });
            }
        } catch (error) {}
    });

    socket.on('task-completed', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                await Order.update(order._id, { status: 'completed', completed: order.quantity, completedAt: new Date().toISOString() });
                
                io.emit('order-updated-' + order.userId, {
                    orderId: order._id,
                    completed: order.quantity,
                    quantity: order.quantity,
                    status: 'completed'
                });
            }
        } catch (error) {}
    });

    socket.on('task-failed', async (data) => {
        try {
            const order = await Order.findById(data.orderId);
            if (order) {
                await Order.update(order._id, { status: 'failed', error: data.error || 'Nomalum xato' });
            }
        } catch (error) {}
    });

    socket.on('account-created', async (data) => {
        try {
            const account = await BotAccount.create({ ...data, ownerId: socket.userId });
            socket.emit('account-saved', { id: account._id, platform: account.platform, username: account.username });
        } catch (error) {}
    });

    socket.on('account-banned', async (data) => {
        try {
            await BotAccount.update(data.accountId, { status: 'banned' });
        } catch (error) {}
    });

    socket.on('disconnect', async () => {
        if (socket.userId) {
            activeWorkers.delete(socket.userId);
            try {
                await User.update(socket.userId, { workerOnline: false });
            } catch (error) {}
        }
    });
});

setInterval(async () => {
    try {
        let allOrders = await Order.find({ status: 'pending' });
        allOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        for (let order of allOrders) {
            const worker = activeWorkers.get(order.userId);
            if (worker) {
                const workerSocket = io.sockets.sockets.get(worker.socketId);
                if (workerSocket) {
                    await Order.update(order._id, { status: 'processing', startedAt: new Date().toISOString() });
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
        console.error('[SCHEDULER]', error.message);
    }
}, 10000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log('[SERVER] Running on port ' + PORT);
    console.log('[SERVER] Waiting for workers...');
});
