var vis = (function() {
  var stateKey,
    eventKey,
    keys = {
      hidden: 'visibilitychange',
      webkitHidden: 'webkitvisibilitychange',
      mozHidden: 'mozvisibilitychange',
      msHidden: 'msvisibilitychange',
    };
  for (stateKey in keys) {
    if (stateKey in document) {
      eventKey = keys[stateKey];
      break;
    }
  }
  return function(c) {
    if (c) document.addEventListener(eventKey, c);
    return !document[stateKey];
  };
})();

// var visible = vis();
window.dummyVar = 0;
vis(() => {
  window.dummyVar++;
  console.log('current state of the browser is ', window.location.href, window.dummyVar);
});

function confirmExit() {
  return 'confirm exit';
}

window.onbeforeunload = confirmExit;

// use visibilitychange api for focus
