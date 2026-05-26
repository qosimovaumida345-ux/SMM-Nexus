const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
];

const screenResolutions = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1440 },
    { width: 1600, height: 900 },
    { width: 1680, height: 1050 }
];

const languages = ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en'];
const timezones = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin'];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateFingerprint() {
    const ua = pickRandom(userAgents);
    const screen = pickRandom(screenResolutions);
    const lang = pickRandom(languages);
    const tz = pickRandom(timezones);
    
    return {
        userAgent: ua,
        viewport: { width: screen.width, height: screen.height },
        locale: lang,
        timezoneId: tz,
        colorScheme: Math.random() > 0.3 ? 'light' : 'dark',
        deviceScaleFactor: pickRandom([1, 1.25, 1.5, 2]),
        hasTouch: false,
        isMobile: false
    };
}

async function createStealthContext(browser, proxyString) {
    const fingerprint = generateFingerprint();

    const contextOptions = {
        userAgent: fingerprint.userAgent,
        viewport: fingerprint.viewport,
        locale: fingerprint.locale,
        timezoneId: fingerprint.timezoneId,
        colorScheme: fingerprint.colorScheme,
        deviceScaleFactor: fingerprint.deviceScaleFactor,
        hasTouch: fingerprint.hasTouch,
        isMobile: fingerprint.isMobile,
        permissions: ['geolocation'],
        ignoreHTTPSErrors: true
    };

    if (proxyString) {
        const proxyParts = proxyString.split('://');
        if (proxyParts.length === 2) {
            contextOptions.proxy = { server: proxyString };
        }
    }

    const context = await browser.newContext(contextOptions);

    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' }
            ]
        });

        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en']
        });

        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({ state: Notification.permission });
            }
            return originalQuery(parameters);
        };

        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.call(this, parameter);
        };

        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, attributes) {
            const context = originalGetContext.call(this, type, attributes);
            if (type === '2d') {
                const originalGetImageData = context.getImageData;
                context.getImageData = function(...args) {
                    const imageData = originalGetImageData.apply(this, args);
                    for (let i = 0; i < imageData.data.length; i += 100) {
                        imageData.data[i] = imageData.data[i] ^ (Math.random() > 0.5 ? 1 : 0);
                    }
                    return imageData;
                };
            }
            return context;
        };
    });

    return { context, fingerprint };
}

function randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function humanType(page, selector, text) {
    await page.click(selector);
    await randomDelay(200, 500);
    for (let i = 0; i < text.length; i++) {
        await page.type(selector, text[i], { delay: Math.floor(Math.random() * 150) + 50 });
        if (Math.random() > 0.9) {
            await randomDelay(300, 800);
        }
    }
}

async function humanClick(page, selector) {
    const element = await page.waitForSelector(selector, { timeout: 10000 });
    const box = await element.boundingBox();
    if (box) {
        const x = box.x + box.width * (0.3 + Math.random() * 0.4);
        const y = box.y + box.height * (0.3 + Math.random() * 0.4);
        await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
        await randomDelay(100, 300);
        await page.mouse.click(x, y);
    } else {
        await element.click();
    }
}

async function scrollPage(page) {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    await page.mouse.wheel(0, scrollAmount);
    await randomDelay(500, 1500);
}

module.exports = {
    generateFingerprint,
    createStealthContext,
    randomDelay,
    humanType,
    humanClick,
    scrollPage,
    pickRandom,
    userAgents
};
