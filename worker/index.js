const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');
const io = require('socket.io-client');
const { chromium } = require('playwright'); // just to require, we use specific ones below
const RobloxAutomation = require('./roblox');
const InstagramAutomation = require('./instagram');
const YouTubeAutomation = require('./youtube');
const TikTokAutomation = require('./tiktok');
const TelegramAutomation = require('./telegram');
const TwitterAutomation = require('./twitter');
const DiscordAutomation = require('./discord');
const PhoneVerification = require('./phone-verify');
const EmailVerification = require('./email-verify');
const { getProxyCount } = require('./proxy-manager');

// Barcha sozlamalar uchun lokal DB (ENV O'RNIGA)
const DB_PATH = path.join(process.cwd(), 'local-nexus-db.json');
const SERVER_URL = 'https://smm-nexus.onrender.com'; // Backend serveringizning aniq manzili (Render o'rnatilgach shuni o'zgartirasiz)

let localDB = { token: null, username: null };

function loadLocalDB() {
    if (fs.existsSync(DB_PATH)) {
        try {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            localDB = JSON.parse(data);
        } catch (e) {
            localDB = { token: null, username: null };
        }
    }
}

function saveLocalDB() {
    fs.writeFileSync(DB_PATH, JSON.stringify(localDB, null, 2));
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function loginUser() {
    console.log('====================================');
    console.log('      SMM NEXUS - WORKER LOGIN      ');
    console.log('====================================');
    console.log('Iltimos, saytdagi akkauntingiz bilan kiring:\n');

    const username = await askQuestion('Username: ');
    const password = await askQuestion('Password: ');

    try {
        console.log('\n[TIZIM] Serverga ulanmoqda...');
        const response = await axios.post(`${SERVER_URL}/api/auth/login`, { username, password });
        
        localDB.token = response.data.token;
        localDB.username = username;
        saveLocalDB();
        
        console.log('[TIZIM] Muvaffaqiyatli kirdingiz! Dastur sozlanmoqda...\n');
        startWorker();
    } catch (error) {
        console.log('[XATO] Login xato: ' + (error.response?.data?.msg || error.message));
        console.log('Qaytadan urinib ko\'ring...\n');
        await loginUser();
    }
}

async function init() {
    console.clear();
    loadLocalDB();

    // Birinchi marta ishlayotgan qism: Playwright browserlarini ustanovka qilish
    // Agar dastur exe qilinganda browserlar topilmasa, o'zi yuklaydi.
    
    if (!localDB.token) {
        await loginUser();
    } else {
        console.log('====================================');
        console.log(` SMM NEXUS - Xush kelibsiz, ${localDB.username} `);
        console.log('====================================\n');
        startWorker();
    }
}

function startWorker() {
    const socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: Infinity,
        timeout: 20000
    });

    const modules = {
        roblox: new RobloxAutomation(socket),
        instagram: new InstagramAutomation(socket),
        youtube: new YouTubeAutomation(socket),
        tiktok: new TikTokAutomation(socket),
        telegram: new TelegramAutomation(socket),
        twitter: new TwitterAutomation(socket),
        discord: new DiscordAutomation(socket)
    };

    const accountsCache = {};
    let isProcessing = false;
    const taskQueue = [];

    function getAccountsForPlatform(platform) {
        if (!accountsCache[platform]) accountsCache[platform] = [];
        return accountsCache[platform];
    }

    async function processTask(task) {
        console.log('[WORKER] Vazifa qabul qilindi: ' + task.platform + ' / ' + task.service + ' x' + task.quantity);
        const platformModule = modules[task.platform];
        
        if (!platformModule) {
            console.error('[WORKER] Noma\'lum platforma: ' + task.platform);
            socket.emit('task-failed', { orderId: task.orderId, error: 'Noma\'lum platforma: ' + task.platform });
            return;
        }

        const accounts = getAccountsForPlatform(task.platform);

        if (accounts.length === 0 && platformModule.createAccount) {
            console.log('[WORKER] Avtomati tarzda bot akkauntlar yaratilmoqda...');
            const minAccounts = Math.min(task.quantity, 5);
            for (let i = 0; i < minAccounts; i++) {
                try {
                    const newAccount = await platformModule.createAccount();
                    if (newAccount) {
                        accounts.push(newAccount);
                    }
                } catch (e) {
                    console.error('[WORKER] Akkaunt yaratishda xato: ' + e.message);
                }
            }
        }

        if (accounts.length === 0) {
            console.error('[WORKER] ' + task.platform + ' uchun hech qanday akkaunt yoq');
            socket.emit('task-failed', { orderId: task.orderId, error: 'Akkauntlar yoq' });
            return;
        }

        try {
            const result = await platformModule.executeTask(task, accounts);
            console.log('[WORKER] Vazifa yakunlandi: ' + result + '/' + task.quantity);

            if (result > 0) {
                socket.emit('task-completed', { orderId: task.orderId });
            } else {
                socket.emit('task-failed', { orderId: task.orderId, error: 'Barcha urinishlar muvaffaqiyatsiz bo\'ldi' });
            }
        } catch (error) {
            socket.emit('task-failed', { orderId: task.orderId, error: error.message });
        }
    }

    async function processQueue() {
        if (isProcessing || taskQueue.length === 0) return;
        isProcessing = true;
        const task = taskQueue.shift();

        try {
            await processTask(task);
        } catch (error) {}

        isProcessing = false;
        if (taskQueue.length > 0) processQueue();
    }

    socket.on('connect', () => {
        console.log('[TIZIM] Serverga ulandi!');
        console.log('[TIZIM] Proxylar soni: ' + getProxyCount());
        socket.emit('worker-auth', { token: localDB.token });
    });

    socket.on('auth-success', (data) => {
        console.log('[TIZIM] Tasdiqlash muvaffaqiyatli!');
        console.log('[TIZIM] Faol vazifalar kutilmoqda...\n');
    });

    socket.on('auth-failed', (data) => {
        console.error('[XATO] ' + data.message);
        localDB = { token: null, username: null };
        saveLocalDB();
        console.log('[TIZIM] Token eskirgan, iltimos qaytadan kiring.\n');
        socket.disconnect();
        loginUser();
    });

    socket.on('new-task', (task) => {
        taskQueue.push(task);
        processQueue();
    });

    socket.on('pending-tasks', (tasks) => {
        for (let task of tasks) {
            taskQueue.push({
                orderId: task._id,
                platform: task.platform,
                service: task.service,
                target: task.target,
                quantity: task.quantity
            });
        }
        processQueue();
    });

    socket.on('disconnect', () => {
        console.log('[TIZIM] Serverdan uzildi. Qayta ulanishga urinilmoqda...');
    });
}

init();
