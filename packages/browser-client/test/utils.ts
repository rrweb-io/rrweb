import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as puppeteer from 'puppeteer';
import * as url from 'url';

export async function launchPuppeteer(
  options?: Parameters<(typeof puppeteer)['launch']>[0],
) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-features=LocalNetworkAccessChecks',
    ...(options?.args ?? []),
  ];

  return await puppeteer.launch({
    headless: process.env.PUPPETEER_HEADLESS ? 'new' : false,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    ...options,
    args,
  });
}

interface IMimeType {
  [key: string]: string;
}

export interface ISuite {
  server: http.Server;
  browser: puppeteer.Browser;
}

export const startServer = (defaultPort: number = 3031) =>
  new Promise<http.Server>((resolve) => {
    const mimeType: IMimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url!);
      const sanitizePath = path
        .normalize(parsedUrl.pathname!)
        .replace(/^(\.\.[/\\])+/, '');

      let pathname = path.join(__dirname, sanitizePath);
      if (/^\/browser-client.*\.c?js.*/.test(sanitizePath)) {
        pathname = path.join(__dirname, `../dist`, sanitizePath);
      }

      try {
        const data = fs.readFileSync(pathname);
        const ext = path.parse(pathname).ext;
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-type');
        setTimeout(() => {
          res.end(data);
        }, 100);
      } catch (error) {
        res.end();
      }
    });
    s.listen(defaultPort)
      .on('listening', () => {
        resolve(s);
      })
      .on('error', () => {
        s.listen().on('listening', () => {
          resolve(s);
        });
      });
  });

export function getServerURL(server: http.Server): string {
  const address = server.address();
  if (address && typeof address !== 'string') {
    return `http://localhost:${address.port}`;
  } else {
    return `${address}`;
  }
}

export function replaceLast(str: string, find: string, replace: string) {
  const index = str.lastIndexOf(find);
  if (index === -1) {
    return str;
  }
  return str.substring(0, index) + replace + str.substring(index + find.length);
}
