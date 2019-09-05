import { combineReducers } from 'redux';
import {
  GET_SESSION_DATA,
  GET_META_DATA,
  CREATE_REPLAYER_OBJ,
  UPDATE_LAST_CONCATED_INDEX,
  START_PLAYING,
  STOP_PLAYING,
} from '../actions';

function convertStringToObject(str) {
  var x = str;
  try {
    x = JSON.parse(x);
  } catch (e) {}
  return x;
}

const Sessions = (
  state = { sessionData: [], totalNumberOfBlocks: 0, lastConcatedIndex: 0 },
  action,
) => {
  action.payload = convertStringToObject(action.payload);
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

const Controller = (state = { isPlaying: true }, action) => {
  action.payload = convertStringToObject(action.payload);
  switch (action.type) {
    case START_PLAYING:
      return {
        ...state,
        isPlaying: action.payload.isPlaying,
      };
    case STOP_PLAYING:
      return {
        ...state,
        isPlaying: action.payload.isPlaying,
      };
  }
  return state;
};

export default combineReducers({
  Sessions,
  Controller,
});
