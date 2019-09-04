import React from 'react';

import { Replayer } from '../../sessionlibs/rrweb';
import '../../sessionlibs/rrweb.min.css';

import { connect } from 'react-redux';
import {
  kickStartSessions,
  fetchSessionDataByBlockId,
  dispatchMetaDataAction,
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
      console.log(
        'this.props.totalNumberOfBlocks ',
        this.props.totalNumberOfBlocks,
      );
      this.kickStartedForGreaterThan3 = true;
      this.props.kickStartFetching({
        sessionId: this.sessionId,
        totalNumberOfBlocks,
      });
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
    fetchRemaining: ({ blockId, sessionId }) =>
      dispatch(fetchSessionDataByBlockId({ blockId, sessionId })),
    fetchMetaData: ({ sessionId }) =>
      dispatch(dispatchMetaDataAction({ sessionId })),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SessionPlayer);
