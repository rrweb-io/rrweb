import { MARK } from './base.js';
import { inflate as pako_inflate_1 } from '../../node_modules/pako/dist/pako_inflate.js';

var unpack = function (raw) {
    if (typeof raw !== 'string') {
        return raw;
    }
    try {
        var e = JSON.parse(raw);
        if (e.timestamp) {
            return e;
        }
    }
    catch (error) {
    }
    try {
        var e = JSON.parse(pako_inflate_1(raw, { to: 'string' }));
        if (e.v === MARK) {
            return e;
        }
        throw new Error("These events were packed with packer " + e.v + " which is incompatible with current packer " + MARK + ".");
    }
    catch (error) {
        console.error(error);
        throw new Error('Unknown data format.');
    }
};

export { unpack };
