const fs = require('fs');
const path = require('path');

const proxyListPath = path.join(__dirname, 'proxies.txt');
let proxyPool = [];
let currentIndex = 0;

function loadProxies() {
    try {
        if (fs.existsSync(proxyListPath)) {
            const content = fs.readFileSync(proxyListPath, 'utf-8');
            proxyPool = content.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            console.log('[PROXY] Loaded ' + proxyPool.length + ' proxies');
        } else {
            console.log('[PROXY] No proxies.txt found, running without proxies');
            proxyPool = [];
        }
    } catch (error) {
        console.error('[PROXY] Failed to load proxies:', error.message);
        proxyPool = [];
    }
}

function getNextProxy() {
    if (proxyPool.length === 0) return null;
    const proxy = proxyPool[currentIndex];
    currentIndex = (currentIndex + 1) % proxyPool.length;
    return formatProxy(proxy);
}

function getRandomProxy() {
    if (proxyPool.length === 0) return null;
    const index = Math.floor(Math.random() * proxyPool.length);
    return formatProxy(proxyPool[index]);
}

function formatProxy(proxyLine) {
    if (!proxyLine) return null;

    if (proxyLine.includes('://')) {
        return proxyLine;
    }

    const parts = proxyLine.split(':');

    if (parts.length === 2) {
        return 'http://' + parts[0] + ':' + parts[1];
    }

    if (parts.length === 4) {
        return 'http://' + parts[2] + ':' + parts[3] + '@' + parts[0] + ':' + parts[1];
    }

    return 'http://' + proxyLine;
}

function removeProxy(proxyString) {
    proxyPool = proxyPool.filter(p => formatProxy(p) !== proxyString);
    console.log('[PROXY] Removed dead proxy, remaining: ' + proxyPool.length);
}

function addProxy(proxyString) {
    if (!proxyPool.includes(proxyString)) {
        proxyPool.push(proxyString);
    }
}

function getProxyCount() {
    return proxyPool.length;
}

function getProxyForPlaywright(proxyString) {
    if (!proxyString) return undefined;

    try {
        const url = new URL(proxyString);
        const result = { server: url.protocol + '//' + url.hostname + ':' + url.port };
        if (url.username) result.username = url.username;
        if (url.password) result.password = url.password;
        return result;
    } catch (e) {
        return { server: proxyString };
    }
}

loadProxies();

module.exports = {
    loadProxies,
    getNextProxy,
    getRandomProxy,
    formatProxy,
    removeProxy,
    addProxy,
    getProxyCount,
    getProxyForPlaywright
};
