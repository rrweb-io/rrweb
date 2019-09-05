import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import { AppTitle, ContentRoot, NferxLogo, withQuery } from 'nferx-core-ui';
import { Redirect } from 'react-router-dom';
import { config } from '../../Config';
import Paper from '@material-ui/core/Paper';

import { Player, PlayerControls } from '../../components';

const styles = theme => ({
  root: {
    maxWidth: 500,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    margin: ['10vh', 'auto', 0, 'auto'],
  },
  imgContainer: {
    position: 'relative',
    margin: [0, 'auto', theme.pad.md, 'auto'],
    width: 250, //  need to set width on container too for ie 11
    height: 95,
  },
  img: {
    width: 250,
    height: 95,
  },
  header: {
    marginBottom: theme.pad.md,
  },
  appTitle: {
    position: 'absolute',
    right: 0,
    bottom: -5,
  },
  paper: {
    borderRadius: 100,
  },
});

class HomeRouteContents extends Component {
  static propTypes = {};

  render() {
    const { classes, query, sessionId } = this.props;
    return (
      <React.Fragment>
        <Player sessionId={sessionId} />
        <PlayerControls />
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(withQuery(HomeRouteContents));
