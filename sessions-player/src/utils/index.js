import { Replayer } from '../sessionlibs/rrweb.js';
var replayer = null;
var rootIframeId = 'jankay';
var isPlaying = false;
var baseLineTime = 0;
var lastPlayedTime = 0;

export function sortContinously({ globalValues, replayer }) {
  if (!replayer) {
    return null;
  }

  var globalValues_t = globalValues.slice();
  globalValues_t.sort((a, b) => {
    return a.blockId - b.blockId;
  });
  // removing duplicates
  var uniqueValues = {};
  globalValues_t = globalValues_t.filter(valObj => {
    if (uniqueValues.hasOwnProperty(valObj.blockId)) {
      return false;
    }
    uniqueValues[valObj.blockId] = 1;
    return true;
  });
  var index = 0;
  while (globalValues_t.length) {
    if (globalValues_t[index].blockId === globalInsertionOrder) {
      globalInsertionOrder++;
      var req_vals = globalValues_t.splice(0, 1);
      replayer.convertBufferedEventsToActionsAndAddToTimer(req_vals[0].events);
      console.log('req_vals replayer are ', req_vals);
    } else {
      globalValues_t.shift();
      //break;
    }
  }
}

export function concatEventsData(values, initialValue = []) {
  return values.reduce((accumulator, currentValue) => {
    accumulator = accumulator.concat(currentValue.events);
    return accumulator;
  }, initialValue);
}

export function cleanAndAddData({ globalValues, lastConcatedIndex }) {
  var globalValues_t = globalValues.slice();
  globalValues_t = removeDuplicates({ globalValues: globalValues_t });
  globalValues_t = sortByBlockId({ globalValues: globalValues_t });
  while (globalValues_t.length) {
    var nextEvent = globalValues_t.shift();
    console.log('nextEvent is ', nextEvent, lastConcatedIndex);
    if (nextEvent.blockId === lastConcatedIndex) {
      lastConcatedIndex++;
      if (!replayer) {
        window.replayer = replayer = new Replayer(nextEvent.events, {
          showWarning: true,
          root: document.getElementById(rootIframeId),
        });
        baseLineTime = nextEvent.events[0].timestamp;
      } else {
        if (!isPlaying) {
          play();
        }
        replayer.convertBufferedEventsToActionsAndAddToTimer(nextEvent.events);
      }
    }
  }
  return { lastConcatedIndex };
}

export function play() {
  if (!replayer || isPlaying) {
    return true;
  }
  isPlaying = true;
  replayer.play();
  return true;
}

export function resume() {
  if (!replayer || isPlaying) {
    return true;
  }
  console.log('replayer and isplaying in resume are ', replayer, isPlaying);
  isPlaying = true;
  // replayer.resume();
  replayer.customResume();
  return true;
}

export function stop() {
  if (!replayer || !isPlaying) {
    return false;
  }
  isPlaying = false;
  // replayer.pause();
  replayer.customPause();
  lastPlayedTime = replayer.lastPlayedEvent.timestamp;
  return false;
}

export function removeDuplicates({ globalValues }) {
  var uniqueValues = {};
  return globalValues.filter(valObj => {
    if (uniqueValues.hasOwnProperty(valObj.blockId)) {
      return false;
    }
    uniqueValues[valObj.blockId] = 1;
    return true;
  });
}

export function sortByBlockId({ globalValues }) {
  return globalValues.sort((a, b) => {
    return a.blockId - b.blockId;
  });
}
