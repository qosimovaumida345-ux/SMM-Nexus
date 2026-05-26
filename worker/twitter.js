const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class TwitterAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'twitter';
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
                await page.goto('https://x.com/home', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(2000, 4000);
                const loggedIn = await page.$('[data-testid="primaryColumn"], [data-testid="AppTabBar_Home_Link"], nav[role="navigation"]');
                if (loggedIn) return true;
            } catch (e) {}
        }

        await page.goto('https://x.com/i/flow/login', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(2000, 4000);

        const usernameSelectors = [
            'input[autocomplete="username"]', 'input[name="text"]',
            'input[type="text"]', 'input[name="username"]',
            'input[aria-label*="Phone"]', 'input[aria-label*="Email"]',
            'input[aria-label*="Username"]', 'input[placeholder*="phone"]',
            'form input:first-of-type', 'input[data-testid="ocfEnterTextTextInput"]'
        ];

        await this.tryFillOne(page, usernameSelectors, accountData.email || accountData.username, 5000);
        await randomDelay(500, 1000);

        const nextSelectors = [
            'button:has-text("Next")', 'div[role="button"]:has-text("Next")',
            'span:has-text("Next")', 'button[type="button"]:has-text("Next")',
            'button[data-testid="LoginForm_Login_Button"]', 'button.css-901oao',
            'div[data-testid*="next"]', 'button:has-text("Log in")',
            'form button', 'div[role="button"][tabindex="0"]:has-text("Next")'
        ];

        await this.tryClickOne(page, nextSelectors, 5000);
        await randomDelay(2000, 4000);

        const passwordSelectors = [
            'input[name="password"]', 'input[type="password"]',
            'input[autocomplete="current-password"]', 'input[aria-label*="Password"]',
            'input[placeholder*="Password"]', 'form input[type="password"]',
            'div[data-testid="LoginForm"] input[type="password"]',
            'input[data-testid="ocfEnterTextTextInput"]',
            'form input:last-of-type', 'input[name="Passwd"]'
        ];

        await this.tryFillOne(page, passwordSelectors, accountData.password, 5000);
        await randomDelay(500, 1000);

        const loginSelectors = [
            'button[data-testid="LoginForm_Login_Button"]',
            'button:has-text("Log in")', 'div[role="button"]:has-text("Log in")',
            'button[type="button"]:has-text("Log in")', 'span:has-text("Log in")',
            'button:has-text("Sign in")', 'form button[type="submit"]',
            'div[data-testid*="login"]', 'button.css-901oao:has-text("Log")',
            'form button:last-child'
        ];

        await this.tryClickOne(page, loginSelectors, 5000);
        await randomDelay(4000, 7000);
        return true;
    }

    async followUser(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://x.com/' + targetUsername.replace('@', ''), { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const followSelectors = [
                '[data-testid$="-follow"]', 'button:has-text("Follow")',
                'div[role="button"]:has-text("Follow")', '[aria-label*="Follow @"]',
                'button[data-testid="follow"]', 'span:has-text("Follow")',
                'button[class*="follow"]', '[data-testid="placementTracking"] button',
                'div[data-testid="UserActions"] button', 'button:not(:has-text("Following")):has-text("Follow")'
            ];

            const clicked = await this.tryClickOne(page, followSelectors, 5000);
            if (clicked) console.log('[TWITTER] Followed: ' + targetUsername);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TWITTER] Follow failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async likeTweet(tweetUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(tweetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const likeSelectors = [
                '[data-testid="like"]', 'button[aria-label*="Like"]',
                'div[role="button"][data-testid="like"]', '[data-testid="like"] button',
                'button:has(svg path[d*="M16.697"])', 'div[aria-label*="Like"]',
                'button[class*="like"]', '[data-testid="tweet"] button:nth-child(3)',
                'article button:nth-of-type(3)', 'button[aria-label*="like"]'
            ];

            const clicked = await this.tryClickOne(page, likeSelectors, 5000);
            if (clicked) console.log('[TWITTER] Liked tweet: ' + tweetUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TWITTER] Like failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async retweet(tweetUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(tweetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const retweetSelectors = [
                '[data-testid="retweet"]', 'button[aria-label*="Repost"]',
                'div[role="button"][data-testid="retweet"]', 'button[aria-label*="Retweet"]',
                'button:has(svg path[d*="M4.5 3.88"])', 'div[aria-label*="Repost"]',
                'button[class*="retweet"]', '[data-testid="tweet"] button:nth-child(2)',
                'article button:nth-of-type(2)', 'button[aria-label*="repost"]'
            ];

            await this.tryClickOne(page, retweetSelectors, 5000);
            await randomDelay(1000, 2000);

            const confirmSelectors = [
                '[data-testid="retweetConfirm"]', 'button:has-text("Repost")',
                'div[data-testid="retweetConfirm"]', 'button:has-text("Retweet")',
                'div[role="menuitem"]:has-text("Repost")', 'span:has-text("Repost")',
                'div[role="menuitem"]:first-child', 'a[role="menuitem"]:has-text("Repost")',
                'button[data-testid="retweet-confirm"]', '[role="menu"] [role="menuitem"]:first-child'
            ];

            const clicked = await this.tryClickOne(page, confirmSelectors, 5000);
            if (clicked) console.log('[TWITTER] Retweeted: ' + tweetUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TWITTER] Retweet failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async viewTweet(tweetUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(tweetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            console.log('[TWITTER] Viewed tweet: ' + tweetUrl);
            await randomDelay(5000, 15000);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[TWITTER] View failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async commentTweet(tweetUrl, accountData, commentText) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(tweetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const replySelectors = [
                '[data-testid="reply"]', 'button[aria-label*="Reply"]',
                'div[role="button"][data-testid="reply"]',
                'button:has(svg path[d*="M1.751 10c0"])',
                'article button:first-of-type', 'button[class*="reply"]',
                '[data-testid="tweet"] button:first-child', 'div[aria-label*="Reply"]',
                'button[aria-label*="reply"]', 'button:has-text("Reply")'
            ];

            await this.tryClickOne(page, replySelectors, 5000);
            await randomDelay(1000, 2000);

            const textBoxSelectors = [
                '[data-testid="tweetTextarea_0"]', 'div[role="textbox"]',
                'div[contenteditable="true"]', 'div[data-testid="tweetTextarea"]',
                '.DraftEditor-root', 'div[aria-label*="Post"]',
                'div[aria-label*="reply"]', 'div.public-DraftEditor-content',
                'div[data-offset-key]', 'div[class*="editor"]'
            ];

            for (let sel of textBoxSelectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 3000 });
                    if (el) {
                        await el.click();
                        await page.keyboard.type(commentText, { delay: 60 });
                        break;
                    }
                } catch (e) {}
            }

            await randomDelay(1000, 2000);

            const postSelectors = [
                '[data-testid="tweetButton"]', 'button:has-text("Post")',
                'button:has-text("Reply")', 'div[data-testid="tweetButton"]',
                'span:has-text("Post")', 'button[type="button"]:has-text("Post")',
                'div[role="button"]:has-text("Reply")', 'button[data-testid="tweet-button"]',
                'form button:last-child', 'button:has-text("Tweet")'
            ];

            const clicked = await this.tryClickOne(page, postSelectors, 5000);
            if (clicked) console.log('[TWITTER] Commented on: ' + tweetUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TWITTER] Comment failed: ' + error.message);
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
                case 'followers': result = await this.followUser(task.target, account); break;
                case 'likes': result = await this.likeTweet(task.target, account); break;
                case 'reposts': result = await this.retweet(task.target, account); break;
                case 'views': result = await this.viewTweet(task.target, account); break;
                case 'comments': result = await this.commentTweet(task.target, account, 'Great post!'); break;
                case 'impressions': result = await this.viewTweet(task.target, account); break;
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

module.exports = TwitterAutomation;
