const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

const TEMP_MAIL_SERVICES = [
    {
        name: 'guerrillamail',
        url: 'https://www.guerrillamail.com/',
        getEmail: async (page) => {
            const selectors = [
                '#email-widget', '#inbox-id', '.email-address', '#email-address-input',
                'span#email-widget', 'input#inbox-id', '.inbox-address', '#user-email',
                'span.email', '#emailAddress'
            ];
            for (let sel of selectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 3000 });
                    if (el) {
                        const text = await el.inputValue().catch(() => el.textContent());
                        if (text && text.includes('@')) return text.trim();
                    }
                } catch (e) {}
            }
            return null;
        },
        checkInbox: async (page, expectedFrom) => {
            const rowSelectors = [
                'tr.mail_row', '.email-item', '.inbox-row', 'table.email_table tr',
                '.mail-item', '.message-row', 'tbody tr', '.inbox-message',
                '.email-list-item', 'tr[id*="row_"]'
            ];
            for (let sel of rowSelectors) {
                try {
                    const rows = await page.$$(sel);
                    for (let row of rows) {
                        const text = await row.textContent();
                        if (expectedFrom && !text.toLowerCase().includes(expectedFrom.toLowerCase())) continue;
                        await row.click();
                        await randomDelay(2000, 3000);

                        const bodySelectors = [
                            '.email_body', '#email-body', '.message-body', '.mail-body',
                            '#display_email', '.email-content', '.message-content',
                            '.email-text', '#email_body', '.inbox-email-body'
                        ];
                        for (let bodySel of bodySelectors) {
                            try {
                                const body = await page.waitForSelector(bodySel, { timeout: 3000 });
                                if (body) {
                                    const bodyText = await body.textContent();
                                    const codeMatch = bodyText.match(/(\d{4,8})/);
                                    if (codeMatch) return { code: codeMatch[1], body: bodyText };

                                    const linkMatch = bodyText.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/i);
                                    if (linkMatch) return { link: linkMatch[0], body: bodyText };

                                    const confirmMatch = bodyText.match(/https?:\/\/[^\s"'<>]+confirm[^\s"'<>]*/i);
                                    if (confirmMatch) return { link: confirmMatch[0], body: bodyText };
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }
            return null;
        }
    },
    {
        name: 'tempmail',
        url: 'https://temp-mail.org/',
        getEmail: async (page) => {
            const selectors = [
                '#mail', 'input#mail', '.email-address', '#copy-button + input',
                'input[readonly]', '#email-address', '.temp-email', 'input.emailbox-input',
                'p.emailbox-input', '#emailbox-input'
            ];
            for (let sel of selectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 5000 });
                    if (el) {
                        const val = await el.inputValue().catch(() => null);
                        if (val && val.includes('@')) return val.trim();
                        const text = await el.textContent();
                        if (text && text.includes('@')) return text.trim();
                    }
                } catch (e) {}
            }
            return null;
        },
        checkInbox: async (page, expectedFrom) => {
            await page.reload({ waitUntil: 'networkidle' });
            await randomDelay(2000, 4000);

            const rowSelectors = [
                '.inbox-area li', '.mail', '.email-item', '.inbox-dataList li',
                'ul.email-list li', 'div.mail-item', '.inbox li', '.message-list-item',
                'a.email-list__item', '.email-table tr'
            ];
            for (let sel of rowSelectors) {
                try {
                    const rows = await page.$$(sel);
                    if (rows.length > 0) {
                        await rows[0].click();
                        await randomDelay(2000, 3000);

                        const bodySelectors = [
                            '.inbox-data-content', '.mail-text', '.email-body',
                            '.message-body', '#email-content', '.inbox-body',
                            '.mail-body', '.message-content', '#mail-content', '.email-text'
                        ];
                        for (let bodySel of bodySelectors) {
                            try {
                                const body = await page.waitForSelector(bodySel, { timeout: 3000 });
                                if (body) {
                                    const bodyText = await body.textContent();
                                    const codeMatch = bodyText.match(/(\d{4,8})/);
                                    if (codeMatch) return { code: codeMatch[1], body: bodyText };

                                    const linkMatch = bodyText.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/i);
                                    if (linkMatch) return { link: linkMatch[0], body: bodyText };

                                    const confirmMatch = bodyText.match(/https?:\/\/[^\s"'<>]+confirm[^\s"'<>]*/i);
                                    if (confirmMatch) return { link: confirmMatch[0], body: bodyText };
                                }
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }
            return null;
        }
    },
    {
        name: 'minutemail',
        url: 'https://www.minuteinbox.com/',
        getEmail: async (page) => {
            const selectors = [
                '#email', '#email-input', '.email-address', '#address',
                'input#email', '.inbox-email', 'span.email-address', '#emailAddress',
                'input[readonly]', '#userEmail'
            ];
            for (let sel of selectors) {
                try {
                    const el = await page.waitForSelector(sel, { timeout: 5000 });
                    if (el) {
                        const val = await el.inputValue().catch(() => null);
                        if (val && val.includes('@')) return val.trim();
                        const text = await el.textContent();
                        if (text && text.includes('@')) return text.trim();
                    }
                } catch (e) {}
            }
            return null;
        },
        checkInbox: async (page, expectedFrom) => {
            await page.reload({ waitUntil: 'networkidle' });
            await randomDelay(2000, 3000);

            const rowSelectors = [
                '.mail-item', 'tr.mail', '.inbox-item', '.email-row',
                'table tr', '.message-item', 'li.mail', '.inbox-row',
                '.email-list-item', '#inbox tr'
            ];
            for (let sel of rowSelectors) {
                try {
                    const rows = await page.$$(sel);
                    if (rows.length > 0) {
                        await rows[0].click();
                        await randomDelay(2000, 3000);

                        const body = await page.$eval('.mail-body, .message-body, .email-text, .mail-content, #email-body, .inbox-content', el => el.textContent).catch(() => '');
                        if (body) {
                            const codeMatch = body.match(/(\d{4,8})/);
                            if (codeMatch) return { code: codeMatch[1], body: body };

                            const linkMatch = body.match(/https?:\/\/[^\s"'<>]+(verify|confirm|activate)[^\s"'<>]*/i);
                            if (linkMatch) return { link: linkMatch[0], body: body };
                        }
                    }
                } catch (e) {}
            }
            return null;
        }
    }
];

class EmailVerification {
    constructor() {
        this.currentService = null;
        this.currentBrowser = null;
        this.currentPage = null;
        this.currentEmail = null;
    }

    async getTempEmail() {
        const proxyString = getRandomProxy();
        const proxyConfig = getProxyForPlaywright(proxyString);
        const launchOptions = { headless: true };
        if (proxyConfig) launchOptions.proxy = proxyConfig;

        for (let service of TEMP_MAIL_SERVICES) {
            try {
                const browser = await chromium.launch(launchOptions);
                const { context } = await createStealthContext(browser, proxyString);
                const page = await context.newPage();

                await page.goto(service.url, { waitUntil: 'networkidle', timeout: 20000 });
                await randomDelay(3000, 6000);

                const email = await service.getEmail(page);
                if (email) {
                    this.currentService = service;
                    this.currentBrowser = browser;
                    this.currentPage = page;
                    this.currentEmail = email;
                    console.log('[EMAIL] Got temp email from ' + service.name + ': ' + email);
                    return email;
                }

                await browser.close();
            } catch (e) {
                console.log('[EMAIL] Service ' + service.name + ' failed, trying next...');
            }
        }

        return null;
    }

    async waitForVerification(expectedFrom, timeoutMs) {
        if (!this.currentPage || !this.currentService) {
            console.error('[EMAIL] No active email session');
            return null;
        }

        const maxAttempts = Math.ceil((timeoutMs || 120000) / 10000);

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const result = await this.currentService.checkInbox(this.currentPage, expectedFrom);
                if (result) {
                    console.log('[EMAIL] Got verification: ' + (result.code || result.link));
                    return result;
                }
            } catch (e) {}

            console.log('[EMAIL] No email yet, attempt ' + (attempt + 1) + '/' + maxAttempts);
            await randomDelay(8000, 12000);
        }

        return null;
    }

    async clickVerificationLink(link) {
        if (!this.currentPage) return false;

        try {
            await this.currentPage.goto(link, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(3000, 5000);
            console.log('[EMAIL] Clicked verification link: ' + link);
            return true;
        } catch (error) {
            console.error('[EMAIL] Verification link failed: ' + error.message);
            return false;
        }
    }

    async cleanup() {
        if (this.currentBrowser) {
            try {
                await this.currentBrowser.close();
            } catch (e) {}
            this.currentBrowser = null;
            this.currentPage = null;
            this.currentEmail = null;
            this.currentService = null;
        }
    }
}

module.exports = EmailVerification;
