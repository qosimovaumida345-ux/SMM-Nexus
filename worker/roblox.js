const { chromium } = require('playwright');
const { createStealthContext, randomDelay, humanType, humanClick, scrollPage } = require('./stealth');
const { getRandomProxy, getProxyForPlaywright } = require('./proxy-manager');
const { generateCompleteIdentity } = require('./names');

class RobloxAutomation {
    constructor(socket) {
        this.socket = socket;
        this.platformName = 'roblox';
    }

    async tryClickOne(page, selectors, timeout) {
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = await page.waitForSelector(selectors[i], { timeout: timeout || 3000 });
                if (el) {
                    await el.click();
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    async tryFillOne(page, selectors, value, timeout) {
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = await page.waitForSelector(selectors[i], { timeout: timeout || 3000 });
                if (el) {
                    await el.fill('');
                    await humanType(page, selectors[i], value);
                    return true;
                }
            } catch (e) {}
        }
        return false;
    }

    async trySelectOne(page, selectors, value, timeout) {
        for (let i = 0; i < selectors.length; i++) {
            try {
                const el = await page.waitForSelector(selectors[i], { timeout: timeout || 3000 });
                if (el) {
                    await el.selectOption(value);
                    return true;
                }
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
                await page.goto('https://www.roblox.com/home', { waitUntil: 'networkidle', timeout: 30000 });
                await randomDelay(2000, 4000);
                const loggedIn = await page.$('.age-bracket-label, .avatar-card-link, #navbar-username, [class*="avatar"], .rbx-navbar');
                if (loggedIn) return true;
            } catch (e) {}
        }

        await page.goto('https://www.roblox.com/login', { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay(1500, 3000);

        const usernameSelectors = [
            '#login-username',
            'input[name="username"]',
            'input[name="loginValue"]',
            '#loginUsername',
            'input[placeholder*="Username"]',
            'input[placeholder*="username"]',
            'input[placeholder*="Email"]',
            'input[data-testid="login-username"]',
            '.login-form input[type="text"]',
            'form input[type="text"]:first-child'
        ];

        const passwordSelectors = [
            '#login-password',
            'input[name="password"]',
            '#loginPassword',
            'input[placeholder*="Password"]',
            'input[placeholder*="password"]',
            'input[type="password"]',
            'input[data-testid="login-password"]',
            '.login-form input[type="password"]',
            'form input[type="password"]',
            'input[autocomplete="current-password"]'
        ];

        const loginButtonSelectors = [
            '#login-button',
            'button[type="submit"]',
            'button:has-text("Log In")',
            'button:has-text("Login")',
            'button:has-text("Sign In")',
            '.login-button',
            '[data-testid="login-button"]',
            'button.btn-primary-md',
            'button.auth-button',
            'form button:last-child'
        ];

        await this.tryFillOne(page, usernameSelectors, accountData.username);
        await randomDelay(500, 1000);
        await this.tryFillOne(page, passwordSelectors, accountData.password);
        await randomDelay(500, 1000);
        await this.tryClickOne(page, loginButtonSelectors);
        await randomDelay(4000, 7000);

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

            await page.goto('https://www.roblox.com/', { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 5000);

            const monthSelectors = [
                '#MonthDropdown',
                '#BirthdayMonth',
                'select[id*="month" i]',
                'select[name*="month" i]',
                '#birthdayMonthSelect',
                'select[data-testid="month-dropdown"]',
                '.birthday-select:nth-child(1)',
                'select.form-control:nth-of-type(1)',
                '#signup-birthday-month',
                'form select:first-of-type'
            ];

            const daySelectors = [
                '#DayDropdown',
                '#BirthdayDay',
                'select[id*="day" i]',
                'select[name*="day" i]',
                '#birthdayDaySelect',
                'select[data-testid="day-dropdown"]',
                '.birthday-select:nth-child(2)',
                'select.form-control:nth-of-type(2)',
                '#signup-birthday-day',
                'form select:nth-of-type(2)'
            ];

            const yearSelectors = [
                '#YearDropdown',
                '#BirthdayYear',
                'select[id*="year" i]',
                'select[name*="year" i]',
                '#birthdayYearSelect',
                'select[data-testid="year-dropdown"]',
                '.birthday-select:nth-child(3)',
                'select.form-control:nth-of-type(3)',
                '#signup-birthday-year',
                'form select:last-of-type'
            ];

            await this.trySelectOne(page, monthSelectors, { value: identity.birthday.month.toString() });
            await randomDelay(400, 800);
            await this.trySelectOne(page, daySelectors, { value: identity.birthday.day.toString() });
            await randomDelay(400, 800);
            await this.trySelectOne(page, yearSelectors, { value: identity.birthday.year.toString() });
            await randomDelay(600, 1200);

            const usernameSelectors = [
                '#signup-username',
                '#UsernameTextBox',
                'input[name="signupUsername"]',
                'input[name="username"]',
                'input[placeholder*="Username"]',
                'input[placeholder*="username"]',
                'input[data-testid="signup-username"]',
                '#signupUsername',
                '.signup-form input[type="text"]',
                'form input[type="text"]:last-of-type'
            ];

            const passwordSelectors = [
                '#signup-password',
                '#PasswordTextBox',
                'input[name="signupPassword"]',
                'input[name="password"]',
                'input[placeholder*="Password"]',
                'input[placeholder*="password"]',
                'input[type="password"]',
                'input[data-testid="signup-password"]',
                '#signupPassword',
                '.signup-form input[type="password"]'
            ];

            await this.tryFillOne(page, usernameSelectors, identity.username, 5000);
            await randomDelay(800, 1500);
            await this.tryFillOne(page, passwordSelectors, identity.password, 5000);
            await randomDelay(500, 1000);

            const genderSelectors = [
                '#MaleButton',
                '#FemaleButton',
                '#gender-male',
                '#gender-female',
                'button[data-gender="male"]',
                'button[data-gender="female"]',
                '.gender-button:first-child',
                '.gender-button:last-child',
                '[data-testid="gender-male"]',
                '[data-testid="gender-female"]'
            ];

            const randomGenderIndex = Math.floor(Math.random() * 2);
            const genderToTry = randomGenderIndex === 0
                ? [genderSelectors[0], genderSelectors[2], genderSelectors[4], genderSelectors[6], genderSelectors[8]]
                : [genderSelectors[1], genderSelectors[3], genderSelectors[5], genderSelectors[7], genderSelectors[9]];
            await this.tryClickOne(page, genderToTry);
            await randomDelay(500, 1000);

            const signupButtonSelectors = [
                '#signup-button',
                '#SignupButton',
                'button[type="submit"]',
                'button:has-text("Sign Up")',
                'button:has-text("Register")',
                'button:has-text("Create Account")',
                '.signup-submit-button',
                '[data-testid="signup-button"]',
                'button.auth-button',
                '.signup-form button'
            ];

            await this.tryClickOne(page, signupButtonSelectors, 5000);
            await randomDelay(6000, 12000);

            const cookies = await context.cookies();
            const cookieString = JSON.stringify(cookies);

            const accountData = {
                platform: this.platformName,
                username: identity.username,
                email: identity.email,
                password: identity.password,
                displayName: identity.displayName,
                firstName: identity.firstName,
                lastName: identity.lastName,
                birthday: identity.birthday,
                userAgent: fingerprint.userAgent,
                cookies: cookieString
            };

            if (this.socket) {
                this.socket.emit('account-created', accountData);
            }

            console.log('[ROBLOX] Account created: ' + identity.username);
            await browser.close();
            return accountData;
        } catch (error) {
            console.error('[ROBLOX] Account creation failed: ' + error.message);
            if (browser) await browser.close();
            return null;
        }
    }

    async followUser(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://www.roblox.com/search/users?keyword=' + encodeURIComponent(targetUsername), {
                waitUntil: 'networkidle', timeout: 30000
            });
            await randomDelay(2000, 4000);

            const userLinkSelectors = [
                'a.avatar-card-link',
                'a[href*="/users/"]',
                '.avatar-card a',
                '.people-list a',
                '.search-results a[href*="profile"]',
                'a.user-search-result',
                '.search-user-card a',
                'a[class*="avatar"]',
                '.user-item a',
                '.search-result-card a'
            ];

            await this.tryClickOne(page, userLinkSelectors, 5000);
            await randomDelay(2000, 5000);

            const followSelectors = [
                'button:has-text("Follow")',
                'button.btn-follow',
                'button[data-action="follow"]',
                '.follow-button',
                '#follow-button',
                'button[class*="follow"]',
                '[data-testid="follow-button"]',
                'button.btn-growth-sm:has-text("Follow")',
                'span:has-text("Follow")',
                'a:has-text("Follow")'
            ];

            const clicked = await this.tryClickOne(page, followSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Followed: ' + targetUsername + ' from: ' + accountData.username);
            }

            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Follow failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async addFriend(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://www.roblox.com/search/users?keyword=' + encodeURIComponent(targetUsername), {
                waitUntil: 'networkidle', timeout: 30000
            });
            await randomDelay(2000, 4000);

            const userLinkSelectors = [
                'a.avatar-card-link', 'a[href*="/users/"]', '.avatar-card a',
                '.people-list a', '.search-results a[href*="profile"]',
                'a.user-search-result', '.search-user-card a',
                'a[class*="avatar"]', '.user-item a', '.search-result-card a'
            ];

            await this.tryClickOne(page, userLinkSelectors, 5000);
            await randomDelay(2000, 4000);

            const friendSelectors = [
                'button:has-text("Add Friend")',
                'button[data-action="friend"]',
                '.friend-button',
                '#friend-button',
                'button:has-text("Friend")',
                'button[class*="friend"]',
                '[data-testid="friend-button"]',
                'button.btn-friend',
                'span:has-text("Add Friend")',
                'a:has-text("Add Friend")'
            ];

            const clicked = await this.tryClickOne(page, friendSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Friend request sent to: ' + targetUsername);
            }
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Friend request failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async likeGame(gameUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const likeSelectors = [
                'button.vote-up-btn',
                'button[title="Like"]',
                'button[id*="vote-up"]',
                '.voting-panel button:first-child',
                'button[data-vote="up"]',
                'button:has-text("Like")',
                '.thumbs-up-btn',
                '[data-testid="vote-up"]',
                'button[class*="like"]',
                '.rating-container button:first-child'
            ];

            const clicked = await this.tryClickOne(page, likeSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Liked game: ' + gameUrl);
            }
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Like game failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async joinGroup(groupUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto(groupUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const joinSelectors = [
                'button:has-text("Join Group")',
                'button:has-text("Join")',
                'button.group-join-btn',
                '#join-group-btn',
                'button[data-action="join"]',
                '.group-action-button:has-text("Join")',
                '[data-testid="join-group"]',
                'button[class*="join"]',
                '.group-details button:has-text("Join")',
                'a:has-text("Join Group")'
            ];

            const clicked = await this.tryClickOne(page, joinSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Joined group: ' + groupUrl);
            }
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Join group failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async favoriteGame(gameUrl, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const favoriteSelectors = [
                'button:has-text("Favorite")',
                'button.favorite-btn',
                '#favorite-button',
                'button[title="Favorite"]',
                'button[data-action="favorite"]',
                'button[class*="favorite"]',
                '[data-testid="favorite-button"]',
                '.game-favorite-button',
                'span:has-text("Favorite")',
                '.action-buttons button:nth-child(2)'
            ];

            const clicked = await this.tryClickOne(page, favoriteSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Favorited game: ' + gameUrl);
            }
            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Favorite failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async playGame(gameUrl, accountData, durationMs) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 30000 });
            await randomDelay(2000, 4000);

            const playSelectors = [
                'button:has-text("Play")',
                'button.game-play-button',
                '#game-play-button',
                'button[data-action="play"]',
                'a:has-text("Play")',
                'button[class*="play"]',
                '[data-testid="play-button"]',
                '.game-details button:has-text("Play")',
                'button.btn-primary-lg:has-text("Play")',
                '.game-action-button'
            ];

            const clicked = await this.tryClickOne(page, playSelectors, 5000);
            if (clicked) {
                console.log('[ROBLOX] Playing game: ' + gameUrl);
                await randomDelay(durationMs || 30000, (durationMs || 30000) + 5000);
            }
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Play failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async reportUser(targetUsername, accountData) {
        const proxyString = getRandomProxy();
        let browser, context, page;
        try {
            const session = await this.openBrowser(proxyString);
            browser = session.browser;
            context = session.context;
            page = session.page;

            await this.loginWithAccount(page, context, accountData);

            await page.goto('https://www.roblox.com/search/users?keyword=' + encodeURIComponent(targetUsername), {
                waitUntil: 'networkidle', timeout: 30000
            });
            await randomDelay(2000, 4000);

            const userLinkSelectors = [
                'a.avatar-card-link', 'a[href*="/users/"]', '.avatar-card a',
                '.people-list a', '.search-results a[href*="profile"]',
                'a.user-search-result', '.search-user-card a',
                'a[class*="avatar"]', '.user-item a', '.search-result-card a'
            ];

            await this.tryClickOne(page, userLinkSelectors, 5000);
            await randomDelay(2000, 4000);

            const moreSelectors = [
                'button:has-text("...")',
                'button.more-btn',
                '#more-button',
                'button[title="More"]',
                'button.dropdown-toggle',
                '.more-actions-button',
                'button[class*="more"]',
                '[data-testid="more-options"]',
                '.profile-actions button:last-child',
                'button[aria-label="More"]'
            ];

            await this.tryClickOne(page, moreSelectors, 3000);
            await randomDelay(1000, 2000);

            const reportSelectors = [
                'a:has-text("Report Abuse")',
                'button:has-text("Report")',
                'a:has-text("Report")',
                'li:has-text("Report") a',
                '#report-abuse',
                '.report-button',
                '[data-action="report"]',
                'button[class*="report"]',
                '[data-testid="report-user"]',
                '.dropdown-menu a:has-text("Report")'
            ];

            const clicked = await this.tryClickOne(page, reportSelectors, 5000);
            if (clicked) {
                await randomDelay(1000, 2000);

                const reasonSelectors = [
                    'select#report-category',
                    'select[name="reason"]',
                    'select.report-reason',
                    '#report-reason-dropdown',
                    'select[data-testid="report-reason"]',
                    '.report-form select',
                    'select:first-of-type',
                    '#abuseType',
                    'select[id*="report"]',
                    'select[name*="report"]'
                ];

                await this.trySelectOne(page, reasonSelectors, { index: 1 });
                await randomDelay(500, 1000);

                const submitSelectors = [
                    'button:has-text("Submit")',
                    'button[type="submit"]',
                    '.report-form button',
                    '#submit-report',
                    'button.btn-primary:has-text("Submit")',
                    '[data-testid="submit-report"]',
                    'button[class*="submit"]',
                    '.modal-footer button:has-text("Submit")',
                    'button:has-text("Report")',
                    'form button:last-child'
                ];

                await this.tryClickOne(page, submitSelectors, 5000);
                console.log('[ROBLOX] Reported user: ' + targetUsername);
            }

            await randomDelay(1000, 3000);
            await browser.close();
            return clicked;
        } catch (error) {
            console.error('[ROBLOX] Report failed: ' + error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    async executeTask(task, accounts) {
        let successCount = 0;
        const needed = task.quantity;

        for (let i = 0; i < needed; i++) {
            let account = accounts[i % accounts.length];
            if (!account) {
                account = await this.createAccount();
                if (!account) continue;
                accounts.push(account);
            }

            let result = false;
            switch (task.service) {
                case 'followers':
                    result = await this.followUser(task.target, account);
                    break;
                case 'friends':
                    result = await this.addFriend(task.target, account);
                    break;
                case 'likes':
                    result = await this.likeGame(task.target, account);
                    break;
                case 'plays':
                    result = await this.playGame(task.target, account, 30000);
                    break;
                case 'favorites':
                    result = await this.favoriteGame(task.target, account);
                    break;
                case 'group_joins':
                    result = await this.joinGroup(task.target, account);
                    break;
                case 'reports':
                    result = await this.reportUser(task.target, account);
                    break;
            }

            if (result) {
                successCount++;
                if (this.socket) {
                    this.socket.emit('task-progress', { orderId: task.orderId, amount: 1 });
                }
            }

            await randomDelay(3000, 8000);
        }

        return successCount;
    }
}

module.exports = RobloxAutomation;
