const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');

class DiscordAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'discord';
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
                await page.goto('https://discord.com/channels/@me', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(3000, 6000);
                const loggedIn = await page.$('[class*="guilds"], [class*="sidebar"], [class*="toolbar"]');
                if (loggedIn) return true;
            } catch (e) {}
        }

        await page.goto('https://discord.com/login', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(2000, 4000);

        const emailSelectors = [
            'input[name="email"]', 'input[type="email"]',
            'input[aria-label*="Email"]', 'input[placeholder*="Email"]',
            'input[autocomplete="email"]', 'form input:first-of-type',
            'input[name="loginEmail"]', 'input[aria-label*="email"]',
            'input[placeholder*="email"]', 'input#uid_5'
        ];

        const passwordSelectors = [
            'input[name="password"]', 'input[type="password"]',
            'input[aria-label*="Password"]', 'input[placeholder*="Password"]',
            'input[autocomplete="current-password"]', 'form input[type="password"]',
            'input[name="loginPassword"]', 'input[aria-label*="password"]',
            'input[placeholder*="password"]', 'input#uid_7'
        ];

        const loginSelectors = [
            'button[type="submit"]', 'button:has-text("Log In")',
            'button:has-text("Login")', 'div[role="button"]:has-text("Log In")',
            'button:has-text("Sign in")', 'form button',
            'button[class*="submit"]', 'button[class*="login"]',
            'span:has-text("Log In")', 'button:last-child'
        ];

        await page.waitForSelector(emailSelectors[0], { timeout: 10000 }).catch(() => {});
        await randomDelay(500, 1000);

        for (let sel of emailSelectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    await el.fill('');
                    await humanType(page, sel, accountData.email || accountData.username);
                    break;
                }
            } catch (e) {}
        }

        await randomDelay(500, 1000);

        for (let sel of passwordSelectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    await el.fill('');
                    await humanType(page, sel, accountData.password);
                    break;
                }
            } catch (e) {}
        }

        await randomDelay(500, 1000);
        await this.tryClickOne(page, loginSelectors, 5000);
        await randomDelay(5000, 8000);
        return true;
    }

    async joinServer(inviteLink, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = inviteLink;
            if (!inviteLink.startsWith('http')) {
                targetUrl = 'https://discord.gg/' + inviteLink;
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const joinSelectors = [
                'button:has-text("Accept Invite")',
                'button:has-text("Join")',
                'button:has-text("Accept")',
                'div[role="button"]:has-text("Accept Invite")',
                'div[role="button"]:has-text("Join")',
                'button[class*="accept"]',
                'button[class*="join"]',
                'span:has-text("Accept Invite")',
                'button[type="button"]:has-text("Join")',
                'form button:has-text("Join")'
            ];

            const completeSelectors = [
                'button:has-text("I have read")',
                'button:has-text("Complete")',
                'button:has-text("Submit")',
                'button:has-text("Continue")',
                'button:has-text("Finish")',
                'button[class*="complete"]',
                'button[class*="continue"]',
                'div[role="button"]:has-text("Continue")',
                'button:has-text("Agree")',
                'button[type="submit"]'
            ];

            const clicked = await this.tryClickOne(page, joinSelectors, 5000);
            await randomDelay(2000, 4000);

            await this.tryClickOne(page, completeSelectors, 3000);
            await randomDelay(1000, 2000);
            await this.tryClickOne(page, completeSelectors, 3000);

            if (clicked) console.log('[DISCORD] Joined server: ' + inviteLink);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[DISCORD] Join server failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async executeTask(task, accounts) {
        let successCount = 0;
        for (let i = 0; i < task.quantity; i++) {
            let account = accounts[i % accounts.length];
            if (!account) continue;

            let result = false;
            switch (task.service) {
                case 'members': result = await this.joinServer(task.target, account); break;
            }

            if (result) {
                successCount++;
                if (this.socket) this.socket.emit('task-progress', { orderId: task.orderId, amount: 1 });
            }
            await randomDelay(5000, 12000);
        }
        return successCount;
    }
}

module.exports = DiscordAutomation;
