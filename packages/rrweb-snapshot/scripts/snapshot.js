/*
 Usage: node scripts/snapshot.js 'https://example.com/whatever' [optional-output.json]
 Some pages will load resources lazily, so it makes sense to scroll the page a bit,
 to collect all the resources in the snapshot.
*/
const fs = require('fs');
const puppeteer = require('puppeteer');

// assume that rrWeb script is in this folder
const rrWeb = './dist/rrweb-snapshot.js';
const url = process.argv[2];
const out = process.argv[3] || 'rrweb-snapshot.json';

const PAGE_TIMEOUT = 25000;
const PAGE_DELAY = 2500;
const IMG_LOAD_TIMEOUT = 5000;

function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

(async function main() {
    const browser = await puppeteer.launch({
        args: [
            '--disable-breakpad',
            '--disable-default-apps',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-full-history-sync',
            '--disable-notifications',
            '--disable-renderer-backgrounding',
            '--disable-site-isolation-trials',
            '--disable-speech-api',
            '--disable-translate',
            '--disable-web-security',
            '--ignore-gpu-blacklist',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-pings',
            '--start-maximized',
        ],
        defaultViewport: null,
        headless: false,
    });

    browser.on('disconnected', process.exit);
    const page = await browser.newPage();
    page.on('console', (msg) => console.log(`CONSOLE ${msg.type()} :: ${msg.text()}`));
    const rrCode = await fs.promises.readFile(rrWeb, { encoding: 'utf8' });

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: PAGE_TIMEOUT });
        await delay(PAGE_DELAY);
    } catch (err) {
        console.error(err);
        await browser.close();
        return;
    }

    // hack all images with img.crossOrigin="anonymous" before calling snapshot
    // this is MANDATORY to capture images from websites that host images on CDNs
    await page.evaluate((timeout) => {
        const selectors = Array.from(document.getElementsByTagName('img'));
        const reloadP = Promise.allSettled(
            selectors.map((img) => {
                const p = new Promise((resolve, reject) => {
                    img.addEventListener('load', () => {
                        console.log(`re-loaded <img src=${img.currentSrc}>`);
                        resolve(true);
                    });
                    img.addEventListener('error', reject);
                });
                img.loading = 'eager';
                img.crossOrigin = 'anonymous';
                return p;
            }),
        );
        return Promise.race([
            reloadP,
            new Promise((resolve) => {
                setTimeout(() => {
                    resolve('Timed out!');
                }, timeout);
            }),
        ]);
    }, IMG_LOAD_TIMEOUT);

    const snapshot = await page.evaluate(function (rrCode) {
        console.log('Taking the snaphot...');
        eval(rrCode);
        return JSON.stringify(
            rrwebSnapshot.snapshot(document, {
                recordCanvas: true,
                inlineImages: true,
                inlineStylesheet: true,
                dataURLOptions: { type: 'image/webp', quality: 0.8 },
            })[0],
        );
    }, rrCode);

    await fs.promises.writeFile(out, snapshot, { encoding: 'utf8' });
    console.log(`Output file: "${out}" was saved`);

    await browser.close();
})();
