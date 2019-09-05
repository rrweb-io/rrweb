import React from 'react';

import Button from '@material-ui/core/Button';
import { startPlayingAction, stopPlayingAction } from '../../actions';

import { connect } from 'react-redux';

class PlayerControls extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    // timeStamp
  }

  handleStartHandler = () => {
    console.log('handle start handler ');
  };

  handleStopHandler = () => {
    console.log('handle stop handler ');
    this.props.stop();
  };

  render() {
    return (
      <React.Fragment>
        <Button variant="contained" onClick={this.handleStartHandler}>
          Start
        </Button>
        <Button variant="contained" onClick={this.handleStopHandler}>
          Stop
        </Button>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  const { Controller } = state;
  return {
    ...Controller,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    start: () => dispatch(startPlayingAction()),
    stop: () => dispatch(stopPlayingAction()),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(PlayerControls);
