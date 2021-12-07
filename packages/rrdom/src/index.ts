import { polyfillPerformance, polyfillRAF, polyfillDocument } from './polyfill';
polyfillPerformance();
polyfillRAF();
polyfillDocument();
export * from './document';
