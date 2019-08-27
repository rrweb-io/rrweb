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


