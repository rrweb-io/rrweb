import * as puppeteer from 'puppeteer';
import * as http from 'http';

export async function waitForRAF(page: puppeteer.Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });
  });
}

export function getServerURL(server: http.Server): string {
  const address = server.address();
  if (address && typeof address !== 'string') {
    return `http://localhost:${address.port}`;
  } else {
    return `${address}`;
  }
}
