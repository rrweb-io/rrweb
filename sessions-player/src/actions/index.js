import { getEventDataByBlockId, getMetaDataBySessionId } from '../api';
const GET_SESSION_DATA = 'GET_SESSION_DATA';
const GET_META_DATA = 'GET_META_DATA';
const CREATE_REPLAYER_OBJ = 'CREATE_REPLAYER_OBJ';

const getSessionData = (data) => ({
    type: GET_SESSION_DATA,
    payload: data
});

const getMetaData = (data) => ({
    type: GET_META_DATA,
    payload: data
});


const createReplayerAction = (data) => ({
    type: CREATE_REPLAYER_OBJ,
    payload: data
});

const kickStartSessions = ({ sessionId, totalNumberOfBlocks }) => {
    return (dispatch) => {
        Promise.all([0, 1, 2].map((blockId) => {
            return getEventDataByBlockId({ blockId, sessionId })
        })).then((values) => {
            return values[0].concat(values[1]).concat(values[2]);
        }).then((data) => {
            dispatch(createReplayerAction(data));
            return data;
        }).then((totalNumberOfBlocks) => {
            for (var i = 3; i < totalNumberOfBlocks; i++) {
                fetchSessionDataByBlockId({ blockId: i, sessionId });
            }
        });
    }
}

const fetchSessionDataByBlockId = ({ blockId, sessionId }) => {
    return (dispatch) => {
        getEventDataByBlockId({ blockId, sessionId }).then((data) => {
            dispatch(getSessionData(data));
        });
    }
}

const dispatchMetaDataAction = ({ sessionId }) => {
    return (dispatch) => {
        getMetaDataBySessionId({ sessionId }).then((data) => {
            dispatch(getMetaData(data));
        });
    };
}


export { GET_SESSION_DATA, GET_META_DATA, CREATE_REPLAYER_OBJ, createReplayerAction, getSessionData, kickStartSessions, fetchSessionDataByBlockId, dispatchMetaDataAction, };
