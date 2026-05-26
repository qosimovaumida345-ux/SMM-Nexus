const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType, humanClick } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class TikTokAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'tiktok';
    }

    async tryClickOne(page, selectors, timeout) {
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = await page.waitForSelector(selectors[i], { timeout: timeout || 3000 });
                if (el) { await el.click(); return true; }
            } catch (e) {}
        }
        return false;
    }

    async tryFillOne(page, selectors, value, timeout) {
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = await page.waitForSelector(selectors[i], { timeout: timeout || 3000 });
                if (el) { await el.fill(''); await humanType(page, selectors[i], value); return true; }
            } catch (e) {}
        }
        return false;
    }

    async openBrowser(proxyString) {
        const proxyConfig = getProxyForPlaywright(proxyString);
        const launchOptions = { headless: true };
        if (proxyConfig) launchOptions.proxy = proxyConfig;
        const browser = await chromium.launch(launchOptions);
        const { context, fingerprint } = await createStealthContext(browser, proxyString);
        const page = await context.newPage();
        return { browser, context, page, fingerprint };
    }

    async loginWithAccount(page, context, accountData) {
        if (accountData.cookies) {
            try {
                const cookies = JSON.parse(accountData.cookies);
                await context.addCookies(cookies);
                await page.goto('https://www.tiktok.com/', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(2000, 4000);
                const loggedIn = await page.$('.avatar-wrapper, [data-e2e="nav-profile"], img[alt*="profile"]');
                if (loggedIn) return true;
            } catch (e) {}
        }

        // TikTok bot login is extremely complex due to captchas, using cookie injection is primary technique.
        // Assuming user acts as bot with loaded cookies for now, or performs basic login attempts
        return false;
    }
    
    async followUser(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(`https://www.tiktok.com/@${targetUsername.replace('@', '')}`, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 5000);

            const followSelectors = [
                'button[data-e2e="follow-button"]',
                '.follow-button',
                'button:has-text("Follow")',
                'button:has-text("Follow back")',
                'div[data-e2e="user-title"] + button',
                'div[class*="follow"] button',
                '[data-testid="follow-button"]',
                'button[type="button"]:has-text("Follow")',
                'div[action-type="follow"]',
                '.tiktok-follow-button'
            ];

            const clicked = await this.tryClickOne(page, followSelectors, 5000);
            if (clicked) console.log('[TIKTOK] Followed: ' + targetUsername);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TIKTOK] Follow failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async likeVideo(videoUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 6000);

            const likeSelectors = [
                'span[data-e2e="like-icon"]',
                'button[data-e2e="like-button"]',
                'div[data-e2e="video-author-avatar"] ~ div button:first-child',
                '[aria-label="Like"]',
                'span[class*="like-icon"]',
                'svg[class*="heart"]',
                'svg[data-e2e="like-icon"]',
                '.action-item-like',
                'div.action-right button:first-child',
                'button[aria-label*="like"]'
            ];

            const clicked = await this.tryClickOne(page, likeSelectors, 5000);
            if (clicked) console.log('[TIKTOK] Liked video: ' + videoUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TIKTOK] Like failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async viewVideo(videoUrl, accountData, watchTimeMs = 15000) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            console.log(`[TIKTOK] Watching video ${videoUrl} for ${watchTimeMs}ms`);
            await randomDelay(watchTimeMs, watchTimeMs + 5000);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[TIKTOK] View failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async executeTask(task, accounts) {
        let successCount = 0;
        for (let i = 0; i < task.quantity; i++) {
            let account = accounts[i % accounts.length];
            if (!account) return successCount; // Registration logic is manual via API or external for TikTok

            let result = false;
            switch (task.service) {
                case 'followers': result = await this.followUser(task.target, account); break;
                case 'likes': result = await this.likeVideo(task.target, account); break;
                case 'views': result = await this.viewVideo(task.target, account); break;
            }

            if (result) {
                successCount++;
                if (this.socket) this.socket.emit('task-progress', { orderId: task.orderId, amount: 1 });
            }
            await randomDelay(3000, 8000);
        }
        return successCount;
    }
}

module.exports = TikTokAutomation;
