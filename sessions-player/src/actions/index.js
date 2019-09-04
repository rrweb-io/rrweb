import { getEventDataByBlockId, getMetaDataBySessionId } from '../api';
import { concatEventsData } from '../utils';
const GET_SESSION_DATA = 'GET_SESSION_DATA';
const GET_META_DATA = 'GET_META_DATA';
const CREATE_REPLAYER_OBJ = 'CREATE_REPLAYER_OBJ';
const UPDATE_LAST_CONCATED_INDEX = 'UPDATE_LAST_CONCATED_INDEX';

const getSessionData = data => ({
  type: GET_SESSION_DATA,
  payload: data,
});

const getMetaData = data => ({
  type: GET_META_DATA,
  payload: data,
});

const createReplayerAction = data => ({
  type: CREATE_REPLAYER_OBJ,
  payload: data,
});

const lastConcatedIndexAction = data => ({
  type: UPDATE_LAST_CONCATED_INDEX,
  payload: data,
});

const kickStartSessions = ({ sessionId, totalNumberOfBlocks }) => {
  return (dispatch, getState) => {
    Promise.all(
      [0, 1, 2].map(blockId => {
        return getEventDataByBlockId({ blockId, sessionId });
      }),
    )
      .then(values => [].concat(...values))
      .then(data => {
        dispatch(createReplayerAction({ sessionData: data }));
        return;
      })
      .then(() => {
        console.log(
          'totalNumberOfBlocks in kickStartSessions ',
          totalNumberOfBlocks,
          getState(),
        );
        for (var i = 3; i < totalNumberOfBlocks; i++) {
          getEventDataByBlockId({ blockId: i, sessionId }).then(data => {
            console.log('42data is ', data, getState());
            dispatch(getSessionData({ sessionDataUnit: data }));
          });
          // fetchSessionDataByBlockId({ blockId: i, sessionId });
        }
      });
  };
};

const dispatchMetaDataAction = ({ sessionId }) => {
  return dispatch => {
    getMetaDataBySessionId({ sessionId }).then(data => {
      dispatch(getMetaData(data));
    });
  };
};

export {
  GET_SESSION_DATA,
  GET_META_DATA,
  CREATE_REPLAYER_OBJ,
  createReplayerAction,
  getSessionData,
  kickStartSessions,
  dispatchMetaDataAction,
  lastConcatedIndexAction,
};
