import {
  polyfillPerformance,
  polyfillRAF,
  polyfillEvent,
  polyfillNode,
  polyfillDocument,
} from './polyfill';
polyfillPerformance();
polyfillRAF();
polyfillEvent();
polyfillNode();
polyfillDocument();
export * from './document';
