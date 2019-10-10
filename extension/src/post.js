var backend_url = '';
var create_session = '/apisession/sessions/create';
var update_session = '';
let interval_sec = 5;

// TODO: move this to localStorage
var syncBlockNumber = 0;
var payload_body = {};
var nextBackendScheduleCall = null;
var isDirectCall = null;

function parseJson(body) {
  try {
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
  } catch (err) {
    console.log('error occured in parsing body ', body);
  }
  return body;
}

function buildURLs(sessionId) {
  backend_url = `/apisession/sessions/${sessionId}/events`;
  update_session = `/apisession/sessions/${sessionId}/update`;
}

// createSessionAndStoreItInLocationStorage
function createSession() {
  return fetch(create_session, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(data => data.json())
    .then(data => {
      // clear the existing localstorage
      window.localStorage.clear();
      window.localStorage.setItem('sessionId', parseJson(data).sessionId);
      buildURLs(window.localStorage.getItem('sessionId'));
      return data;
    });
}

// populates both startTime and endTime
// calculates eventLengthTime
//
function buildPayload() {
  payload_body = {};
  payload_body.events = events;
  events = [];
  payload_body.blockId = window.localStorage.getItem('currentBlockNumber') || 0;
  // payload --> send offsetStartTime and offsetEndTime
  // event --> delay, what does event.delay signify...

  // since we cleared events object, setStartTime
  var eventLengthTime = window.performance.now() - window.localStorage.getItem('startTime');
  payload_body.eventLengthTime = eventLengthTime;
  payload_body.offsetTime = parseFloat(window.localStorage.getItem('playerTime')) + eventLengthTime;
  payload_body.startEventTime = window.localStorage.getItem('startTime');
  payload_body.endEventTime = window.localStorage.getItem('endTime');
  // set new payload startTime
  window.localStorage.setItem(
    'playerTime',
    parseFloat(window.localStorage.getItem('playerTime')) + payload_body.eventLengthTime,
  );
  window.localStorage.setItem('startTime', performance.now());
  window.localStorage.setItem('endTime', 0);
  console.log('payload');
}

function postMetaData() {
  console.log('post metadata is ');
  var payloadBody = {};
  var totalNumberOfBlocks = window.localStorage.getItem('currentBlockNumber');
  payloadBody.totalNumberOfBlocks = totalNumberOfBlocks;
  fetch(update_session, {
    method: 'PUT',
    body: JSON.stringify(payloadBody),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(data => data.json());
}

function postToBackend_v1(isDirectCall = false) {
  if (isDirectCall) {
    clearTimeout(nextBackendScheduleCall);
  }
  buildPayload();
  const body = JSON.stringify(payload_body);
  fetch(backend_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });
  nextBackendScheduleCall = setTimeout(postToBackend_v1, interval_sec * 1000);
  // blockNumber always exits
  let currentBlockNumber = window.localStorage.getItem('currentBlockNumber');
  currentBlockNumber++;
  window.localStorage.setItem('currentBlockNumber', currentBlockNumber);
}

// using indexedDB
// observerAPI for indexedDB supported by dixieJS
// insert event data into the indexedDB
// use webworker to upload that data.
// using indexedDB
function postToBackend_v2() {}
