import { getEventDataByBlockId, getMetaDataBySessionId } from '../api';
import { concatEventsData, play, stop, resume } from '../utils';
const GET_SESSION_DATA = 'GET_SESSION_DATA';
const GET_META_DATA = 'GET_META_DATA';
const CREATE_REPLAYER_OBJ = 'CREATE_REPLAYER_OBJ';
const UPDATE_LAST_CONCATED_INDEX = 'UPDATE_LAST_CONCATED_INDEX';
const STOP_PLAYING = 'STOP_PLAYING';
const START_PLAYING = 'START_PLAYING';
const RESUME_PLAYING = 'RESUME_PLAYING';

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

const playActionCreater = data => ({
  type: START_PLAYING,
  payload: data,
});

const stopActionCreater = data => ({
  type: STOP_PLAYING,
  payload: data,
});

const resumeActionCreater = data => ({
  type: RESUME_PLAYING,
  payload: data,
});

const startPlayingAction = () => {
  return dispatch => {
    var tmp_play = play();
    dispatch(playActionCreater({ isPlaying: tmp_play }));
  };
};

const stopPlayingAction = () => {
  return dispatch => {
    var tmp_play = stop();
    dispatch(stopActionCreater({ isPlaying: tmp_play }));
  };
};

const resumePlayingAction = () => {
  return dispatch => {
    var tmp_play = resume();
    dispatch(resumeActionCreater({ isPlaying: tmp_play }));
  };
};

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
  RESUME_PLAYING,
  createReplayerAction,
  getSessionData,
  kickStartSessions,
  dispatchMetaDataAction,
  lastConcatedIndexAction,
  UPDATE_LAST_CONCATED_INDEX,
  START_PLAYING,
  STOP_PLAYING,
  startPlayingAction,
  stopPlayingAction,
  resumePlayingAction,
};
