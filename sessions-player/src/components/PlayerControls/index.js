import React from 'react';

import Button from '@material-ui/core/Button';

class PlayerControls extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <Button variant="contained">Start</Button>;
  }
}

export default PlayerControls

