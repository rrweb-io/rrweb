import fetch from 'node-fetch';

const getEventDataByBlockId = ({ blockId, sessionId }) => {
  console.log('getEventDataByBlockid ', blockId, sessionId);
  return fetch(`/apisession/sessions/${sessionId}/events/${blockId}`).then(data => data.json());
};

const getMetaDataBySessionId = ({ sessionId }) => {
  return fetch(`/apisession/sessions/${sessionId}/status`).then(data => data.json());
};

export { getEventDataByBlockId, getMetaDataBySessionId };
