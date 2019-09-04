import { Replayer } from '../sessionlibs/rrweb.js';
var replayer = null;
var rootIframeId = 'jankay';
var isPlaying = false;

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
        replayer = new Replayer(nextEvent.events, {
          showWarning: true,
          root: document.getElementById(rootIframeId),
        });
      } else {
        if (!isPlaying) {
          isPlaying = true;
          replayer.play();
        }
        replayer.convertBufferedEventsToActionsAndAddToTimer(nextEvent.events);
      }
    }
  }
  return { lastConcatedIndex };
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
