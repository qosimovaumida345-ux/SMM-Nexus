const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType, humanClick } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class TelegramAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'telegram';
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
                await page.goto('https://web.telegram.org/', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(3000, 6000);
                const loggedIn = await page.$('.chats-container, .chat-list, #column-center, .sidebar');
                if (loggedIn) return true;
            } catch (e) {}
        }

        await page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(2000, 4000);

        const phoneSelectors = [
            'input[type="tel"]',
            '#phone-number-input',
            'input.phone-input',
            'input[name="phone"]',
            'input[placeholder*="Phone"]',
            'input[placeholder*="phone"]',
            'input[aria-label*="Phone"]',
            '.phone-wrapper input',
            'input.input-field-input',
            'form input[type="tel"]'
        ];

        await this.tryFillOne(page, phoneSelectors, accountData.phone || '+1234567890', 5000);
        await randomDelay(1000, 2000);

        const nextSelectors = [
            'button:has-text("Next")',
            'button:has-text("NEXT")',
            'button.btn-primary',
            'button[type="submit"]',
            '.phone-wrapper button',
            'button:has-text("Continue")',
            'button.btn-color-primary',
            'button.rp',
            'form button',
            'button:has-text("Sign In")'
        ];

        await this.tryClickOne(page, nextSelectors, 5000);
        await randomDelay(3000, 5000);

        return false;
    }

    async joinChannel(channelLink, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = channelLink;
            if (!channelLink.startsWith('http')) {
                targetUrl = 'https://t.me/' + channelLink.replace('@', '');
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const joinSelectors = [
                'button:has-text("JOIN CHANNEL")',
                'button:has-text("Join Channel")',
                'button:has-text("JOIN")',
                'button:has-text("Join")',
                'button:has-text("Join Group")',
                'button:has-text("JOIN GROUP")',
                'a:has-text("JOIN")',
                '.tgme_action_button_new',
                'a.tgme_action_button_new',
                'button.join-btn'
            ];

            const clicked = await this.tryClickOne(page, joinSelectors, 5000);

            if (!clicked) {
                const openInWebSelectors = [
                    'a:has-text("Open in Web")',
                    'a:has-text("OPEN IN WEB")',
                    'a.tgme_action_button_new',
                    'a:has-text("Preview channel")',
                    'a:has-text("View in Telegram")',
                    'a[href*="web.telegram.org"]',
                    '.tgme_page_action a',
                    'a.tgme_action_button',
                    'button:has-text("Open")',
                    'a:has-text("Open")'
                ];

                await this.tryClickOne(page, openInWebSelectors, 5000);
                await randomDelay(3000, 5000);

                const webJoinSelectors = [
                    'button:has-text("JOIN CHANNEL")',
                    'button:has-text("Join Channel")',
                    'button:has-text("JOIN")',
                    'button:has-text("Join")',
                    '.btn-join',
                    'button.chat-join-btn',
                    'button.btn-primary:has-text("Join")',
                    '.bubble-join button',
                    'button[class*="join"]',
                    '.chat-info button:has-text("Join")'
                ];

                await this.tryClickOne(page, webJoinSelectors, 5000);
            }

            console.log('[TELEGRAM] Joined channel: ' + channelLink);
            await randomDelay(2000, 4000);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[TELEGRAM] Join channel failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async viewPost(postLink, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = postLink;
            if (!postLink.startsWith('http')) {
                targetUrl = 'https://t.me/' + postLink;
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            console.log('[TELEGRAM] Viewed post: ' + postLink);
            await randomDelay(5000, 10000);
            await browser.close();
            return true;
        } catch (error) {
            console.error('[TELEGRAM] View post failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async reactToPost(postLink, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = postLink;
            if (!postLink.startsWith('http')) {
                targetUrl = 'https://t.me/' + postLink;
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const reactionSelectors = [
                '.reaction-button',
                'button[class*="reaction"]',
                '.message-reaction',
                'div[class*="reaction"]',
                '.reactions-container button',
                '.bubble-reaction',
                'span[class*="emoji-reaction"]',
                '.reaction-wrapper button',
                'button[data-reaction]',
                '.message-footer button[class*="reaction"]'
            ];

            const clicked = await this.tryClickOne(page, reactionSelectors, 5000);
            if (clicked) console.log('[TELEGRAM] Reacted to post: ' + postLink);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TELEGRAM] Reaction failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async sharePost(postLink, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = postLink;
            if (!postLink.startsWith('http')) {
                targetUrl = 'https://t.me/' + postLink;
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const shareSelectors = [
                'button:has-text("Share")',
                'button:has-text("Forward")',
                'button.forward-btn',
                '.message-action-forward',
                'button[class*="forward"]',
                'button[class*="share"]',
                'svg[class*="forward"]',
                '.bubble-menu button:has-text("Forward")',
                '[data-action="forward"]',
                'button[aria-label*="Forward"]'
            ];

            const clicked = await this.tryClickOne(page, shareSelectors, 5000);
            if (clicked) console.log('[TELEGRAM] Shared post: ' + postLink);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TELEGRAM] Share failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async commentPost(postLink, accountData, commentText) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser; context = session.context; page = session.page;
            await this.loginWithAccount(page, context, accountData);

            let targetUrl = postLink;
            if (!postLink.startsWith('http')) {
                targetUrl = 'https://t.me/' + postLink;
            }

            await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const commentBtnSelectors = [
                'button:has-text("Comment")',
                '.comment-button',
                'button[class*="comment"]',
                '.replies-link',
                'a:has-text("Comment")',
                '.bubble-footer button',
                'button:has-text("Reply")',
                '[data-action="comment"]',
                'button[aria-label*="Comment"]',
                '.discussion-link'
            ];

            await this.tryClickOne(page, commentBtnSelectors, 5000);
            await randomDelay(2000, 4000);

            const inputSelectors = [
                'div[contenteditable="true"]',
                '.input-message-input',
                '#editable-message-text',
                'div.input-field',
                'div[role="textbox"]',
                'textarea.input-message',
                '.composer-textarea',
                'div[class*="message-input"]',
                '#message-input-text',
                'div.ql-editor'
            ];

            for (let sel of inputSelectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 3000 });
                    if (el) {
                        await el.click();
                        await page.keyboard.type(commentText, { delay: 60 });
                        break;
                    }
                } catch (e) {}
            }

            await randomDelay(500, 1000);

            const sendSelectors = [
                'button.send',
                'button[class*="send"]',
                '.btn-send',
                'button:has-text("Send")',
                'button[aria-label="Send"]',
                '.composer-send-btn',
                'button.btn-icon.send',
                'button[class*="submit"]',
                '.input-message-container button',
                'button svg[class*="send"]'
            ];

            const clicked = await this.tryClickOne(page, sendSelectors, 5000);
            if (clicked) console.log('[TELEGRAM] Commented on: ' + postLink);
            await randomDelay(2000, 4000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[TELEGRAM] Comment failed: ' + error.message);
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
                case 'members': result = await this.joinChannel(task.target, account); break;
                case 'views': result = await this.viewPost(task.target, account); break;
                case 'reactions': result = await this.reactToPost(task.target, account); break;
                case 'shares': result = await this.sharePost(task.target, account); break;
                case 'comments': result = await this.commentPost(task.target, account, 'Great post!'); break;
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

module.exports = TelegramAutomation;
