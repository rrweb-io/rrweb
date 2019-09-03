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
    /*while (globalValues_t.length) {
        if (globalValues_t[index].blockId === globalInsertionOrder) {
            globalInsertionOrder++;
            var req_vals = globalValues_t.splice(0, 1);
            replayer.convertBufferedEventsToActionsAndAddToTimer(
                req_vals[0].events
            );
            console.log('req_vals replayer are ', req_vals);
        } else {
            globalValues_t.shift();
            //break;
        }
    }*/
}