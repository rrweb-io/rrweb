import React, { Component } from 'react';
import { AppBar as NferxAppBar, OtherAppsButton } from 'nferx-core-ui';
import { Route } from 'react-router';
import { config } from '../../Config';

class AppBar extends Component {
  static propTypes = {};

  render() {
    const { classes } = this.props;

    return (
      <NferxAppBar>
        <Route path={'/token/:token'}>
          {({ match }) => {
            return (
              <OtherAppsButton
                exclude={config.appName}
                token={match ? match.params.token : undefined}
              />
            );
          }}
        </Route>
      </NferxAppBar>
    );
  }
}

export default AppBar;
