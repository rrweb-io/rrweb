/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved,
                  no-underscore-dangle, no-console */

const { ipcRenderer } = require('electron');

process.once('loaded', () => {
  console.log('loaded electron-inject.js');
});

const record = require('rrweb/record').default;

window.__IS_RECORDING__ = true;

record({
  emit: (event) => {
    console.log(event);

    const message = {
      event,
      window: {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
      },
    };
    ipcRenderer.send('recordedEvent', JSON.stringify(message));
  },
  recordCanvas: true,
  collectFonts: true,
  maskInputOptions: {
    password: true,
  },
  sampling: {
    mousemove: false,
  },
});