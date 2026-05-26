const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType, humanClick } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class YouTubeAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'youtube';
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

    async loginWithGoogle(page, context, accountData) {
        if (accountData.cookies) {
            try {
                const cookies = JSON.parse(accountData.cookies);
                await context.addCookies(cookies);
                await page.goto('https://www.youtube.com/', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(2000, 4000);
                const avatar = await page.$('#avatar-btn, button#avatar-btn, img.yt-spec-avatar-shape__button');
                if (avatar) return true;
            } catch (e) {}
        }

        await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(2000, 4000);

        const emailSelectors = [
            'input[type="email"]',
            '#identifierId',
            'input[name="identifier"]',
            'input[autocomplete="username"]',
            'input[aria-label*="Email"]',
            'input[aria-label*="email"]',
            'input[placeholder*="Email"]',
            'input[id="identifierId"]',
            'form input:first-of-type',
            'input[data-testid="email-input"]'
        ];

        const nextSelectors = [
            'button:has-text("Next")',
            '#identifierNext button',
            '#identifierNext',
            'button[type="button"]:has-text("Next")',
            'div[role="button"]:has-text("Next")',
            'button.VfPpkd-LgbsSe',
            'span:has-text("Next")',
            'button[jsname="LgbsSe"]',
            'form button:last-child',
            'button[data-testid="next-button"]'
        ];

        await this.tryFillOne(page, emailSelectors, accountData.email, 5000);
        await randomDelay(500, 1000);
        await this.tryClickOne(page, nextSelectors, 5000);
        await randomDelay(3000, 5000);

        const passwordSelectors = [
            'input[type="password"]',
            'input[name="Passwd"]',
            '#password input[type="password"]',
            'input[aria-label*="Password"]',
            'input[aria-label*="password"]',
            'input[autocomplete="current-password"]',
            'input[placeholder*="Password"]',
            'div[id="password"] input',
            'form input[type="password"]',
            'input[data-testid="password-input"]'
        ];

        const passNextSelectors = [
            '#passwordNext button',
            '#passwordNext',
            'button:has-text("Next")',
            'button[type="button"]:has-text("Next")',
            'div[role="button"]:has-text("Next")',
            'button.VfPpkd-LgbsSe',
            'span:has-text("Next")',
            'button[jsname="LgbsSe"]',
            'form button:last-child',
            'button[data-testid="password-next"]'
        ];

        await this.tryFillOne(page, passwordSelectors, accountData.password, 5000);
        await randomDelay(500, 1000);
        await this.tryClickOne(page, passNextSelectors, 5000);
        await randomDelay(5000, 8000);

        return true;
    }

    async subscribeChannel(channelUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithGoogle(page, context, accountData);

            await page.goto(channelUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const subSelectors = [
                'button:has-text("Subscribe")',
                '#subscribe-button button',
                '#subscribe-button',
                'tp-yt-paper-button#subscribe-button',
                'ytd-subscribe-button-renderer button',
                'button[aria-label*="Subscribe"]',
                'yt-button-shape button:has-text("Subscribe")',
                '#channel-header button:has-text("Subscribe")',
                'button.yt-spec-button-shape-next:has-text("Subscribe")',
                '#subscribe-button yt-button-shape button'
            ];

            const clicked = await this.tryClickOne(page, subSelectors, 5000);
            if (clicked) console.log('[YOUTUBE] Subscribed: ' + channelUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[YOUTUBE] Subscribe failed: ' + error.message);
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
            await this.loginWithGoogle(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 6000);

            const likeSelectors = [
                'button[title="I like this"]',
                'like-button-view-model button',
                '#top-level-buttons-computed button:first-child',
                'ytd-toggle-button-renderer:first-child button',
                'button[aria-label*="like this"]',
                'button[aria-label*="Like"]',
                '#segmented-like-button button',
                'ytd-menu-renderer button:first-child',
                'like-button-view-model button[aria-pressed="false"]',
                'button.yt-spec-button-shape-next[aria-label*="like"]'
            ];

            const clicked = await this.tryClickOne(page, likeSelectors, 5000);
            if (clicked) console.log('[YOUTUBE] Liked video: ' + videoUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[YOUTUBE] Like failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async viewVideo(videoUrl, accountData, watchTimeMs) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithGoogle(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const playSelectors = [
                'button.ytp-play-button',
                'button[aria-label="Play"]',
                'button.ytp-large-play-button',
                '.html5-video-player button.ytp-play-button',
                'video',
                'button[data-title-no-tooltip="Play"]',
                '.ytp-cued-thumbnail-overlay',
                '#movie_player button.ytp-play-button',
                'button[aria-label*="Play"]',
                '.html5-main-video'
            ];

            await this.tryClickOne(page, playSelectors, 5000);
            const duration = watchTimeMs || (Math.floor(Math.random() * 60000) + 30000);
            console.log('[YOUTUBE] Watching video for ' + Math.round(duration / 1000) + 's: ' + videoUrl);
            await randomDelay(duration, duration + 5000);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[YOUTUBE] View failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async commentVideo(videoUrl, accountData, commentText) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithGoogle(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 5000);

            for (let i = 0; i < 3; i++) {
                await page.mouse.wheel(0, 500);
                await randomDelay(1000, 2000);
            }

            const commentBoxSelectors = [
                '#placeholder-area',
                '#simplebox-placeholder',
                'div#placeholder-area',
                'ytd-comment-simplebox-renderer #placeholder-area',
                '#comment-teaser',
                'div[id="placeholder-area"]',
                'ytd-comments #simplebox-placeholder',
                '#contents ytd-comment-simplebox-renderer',
                'tp-yt-paper-input-container input',
                '#input-container #textarea'
            ];

            await this.tryClickOne(page, commentBoxSelectors, 5000);
            await randomDelay(1000, 2000);

            const textAreaSelectors = [
                '#contenteditable-root',
                '#creation-box #contenteditable-root',
                'div[contenteditable="true"]',
                '#contenteditable-textarea',
                'div[id="contenteditable-root"]',
                'ytd-commentbox #contenteditable-root',
                '#commentbox div[contenteditable]',
                'div[role="textbox"]',
                '#comment-dialog div[contenteditable]',
                '#textarea div[contenteditable]'
            ];

            for (let sel of textAreaSelectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 3000 });
                    if (el) {
                        await el.click();
                        await page.keyboard.type(commentText, { delay: 80 });
                        break;
                    }
                } catch (e) {}
            }

            await randomDelay(1000, 2000);

            const submitSelectors = [
                '#submit-button',
                'ytd-commentbox #submit-button',
                'button:has-text("Comment")',
                '#submit-button tp-yt-paper-button',
                'ytd-button-renderer#submit-button',
                '#submit-button button',
                'button[aria-label*="Comment"]',
                '#commentbox #submit-button',
                'tp-yt-paper-button:has-text("Comment")',
                'button.ytd-commentbox:has-text("Comment")'
            ];

            const clicked = await this.tryClickOne(page, submitSelectors, 5000);
            if (clicked) console.log('[YOUTUBE] Commented on: ' + videoUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[YOUTUBE] Comment failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async shareVideo(videoUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithGoogle(page, context, accountData);

            await page.goto(videoUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 5000);

            const shareSelectors = [
                'button:has-text("Share")',
                'button[aria-label="Share"]',
                'ytd-button-renderer:has-text("Share")',
                '#top-level-buttons-computed button:has-text("Share")',
                'yt-button-view-model:has-text("Share") button',
                'button[data-tooltip="Share"]',
                'tp-yt-paper-button:has-text("Share")',
                '#menu button:has-text("Share")',
                'yt-icon-button[aria-label="Share"]',
                'button.yt-spec-button-shape-next:has-text("Share")'
            ];

            const clicked = await this.tryClickOne(page, shareSelectors, 5000);
            if (clicked) console.log('[YOUTUBE] Shared: ' + videoUrl);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[YOUTUBE] Share failed: ' + error.message);
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
                case 'subscribers': result = await this.subscribeChannel(task.target, account); break;
                case 'likes': result = await this.likeVideo(task.target, account); break;
                case 'views': result = await this.viewVideo(task.target, account, 30000); break;
                case 'comments': result = await this.commentVideo(task.target, account, 'Nice video!'); break;
                case 'shares': result = await this.shareVideo(task.target, account); break;
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

module.exports = YouTubeAutomation;
