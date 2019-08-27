function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
const sessionId = uuidv4();
let snapshots = [];

console.log("start recording");
// rrwebRecord({
//   emit: event => {
//     event.sessionId = sessionId;
//     snapshots.push(event);
//   }
// });

// function save() {
//   const body = JSON.stringify({
//     events: snapshots
//   });
//   snapshots = [];
//   fetch("http://192.168.17.205:9090/api/events", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body
//   });
// }
// setInterval(save, 5 * 1000);
// window.addEventListener('beforeunload', save);
