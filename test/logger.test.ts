import { expect } from 'chai';
import { recordLog } from '../src/logger/index';
import { eventWithTime, EventType } from '../src/types';

describe.only('initial', () => {
  it('options', (done) => {
    recordLog({
      emit: (e) => console.log(e),
      lengthThreshold: 100,
    });
    done();
  });
});
