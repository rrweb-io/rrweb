import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const startServer = (defaultPort = 3030) =>
  new Promise((resolve) => {
    const mimeType = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
    };
    const s = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url);
      const sanitizePath = path
        .normalize(parsedUrl.pathname)
        .replace(/^(\.\.[\/\\])+/, '');
      let pathname = path.join(__dirname, sanitizePath);
      if (/^\/rrweb.*\.c?js.*/.test(sanitizePath)) {
        pathname = path.join(__dirname, `../dist`, sanitizePath);
      }
      if (/^\/plugins\/.*/.test(sanitizePath)) {
        console.log('sanitizePath', sanitizePath);
        const pluginName = sanitizePath.split('/')[2].replace('.js', '');
        pathname = path.join(
          __dirname,
          `../../plugins/`,
          pluginName,
          `dist/${pluginName}.umd.js`,
        );
        console.log('pathname', pathname);
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
      .on('error', (e) => {
        console.log('port in use, trying next one');
        s.listen().on('listening', () => {
          resolve(s);
        });
      });
  });

export function getServerURL(server) {
  const address = server.address();
  if (address && typeof address !== 'string') {
    return `http://localhost:${address.port}`;
  } else {
    return `${address}`;
  }
}
