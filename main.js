const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Support for pkg
const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    (process.pkg
        ? path.join(
            path.dirname(process.execPath),
            'puppeteer',
            ...puppeteer
                .executablePath()
                .split(path.sep)
                .slice(6), // /snapshot/project/node_modules/puppeteer/.local-chromium
        )
        : puppeteer.executablePath());


const enterGiveaway = async function () {
    const browser = await puppeteer.launch({
         args: ['--disable-dev-shm-usage'],
        executablePath: executablePath
    });
    const page = await browser.newPage();

    const cookiePath = path.join(__dirname, 'cookie.txt');
    let cookieValue = fs.readFileSync(cookiePath,'utf8').trim();

    const cookie = [{
        domain: 'www.steamgifts.com',
        "expirationDate": Date.now() / 1000 + 10,
        "httpOnly": true,
        name: 'PHPSESSID',
        path: '/',
        value: cookieValue
    }]

    await page.setCookie(...cookie);
    await page.goto('https://www.steamgifts.com/');

    try {
        await page.waitForSelector('.giveaway__heading');
    } catch (error) {
        console.log(error);
    }

    try {
        await page.evaluate(() => document.querySelector('.nav__points').textContent);
    } catch (e) {
        console.log('Can\'t login. Please check your PHPSESSID cookie value');
        await browser.close();
        return;
    }

    const hrefs = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('.giveaway__heading__name'),
            a => a.getAttribute('href')
        )
    );
    console.log(hrefs);
    const giveawayPage = await browser.newPage();
    for (const item of hrefs) {
        console.log('https://www.steamgifts.com' + item);
        await giveawayPage.goto('https://www.steamgifts.com' + item);
        const currentPoints = await giveawayPage.evaluate(() => document.querySelector('.nav__points').textContent);

        console.log(currentPoints);

        try {
            await giveawayPage.waitFor(1000);
            await giveawayPage.click('.sidebar__entry-insert');
        } catch (e) {
            try {
                const isEntered = await giveawayPage.$('.sidebar__entry-delete');
                if(isEntered) {
                    console.log('You are already participating');
                }
                else {
                    const errorDiv = await giveawayPage.$('.sidebar__error')[0];
                    if (errorDiv.textContent == ' Previously Won') {
                        console.log('You previously won this game');
                    } else {
                        console.log('Not enough points');
                        console.log('Waiting for points');
                        return;
                    }
                }
            } catch (e) {
                console.log(e)
            }
        }
    }
    console.log('Waiting for points');
    await browser.close();
};

module.exports = enterGiveaway;



