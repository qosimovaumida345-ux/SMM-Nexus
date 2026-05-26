const API_URL = ''; // Same origin
let currentToken = localStorage.getItem('smm_token');
let currentUser = null;

const platforms = [
    { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram' },
    { id: 'telegram', name: 'Telegram', icon: 'fab fa-telegram' },
    { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube' },
    { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok' },
    { id: 'roblox', name: 'Roblox', icon: 'fas fa-gamepad' },
    { id: 'twitter', name: 'Twitter (X)', icon: 'fab fa-twitter' },
    { id: 'discord', name: 'Discord', icon: 'fab fa-discord' }
];

const services = {
    instagram: [{ id: 'followers', name: 'Obunachilar' }, { id: 'likes', name: 'Like' }, { id: 'views', name: 'Prosmotr' }, { id: 'comments', name: 'Kommentariya' }, { id: 'saves', name: 'Saqlash' }, { id: 'shares', name: 'Ulashish' }],
    telegram: [{ id: 'members', name: 'A\'zolar' }, { id: 'views', name: 'Prosmotr' }, { id: 'reactions', name: 'Reaksiya' }, { id: 'comments', name: 'Kommentariya' }, { id: 'shares', name: 'Ulashish' }],
    youtube: [{ id: 'subscribers', name: 'Obunachilar' }, { id: 'likes', name: 'Like' }, { id: 'views', name: 'Prosmotr' }, { id: 'comments', name: 'Kommentariya' }, { id: 'shares', name: 'Ulashish' }],
    tiktok: [{ id: 'followers', name: 'Obunachilar' }, { id: 'likes', name: 'Like' }, { id: 'views', name: 'Prosmotr' }],
    roblox: [{ id: 'followers', name: 'Obunachilar' }, { id: 'friends', name: 'Do\'stlar' }, { id: 'likes', name: 'Like' }, { id: 'plays', name: 'O\'yin o\'ynash' }, { id: 'favorites', name: 'Sevimli' }, { id: 'group_joins', name: 'Guruhga qo\'shilish' }, { id: 'reports', name: 'Shikoyat qilish' }],
    twitter: [{ id: 'followers', name: 'Obunachilar' }, { id: 'likes', name: 'Like' }, { id: 'reposts', name: 'Retweet' }, { id: 'views', name: 'Prosmotr' }, { id: 'comments', name: 'Kommentariya' }, { id: 'impressions', name: 'Tassurotlar' }],
    discord: [{ id: 'members', name: 'A\'zolar' }]
};

let selectedPlatform = null;

document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        checkAuth();
    } else {
        showScreen('auth-screen');
    }
    renderPlatforms();
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function showScreen(screenId) {
    document.getElementById('auth-screen').style.display = screenId === 'auth-screen' ? 'flex' : 'none';
    document.getElementById('dashboard-screen').style.display = screenId === 'dashboard-screen' ? 'flex' : 'none';
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
    document.getElementById(`section-${sectionId}`).classList.add('active');
    document.getElementById(`nav-${sectionId}`).classList.add('active');
    
    // sahifa nomini yangilash
    const titles = { overview: 'Bosh sahifa', 'new-order': 'Yangi buyurtma', orders: 'Buyurtmalar', accounts: 'Akkauntlar', download: 'Dasturni yukla' };
    document.getElementById('page-title').textContent = titles[sectionId];
    
    if (sectionId === 'overview') fetchStats();
    if (sectionId === 'orders') fetchOrders();
}

function showLogin() {
    document.getElementById('register-form').classList.remove('active');
    document.getElementById('login-form').classList.add('active');
    document.getElementById('auth-error').textContent = '';
}

function showRegister() {
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.add('active');
    document.getElementById('auth-error').textContent = '';
}

async function api(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (currentToken) options.headers['Authorization'] = `Bearer ${currentToken}`;
    if (data) options.body = JSON.stringify(data);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || json.error || 'Xatolik yuz berdi');
        return json;
    } catch (err) {
        throw err;
    }
}

async function handleLogin() {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    if(!u || !p) return errorEl.textContent = 'Barcha maydonlarni to\'ldiring';

    try {
        const res = await api('/api/auth/login', 'POST', { username: u, password: p });
        currentToken = res.token;
        localStorage.setItem('smm_token', currentToken);
        checkAuth();
        showToast('Tizimga kirdingiz', 'success');
    } catch (e) {
        errorEl.textContent = e.message;
    }
}

async function handleRegister() {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';
    const u = document.getElementById('reg-username').value;
    const p = document.getElementById('reg-password').value;
    const pc = document.getElementById('reg-password-confirm').value;
    if(!u || !p || !pc) return errorEl.textContent = 'Barcha maydonlarni to\'ldiring';
    if(p !== pc) return errorEl.textContent = 'Parollar mos emas';

    try {
        const res = await api('/api/auth/register', 'POST', { username: u, password: p });
        currentToken = res.token;
        localStorage.setItem('smm_token', currentToken);
        checkAuth();
        showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz', 'success');
    } catch (e) {
        errorEl.textContent = e.message;
    }
}

async function checkAuth() {
    try {
        const response = await api('/api/auth/me');
        currentUser = response.user;
        document.getElementById('display-username').textContent = currentUser.username;
        document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
        showScreen('dashboard-screen');
        showSection('overview');
    } catch (e) {
        handleLogout();
    }
}

function handleLogout() {
    currentToken = null;
    currentUser = null;
    localStorage.removeItem('smm_token');
    showScreen('auth-screen');
    showLogin();
}

function renderPlatforms() {
    const grid = document.getElementById('platform-grid');
    grid.innerHTML = platforms.map(p => `
        <div class="platform-item" onclick="selectPlatform('${p.id}')" id="plat-${p.id}">
            <i class="${p.icon}"></i>
            <span>${p.name}</span>
        </div>
    `).join('');
}

function selectPlatform(id) {
    selectedPlatform = id;
    document.querySelectorAll('.platform-item').forEach(el => el.classList.remove('selected'));
    document.getElementById(`plat-${id}`).classList.add('selected');
    
    const sel = document.getElementById('order-service');
    sel.innerHTML = '<option value="">Xizmat turini tanlang</option>' + 
        services[id].map(s => `<option value="${s.id}">${s.name}</option>`).join('');
}

async function submitOrder() {
    if (!selectedPlatform) return showToast('Platformani tanlang', 'error');
    const service = document.getElementById('order-service').value;
    const target = document.getElementById('order-target').value;
    const quantity = document.getElementById('order-quantity').value;

    if (!service || !target || !quantity) return showToast('Barcha maydonlarni to\'ldiring', 'error');

    try {
        const btn = document.querySelector('.order-submit-btn');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuborilmoqda...';
        btn.disabled = true;

        await api('/api/orders', 'POST', { platform: selectedPlatform, service, target, quantity: parseInt(quantity) });
        showToast('Buyurtma qabul qilindi', 'success');
        document.getElementById('order-target').value = '';
        document.getElementById('order-quantity').value = '';
        showSection('orders');
        
        btn.innerHTML = '<span>Buyurtma berish</span><i class="fas fa-paper-plane"></i>';
        btn.disabled = false;
    } catch (e) {
        showToast(e.message, 'error');
        const btn = document.querySelector('.order-submit-btn');
        btn.innerHTML = '<span>Buyurtma berish</span><i class="fas fa-paper-plane"></i>';
        btn.disabled = false;
    }
}

async function fetchStats() {
    try {
        const stats = await api('/api/orders/stats');
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-processing').textContent = stats.processing;
        document.getElementById('stat-completed').textContent = stats.completed;
        
        // Bu haqiqiy API dan olinishi ham mumkin, hozircha fake
        document.getElementById('stat-bots').textContent = Math.floor(Math.random() * 50) + 10;
        
        // So'nggi buyurtmalar
        const orders = await api('/api/orders');
        renderOrdersList(orders.slice(0, 5), 'recent-orders-list');
    } catch (e) {
        console.error('Stats error:', e);
    }
}

async function fetchOrders() {
    try {
        const orders = await api('/api/orders');
        renderOrdersList(orders, 'orders-list');
    } catch (e) {
        console.error('Orders error:', e);
    }
}

function renderOrdersList(orders, containerId) {
    const container = document.getElementById(containerId);
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-dim);">Hozircha buyurtmalar yo\'q</div>';
        return;
    }

    const statMap = {
        pending: { text: 'Kutilmoqda', class: 'pending' },
        processing: { text: 'Bajarilmoqda', class: 'processing' },
        completed: { text: 'Bajarildi', class: 'completed' },
        failed: { text: 'Xato', class: 'failed' }
    };

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID / Sana</th>
                    <th>Platforma / Xizmat</th>
                    <th>Manzil</th>
                    <th>Holat</th>
                    <th>Taraqqiyot</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(o => `
                    <tr>
                        <td>
                            <div style="font-weight:600; font-size:0.85rem">#${o._id.slice(-6)}</div>
                            <div style="font-size:0.75rem; color:var(--text-dim)">${new Date(o.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td>
                            <div style="font-weight:600; text-transform:capitalize">${o.platform}</div>
                            <div style="font-size:0.8rem; color:var(--text-dim)">${o.service}</div>
                        </td>
                        <td>
                            <div style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${o.target}">${o.target}</div>
                        </td>
                        <td>
                            <span class="status-badge ${statMap[o.status].class}">${statMap[o.status].text}</span>
                        </td>
                        <td>
                            <div style="font-weight:600">${o.completedCount} / ${o.quantity}</div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}
