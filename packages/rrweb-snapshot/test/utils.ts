import * as puppeteer from 'puppeteer';

export async function waitForRAF(page: puppeteer.Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}
