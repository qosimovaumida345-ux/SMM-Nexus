const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType, humanClick } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class InstagramAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'instagram';
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
                await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(2000, 4000);
                const loggedIn = await page.$('svg[aria-label="Home"], a[href="/direct/inbox/"], [class*="NavBar"], nav[role="navigation"]');
                if (loggedIn) return true;
            } catch (e) {}
        }

        await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(2000, 4000);

        const usernameSelectors = [
            'input[name="username"]',
            'input[aria-label="Phone number, username, or email"]',
            'input[aria-label*="username"]',
            '#loginForm input[type="text"]',
            'form input[type="text"]',
            'input[autocomplete="username"]',
            'input[placeholder*="Username"]',
            'input[placeholder*="username"]',
            'input[placeholder*="Phone"]',
            'input[data-testid="login-username"]'
        ];

        const passwordSelectors = [
            'input[name="password"]',
            'input[aria-label="Password"]',
            'input[type="password"]',
            '#loginForm input[type="password"]',
            'form input[type="password"]',
            'input[autocomplete="current-password"]',
            'input[placeholder*="Password"]',
            'input[placeholder*="password"]',
            'input[aria-label*="password"]',
            'input[data-testid="login-password"]'
        ];

        const loginButtonSelectors = [
            'button[type="submit"]',
            'button:has-text("Log in")',
            'button:has-text("Log In")',
            'div[role="button"]:has-text("Log in")',
            '#loginForm button',
            'form button[type="submit"]',
            'button:has-text("Sign in")',
            'button.sqdOP',
            '[data-testid="login-button"]',
            'form button:last-child'
        ];

        await this.tryFillOne(page, usernameSelectors, accountData.username || accountData.email);
        await randomDelay(500, 1200);
        await this.tryFillOne(page, passwordSelectors, accountData.password);
        await randomDelay(500, 1000);
        await this.tryClickOne(page, loginButtonSelectors);
        await randomDelay(5000, 8000);

        const notNowSelectors = [
            'button:has-text("Not Now")',
            'button:has-text("Not now")',
            'button:has-text("Skip")',
            'a:has-text("Not Now")',
            'button.sqdOP:has-text("Not Now")',
            'div[role="button"]:has-text("Not Now")',
            'button[class*="secondary"]:has-text("Not")',
            '[data-testid="dismiss-button"]',
            'button:has-text("Cancel")',
            '.modal button:last-child'
        ];

        await this.tryClickOne(page, notNowSelectors, 3000);
        await randomDelay(1000, 2000);
        await this.tryClickOne(page, notNowSelectors, 3000);

        return true;
    }

    async createAccount() {
        const identity = generateCompleteIdentity();
        const proxyString = getRandomProxy();
        let browser, context, page, fingerprint;

        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;
            fingerprint = session.fingerprint;

            await page.goto('https://www.instagram.com/accounts/emailsignup/', { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const emailSelectors = [
                'input[name="emailOrPhone"]',
                'input[aria-label="Mobile Number or Email"]',
                'input[aria-label*="Email"]',
                'input[type="email"]',
                'input[placeholder*="Email"]',
                'input[placeholder*="email"]',
                'input[name="email"]',
                'form input:first-of-type',
                'input[autocomplete="email"]',
                'input[data-testid="email-input"]'
            ];

            const fullNameSelectors = [
                'input[name="fullName"]',
                'input[aria-label="Full Name"]',
                'input[aria-label*="Full"]',
                'input[placeholder*="Full Name"]',
                'input[placeholder*="full name"]',
                'input[autocomplete="name"]',
                'input[name="name"]',
                'form input:nth-of-type(2)',
                'input[data-testid="fullname-input"]',
                'input[placeholder*="Name"]'
            ];

            const usernameSelectors = [
                'input[name="username"]',
                'input[aria-label="Username"]',
                'input[aria-label*="username"]',
                'input[placeholder*="Username"]',
                'input[placeholder*="username"]',
                'input[autocomplete="username"]',
                'form input:nth-of-type(3)',
                'input[name="loginUsername"]',
                'input[data-testid="username-input"]',
                'input[placeholder*="User"]'
            ];

            const passwordSelectors = [
                'input[name="password"]',
                'input[aria-label="Password"]',
                'input[type="password"]',
                'input[placeholder*="Password"]',
                'input[placeholder*="password"]',
                'input[autocomplete="new-password"]',
                'form input[type="password"]',
                'form input:last-of-type',
                'input[data-testid="password-input"]',
                'input[aria-label*="password"]'
            ];

            await this.tryFillOne(page, emailSelectors, identity.email, 5000);
            await randomDelay(600, 1200);
            await this.tryFillOne(page, fullNameSelectors, identity.firstName + ' ' + identity.lastName, 5000);
            await randomDelay(600, 1200);
            await this.tryFillOne(page, usernameSelectors, identity.username, 5000);
            await randomDelay(600, 1200);
            await this.tryFillOne(page, passwordSelectors, identity.password, 5000);
            await randomDelay(800, 1500);

            const signupSelectors = [
                'button[type="submit"]',
                'button:has-text("Sign up")',
                'button:has-text("Sign Up")',
                'button:has-text("Next")',
                'div[role="button"]:has-text("Sign up")',
                'form button',
                'button.sqdOP',
                '[data-testid="signup-button"]',
                'button:has-text("Register")',
                'button:has-text("Create")'
            ];

            await this.tryClickOne(page, signupSelectors, 5000);
            await randomDelay(5000, 10000);

            const cookies = await context.cookies();
            const accountData = {
                platform: this.platformName,
                username: identity.username,
                email: identity.email,
                password: identity.password,
                displayName: identity.firstName + ' ' + identity.lastName,
                firstName: identity.firstName,
                lastName: identity.lastName,
                birthday: identity.birthday,
                userAgent: fingerprint.userAgent,
                cookies: JSON.stringify(cookies)
            };

            if (this.socket) this.socket.emit('account-created', accountData);
            console.log('[INSTAGRAM] Account created: ' + identity.username);
            await browser.close();
            return accountData;
        } catch (error) {
            console.error('[INSTAGRAM] Account creation failed: ' + error.message);
            if (browser) await browser.close();
            return null;
        }
    }

    async followUser(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://www.instagram.com/' + targetUsername + '/', { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const followSelectors = [
                'button:has-text("Follow")',
                'button:has-text("follow")',
                'header button:has-text("Follow")',
                'div[role="button"]:has-text("Follow")',
                'button._acan',
                'button[class*="follow"]',
                'header section button:first-of-type',
                '[data-testid="follow-button"]',
                'button.sqdOP:has-text("Follow")',
                'header button:not(:has-text("Following")):not(:has-text("Message"))'
            ];

            const clicked = await this.tryClickOne(page, followSelectors, 5000);
            if (clicked) console.log('[INSTAGRAM] Followed: ' + targetUsername);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[INSTAGRAM] Follow failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async likePost(postUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const likeSelectors = [
                'svg[aria-label="Like"]',
                'span svg[aria-label="Like"]',
                'button svg[aria-label="Like"]',
                '[aria-label="Like"]',
                'section button:first-child',
                'button:has(svg[aria-label="Like"])',
                'article section button:first-of-type',
                'span[class*="like"] button',
                '[data-testid="like-button"]',
                'div[role="button"]:has(svg[aria-label="Like"])'
            ];

            const clicked = await this.tryClickOne(page, likeSelectors, 5000);
            if (clicked) console.log('[INSTAGRAM] Liked post: ' + postUrl);
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[INSTAGRAM] Like failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async commentPost(postUrl, accountData, commentText) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const commentAreaSelectors = [
                'textarea[aria-label="Add a comment…"]',
                'textarea[placeholder="Add a comment…"]',
                'textarea[aria-label*="comment"]',
                'textarea[placeholder*="comment"]',
                'form textarea',
                'textarea.Ypffh',
                '[data-testid="comment-textarea"]',
                'textarea[name="comment"]',
                'article textarea',
                'textarea'
            ];

            await this.tryClickOne(page, commentAreaSelectors, 5000);
            await randomDelay(500, 1000);
            await this.tryFillOne(page, commentAreaSelectors, commentText, 5000);
            await randomDelay(500, 1000);

            const postBtnSelectors = [
                'button:has-text("Post")',
                'button[type="submit"]:has-text("Post")',
                'div[role="button"]:has-text("Post")',
                'form button[type="submit"]',
                'button.sqdOP:has-text("Post")',
                '[data-testid="post-comment"]',
                'button[class*="submit"]:has-text("Post")',
                'form button:last-child',
                'button:has-text("Reply")',
                'button:has-text("Send")'
            ];

            const clicked = await this.tryClickOne(page, postBtnSelectors, 5000);
            if (clicked) console.log('[INSTAGRAM] Commented on: ' + postUrl);
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[INSTAGRAM] Comment failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async savePost(postUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const saveSelectors = [
                'svg[aria-label="Save"]',
                '[aria-label="Save"]',
                'button:has(svg[aria-label="Save"])',
                'button svg[aria-label="Save"]',
                'section button:last-child',
                'div[role="button"]:has(svg[aria-label="Save"])',
                '[data-testid="save-button"]',
                'article section button:last-of-type',
                'button[class*="save"]',
                'span[class*="save"] button'
            ];

            const clicked = await this.tryClickOne(page, saveSelectors, 5000);
            if (clicked) console.log('[INSTAGRAM] Saved post: ' + postUrl);
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[INSTAGRAM] Save failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async viewStory(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://www.instagram.com/stories/' + targetUsername + '/', { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(5000, 10000);
            console.log('[INSTAGRAM] Viewed story: ' + targetUsername);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[INSTAGRAM] View story failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async sharePost(postUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            await page.goto(postUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const shareSelectors = [
                'svg[aria-label="Share Post"]',
                '[aria-label="Share Post"]',
                'button:has(svg[aria-label="Share Post"])',
                'svg[aria-label="Share"]',
                '[aria-label="Share"]',
                'button:has(svg[aria-label="Share"])',
                'button[class*="share"]',
                '[data-testid="share-button"]',
                'section button:nth-child(3)',
                'div[role="button"]:has(svg[aria-label*="Share"])'
            ];

            const clicked = await this.tryClickOne(page, shareSelectors, 5000);
            if (clicked) console.log('[INSTAGRAM] Shared post: ' + postUrl);
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[INSTAGRAM] Share failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async executeTask(task, accounts) {
        let successCount = 0;
        for (let i = 0; i < task.quantity; i++) {
            let account = accounts[i % accounts.length];
            if (!account) {
                account = await this.createAccount();
                if (!account) continue;
                accounts.push(account);
            }

            let result = false;
            switch (task.service) {
                case 'followers': result = await this.followUser(task.target, account); break;
                case 'likes': result = await this.likePost(task.target, account); break;
                case 'comments': result = await this.commentPost(task.target, account, 'Great content!'); break;
                case 'saves': result = await this.savePost(task.target, account); break;
                case 'views': result = await this.viewStory(task.target, account); break;
                case 'shares': result = await this.sharePost(task.target, account); break;
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

module.exports = InstagramAutomation;
