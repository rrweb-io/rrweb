import { strFromU8, strToU8, zlibSync } from 'fflate';
import { MARK } from './base';
export const pack = (event) => {
    const _e = {
        ...event,
        v: MARK,
    };
    return strFromU8(zlibSync(strToU8(JSON.stringify(_e))), true);
};
//# sourceMappingURL=pack.js.map