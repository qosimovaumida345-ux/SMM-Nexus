const { chromium } = require('playwright');
const { createStealthContext, randomDelay } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const axios = require('axios');

const TEMP_PHONE_SERVICES = [
    {
        name: 'receive-smss',
        listUrl: 'https://receive-smss.com/',
        numberSelector: 'a.number-boxes-itemm-number',
        messageSelector: '.msg_body',
        parseNumbers: async (page) => {
            const numbers = await page.$$eval('a.number-boxes-item-number, .number-boxes1 a, .row a[href*="sms"], .phone-number-item a, a[href*="phone-number"]', els => {
                return els.map(el => ({
                    number: el.textContent.trim().replace(/\s/g, ''),
                    link: el.href
                }));
            }).catch(() => []);
            return numbers;
        }
    },
    {
        name: 'temp-number',
        listUrl: 'https://temp-number.com/countries',
        parseNumbers: async (page) => {
            const numbers = await page.$$eval('.number-list a, .phone-item a, a[href*="number"], .card a[href*="temp"]', els => {
                return els.map(el => ({
                    number: el.textContent.trim().replace(/\s/g, ''),
                    link: el.href
                }));
            }).catch(() => []);
            return numbers;
        }
    },
    {
        name: 'freephonenum',
        listUrl: 'https://freephonenum.com/',
        parseNumbers: async (page) => {
            const numbers = await page.$$eval('.phone-number a, .number a, a[href*="phone"], .col-md a[href*="num"], a.btn[href*="phone"]', els => {
                return els.map(el => ({
                    number: el.textContent.trim().replace(/\s/g, ''),
                    link: el.href
                }));
            }).catch(() => []);
            return numbers;
        }
    },
    {
        name: 'online-sms',
        listUrl: 'https://www.receivesms.co/',
        parseNumbers: async (page) => {
            const numbers = await page.$$eval('.number-boxes a, .number-list a, a[href*="receive"], .phone a, a.btn-outline-primary', els => {
                return els.map(el => ({
                    number: el.textContent.trim().replace(/\s/g, ''),
                    link: el.href
                }));
            }).catch(() => []);
            return numbers;
        }
    },
    {
        name: 'sms24',
        listUrl: 'https://sms24.me/en',
        parseNumbers: async (page) => {
            const numbers = await page.$$eval('.number-list a, .number a, a.number-card, .phone-item a, a[href*="number"]', els => {
                return els.map(el => ({
                    number: el.textContent.trim().replace(/\s/g, ''),
                    link: el.href
                }));
            }).catch(() => []);
            return numbers;
        }
    }
];

class PhoneVerification {
    constructor() {
        this.usedNumbers = new Set();
    }

    async getTemporaryNumber() {
        const proxyString = getRandomProxy();
        const proxyConfig = getProxyForPlaywright(proxyString);
        const launchOptions = { headless: true };
        if (proxyConfig) launchOptions.proxy = proxyConfig;

        let browser;
        try {
            browser = await chromium.launch(launchOptions);
            const { context } = await createStealthContext(browser, proxyString);
            const page = await context.newPage();

            for (let service of TEMP_PHONE_SERVICES) {
                try {
                    await page.goto(service.listUrl, { waitUntil: 'networkidle', timeout: 20000 });
                    await randomDelay(2000, 4000);

                    const numbers = await service.parseNumbers(page);

                    for (let numData of numbers) {
                        if (numData.number && numData.number.length >= 10 && !this.usedNumbers.has(numData.number)) {
                            this.usedNumbers.add(numData.number);
                            console.log('[PHONE] Got temp number from ' + service.name + ': ' + numData.number);
                            await browser.close();
                            return {
                                number: numData.number,
                                link: numData.link,
                                service: service.name
                            };
                        }
                    }
                } catch (e) {
                    console.log('[PHONE] Service ' + service.name + ' failed, trying next...');
                }
            }

            await browser.close();
            return null;
        } catch (error) {
            console.error('[PHONE] Failed to get temp number: ' + error.message);
            if (browser) await browser.close();
            return null;
        }
    }

    async waitForSMS(phoneData, expectedFrom, timeoutMs) {
        const proxyString = getRandomProxy();
        const proxyConfig = getProxyForPlaywright(proxyString);
        const launchOptions = { headless: true };
        if (proxyConfig) launchOptions.proxy = proxyConfig;

        let browser;
        try {
            browser = await chromium.launch(launchOptions);
            const { context } = await createStealthContext(browser, proxyString);
            const page = await context.newPage();

            const maxAttempts = Math.ceil((timeoutMs || 120000) / 10000);

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                await page.goto(phoneData.link, { waitUntil: 'networkidle', timeout: 20000 });
                await randomDelay(2000, 4000);

                const messageSelectors = [
                    '.msg_body', '.message-body', '.sms-text', '.message-text',
                    'td.msg_body', '.inbox-message', '.sms-content', '.message-content',
                    'table.table td:last-child', '.message-item p'
                ];

                for (let sel of messageSelectors) {
                    try {
                        const messages = await page.$$eval(sel, (els, fromFilter) => {
                            return els.map(el => el.textContent.trim()).filter(text => {
                                if (fromFilter) {
                                    return text.toLowerCase().includes(fromFilter.toLowerCase());
                                }
                                return true;
                            });
                        }, expectedFrom || '');

                        if (messages.length > 0) {
                            const latestMessage = messages[0];
                            const codeMatch = latestMessage.match(/(\d{4,8})/);
                            if (codeMatch) {
                                console.log('[PHONE] Got verification code: ' + codeMatch[1]);
                                await browser.close();
                                return {
                                    code: codeMatch[1],
                                    fullMessage: latestMessage
                                };
                            }
                        }
                    } catch (e) {}
                }

                console.log('[PHONE] No SMS yet, attempt ' + (attempt + 1) + '/' + maxAttempts);
                await randomDelay(8000, 12000);
            }

            await browser.close();
            return null;
        } catch (error) {
            console.error('[PHONE] SMS wait failed: ' + error.message);
            if (browser) await browser.close();
            return null;
        }
    }
}

module.exports = PhoneVerification;
