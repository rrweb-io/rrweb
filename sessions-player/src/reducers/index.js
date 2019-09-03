import { combineReducers } from 'redux';
import { GET_SESSION_DATA, GET_META_DATA, CREATE_REPLAYER_OBJ } from '../actions';
import { sortContinously } from '../utils';
import { Replayer } from '../sessionlibs/rrweb';

const Sessions = (state = { sessionData: [], totalNumberOfBlocks: 0, replayer: null }, action) => {
    if (typeof action.payload === 'string') {
        action.payload = JSON.parse(action.payload);
    }
    switch (action.type) {
        case GET_SESSION_DATA:
            return {
                ...state,
                sessionData: sessionData.concat(action.payload.sessionData)
            }
        case GET_META_DATA:
            return {
                ...state,
                totalNumberOfBlocks: action.payload.totalNumberOfBlocks
            }
        case CREATE_REPLAYER_OBJ:
            // create replayer 
            let tmp = {
                ...state,
                replayer: Replayer(action.payload.sessionData),
                sessionData: action.payload.sessionData
            }
            tmp.replayer.play();
            return tmp;
    }
    state = Object.assign(state, sortContinously({
        globalValues: state.sessionData,
        replayer: state.replayer
    }));
    return state;
}


export default combineReducers({
    Sessions
});
