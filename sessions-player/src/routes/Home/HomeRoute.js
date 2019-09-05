import React, { Component } from 'react';
import { Route } from 'react-router-dom';
import HomeRouteContents from './HomeRouteContents';

class HomeRoute extends Component {
  static propTypes = {};

  render() {
    return (
      <Route
        path={'/:sessionId'}
        exact
        render={({ match }) => (
          <HomeRouteContents sessionId={match.params.sessionId} />
        )}
      />
    );
  }
}

export default HomeRoute;
