import { __assign } from '../../node_modules/tslib/tslib.es6.js';
import { deflate as pako_deflate_1 } from '../../node_modules/pako/dist/pako_deflate.js';
import { MARK } from './base.js';

var pack = function (event) {
    var _e = __assign(__assign({}, event), { v: MARK });
    return pako_deflate_1(JSON.stringify(_e), { to: 'string' });
};

export { pack };
