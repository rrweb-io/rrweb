import React, { Component } from 'react'
import { Route } from 'react-router-dom'
import HomeRouteContents from './HomeRouteContents'

class HomeRoute extends Component {
  static propTypes = {}

  render() {
    return (
      <Route
        path={'/'}
        exact
        component={HomeRouteContents}
      />
    )
  }
}

export default HomeRoute
