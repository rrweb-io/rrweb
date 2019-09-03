import fetch from 'node-fetch';

const getEventDataByBlockId = ({ blockId, sessionId }) => {
    return fetch(`/apisession/sessions/${sessionId}/events/${blockId}`).then(data => data.json());
}

const getMetaDataBySessionId = ({ sessionId }) => {
    return new Promise((res, rej) => {
        setTimeout(() => {
            let data = {
                isActive: true,
                playbackTime: 0,
                processed: false,
                sessionId: "zmjgbrn8qi5ej58j9h6ii",
                totalNumberOfBlocks: "16",
                userHeader: null,
                visitedURL: [],
                _id: "5d66876390c29a18d7b0cd67",
            };
            res(data);
        }, 100);
    });
    //  return fetch(`/apisession/sessions/${sessionId}/status`).then(data => data.json());
}

export { getEventDataByBlockId, getMetaDataBySessionId };
