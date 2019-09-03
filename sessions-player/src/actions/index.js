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

const kickStartSessions = ({ sessionId }) => {
    return (dispatch) => {
        getEventDataByBlockId({ blockId: 0, sessionId }).then((data) => {
            dispatch(getSessionData(data));
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


export { GET_SESSION_DATA, GET_META_DATA, CREATE_REPLAYER_OBJ, getSessionData, kickStartSessions, fetchSessionDataByBlockId, dispatchMetaDataAction, };
