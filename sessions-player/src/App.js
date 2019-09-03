import React, { Component } from 'react'
import Routes from './routes/Routes'
import { AppBar } from './components'
import { QueryProvider, AppContent, GlobalStylesProvider } from 'nferx-core-ui'
import 'url-search-params-polyfill'

import thunk from 'redux-thunk';
import { createStore, applyMiddleware } from 'redux';
import reducer from 'reducers';
import { Provider } from 'react-redux';

const middleware = [thunk];
const store = createStore(reducer, applyMiddleware(...middleware));

class App extends Component {
  componentDidMount() {
    // remove jssStyles injected by server
    const jssStyles = document.getElementById('jss-server-side')
    if (jssStyles && jssStyles.parentNode) {
      jssStyles.parentNode.removeChild(jssStyles)
    }
  }

  render() {
    return (
      <QueryProvider>
        <GlobalStylesProvider>
          <Provider store={store}>
            <AppContent>
              <Routes />
            </AppContent>
          </Provider>
        </GlobalStylesProvider>
      </QueryProvider>
    )
  }
}

export default App
