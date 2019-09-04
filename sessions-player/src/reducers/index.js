import { combineReducers } from 'redux';
import {
  GET_SESSION_DATA,
  GET_META_DATA,
  CREATE_REPLAYER_OBJ,
  UPDATE_LAST_CONCATED_INDEX,
} from '../actions';

const Sessions = (
  state = { sessionData: [], totalNumberOfBlocks: 0, lastConcatedIndex: 0 },
  action,
) => {
  if (typeof action.payload === 'string') {
    action.payload = JSON.parse(action.payload);
  }
  console.log('action is ', action);
  switch (action.type) {
    case GET_SESSION_DATA:
      var sessionData_t = state.sessionData.slice();
      sessionData_t.push(action.payload.sessionDataUnit);
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
    case UPDATE_LAST_CONCATED_INDEX:
      return {
        ...state,
        lastConcatedIndex: action.payload.lastConcatedIndex,
      };
  }
  return state;
};

export default combineReducers({
  Sessions,
});
