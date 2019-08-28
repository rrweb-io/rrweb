console.log('inside stop.js');

// stop the rrweb recording and download html

// stop rrweb recording

if (stopFn && typeof stopFn === 'function') {
  stopFn();
  buildPayload(true);
  // TODO: look why we need setTimeout even in the case of stopping, isDirectCall
  clearTimeout(nextBackendScheduleCall);
  postMetaData();
}

var time = new Date()
  .toISOString()
  .replace(/[-|:]/g, '_')
  .replace(/\..+/, '');

var fileName = `replay_${time}.html`;
var content = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>Record @${time}</title>
    <link rel="stylesheet" href="http://localhost:8887/dist/rrweb.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/style.css" />
    <script src="https://cdn.jsdelivr.net/npm/rrweb-player@latest/dist/index.js"></script>
  </head>
  <body>
    <script src="http://localhost:8887/dist/rrweb.min.js"></script>
    <script>
      /*<!--*/
      const events = ${JSON.stringify(events).replace(
        /<\/script>/g,
        '<\\/script>',
      )};
      /*-->*/
      new rrwebPlayer({
        target: document.body, // customizable root element
        data: {
          events,
          autoPlay: true,
        },
      });
    </script>
  </body>
</html>
    `;

// const replayer = new rrweb.Replayer(events);
// replayer.play();

function download(text, name, type) {
  var a = document.createElement('a');
  var file = new Blob([text], { type: type });
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
}

download(content, `replay_${time}.html`, 'text/html');
