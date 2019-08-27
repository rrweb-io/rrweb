var isRecording = false;

function StartRecording() {
  if (isRecording) return;
  chrome.tabs.executeScript(
    {
      file: 'dist/rrweb.min.js',
    },
    () => {
      console.log('inserted js');
    },
  );
  chrome.tabs.insertCSS(
    {
      file: 'dist/rrweb.min.css',
    },
    () => {
      console.log('inserted css');
    },
  );
  chrome.tabs.executeScript(
    {
      file: './start.js',
    },
    () => {
      console.log('inserted start js');
    },
  );
  isRecording = true;
  console.log('start Recording');
}

function StopRecording() {
  chrome.tabs.executeScript(
    {
      file: './stop.js',
    },
    () => {
      console.log('inserted stop.js');
    },
  );
  isRecording = false;
  console.log('stop recording');
}

document
  .getElementById('startRecording')
  .addEventListener('click', StartRecording);
document
  .getElementById('stopRecording')
  .addEventListener('click', StopRecording);

// chrome.tabs.execute inject script to detect tab changes

chrome.tabs.executeScript(
  {
    file: './tabvisibility.js',
  },
  () => {
    console.log('injected tab visibility change.js');
  },
);

console.log('inside inject.js');
