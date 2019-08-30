console.log('inside start js');
console.log('rrweb is ', rrweb);

var events = [];
window.__IS_RECORDING__ = true;

function pushEvents(event) {
  events.push(event);
}

// var stopFn = rrweb.record({
// emit: event => pushEvents(event)
// });

var stopFn = null;
createSession().then(data => {
  console.log('starting absolutely recording ', data);
  stopFn = rrweb.record({
    emit: event => pushEvents(event),
  });
  // setting playerTime in localStorage
  // for tab change TODO: add a condition to check if localStorage exists
  window.localStorage.setItem('playerTime', 0);
  window.localStorage.setItem('startTime', window.performance.now());
  window.localStorage.setItem('endTime', window.performance.now());
  postToBackend_v1();
});
