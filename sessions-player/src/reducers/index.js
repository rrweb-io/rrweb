import { combineReducers } from 'redux';
import {
  GET_SESSION_DATA,
  GET_META_DATA,
  CREATE_REPLAYER_OBJ,
} from '../actions';
import { sortContinously } from '../utils';
import { Replayer } from '../sessionlibs/rrweb';

const Sessions = (
  state = { sessionData: [], totalNumberOfBlocks: 0, replayer: null },
  action,
) => {
  if (typeof action.payload === 'string') {
    action.payload = JSON.parse(action.payload);
  }
  console.log('action is ', action);
  switch (action.type) {
    case GET_SESSION_DATA:
      var sessionData_t = state.sessionData.slice();
      sessionData_t.push(action.payload.sessionData);
      return {
        ...state,
        sessionData: sessionData_t,
      };
    case GET_META_DATA:
      return {
        ...state,
        totalNumberOfBlocks: action.payload.totalNumberOfBlocks,
      };
    case CREATE_REPLAYER_OBJ:
      let tmp = {
        ...state,
        sessionData: action.payload.sessionData,
      };
      return tmp;
  }
  return state;
};

export default combineReducers({
  Sessions,
});
