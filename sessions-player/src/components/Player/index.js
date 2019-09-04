import React from 'react';

import { Replayer } from '../../sessionlibs/rrweb';
import '../../sessionlibs/rrweb.min.css';

import { cleanAndAddData } from '../../utils';

import { connect } from 'react-redux';
import {
  kickStartSessions,
  fetchSessionDataByBlockId,
  dispatchMetaDataAction,
  lastConcatedIndex,
} from '../../actions';

class SessionPlayer extends React.Component {
  constructor(props) {
    super(props);

    this.sessionId = 'zmjgbrn8qi5ej58j9h6ii';
    this.kickStartedForGreaterThan3 = false;
  }

  componentDidMount() {
    // kick start the fetching of the events
    this.props.fetchMetaData({ sessionId: this.sessionId });
  }

  componentDidUpdate() {
    // do we have values
    var totalNumberOfBlocks = this.props.totalNumberOfBlocks;
    if (totalNumberOfBlocks && !this.kickStartedForGreaterThan3) {
      this.kickStartedForGreaterThan3 = true;
      this.props.kickStartFetching({
        sessionId: this.sessionId,
        totalNumberOfBlocks,
      });
    }
    if (this.props.sessionData) {
      var { lastConcatedIndex } = cleanAndAddData({
        sessionData: this.props.sessionData,
        lastConcatedIndex: this.props.lastConcatedIndex,
      });
      this.props.updateLastConcatedIndex({ lastConcatedIndex });
    }
  }

  render() {
    console.log('this.props in render ', this.props);
    const { sessionData } = this.props;
    if (!sessionData.length) {
      return null;
    }
    return <div>Jankay</div>;
  }
}

// connect to store
const mapStateToProps = state => {
  const { Sessions } = state;
  console.log('sessions data is ', state);
  return {
    ...Sessions,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    kickStartFetching: ({ sessionId, totalNumberOfBlocks }) =>
      dispatch(kickStartSessions({ sessionId, totalNumberOfBlocks })),
    fetchMetaData: ({ sessionId }) =>
      dispatch(dispatchMetaDataAction({ sessionId })),
    updateLastConcatedIndex: ({ lastConcatedIndex }) =>
      dispatch(lastConcatedIndex({ lastConcatedIndex })),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SessionPlayer);
