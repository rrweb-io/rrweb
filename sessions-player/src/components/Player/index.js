import React from 'react';

import { Replayer } from '../../sessionlibs/rrweb';
import '../../sessionlibs/rrweb.min.css';

import { connect } from 'react-redux';
import { kickStartSessions, fetchSessionDataByBlockId } from '../../actions';

class SessionPlayer extends React.Component {
   constructor(props) {
      super(props);
      
      this.sessionId = 'zmjgbrn8qi5ej58j9h6ii';
   }

   componentDidMount() {
      // kick start the fetching of the events
      this.props.kickStartFetching({ sessionId: this.sessionId });
   }

   componentDidMount() {
      // do we have values
      if (this.props.sessionData.length >= 3) {
         console.log("length of the sessionData is greater than  3");
         // fetch remaining suggestion;   
      }
   }

   render() {
      console.log("this.props in render ", this.props);
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
   let { sessionData } = Sessions;
   console.log("sessions data is ", state);
   return {
      sessionData
   };
}

const mapDispatchToProps = dispatch => {
   return {
      kickStartFetching: ({ sessionId }) => (dispatch(kickStartSessions({ sessionId }))),
      fetchRemaining: ({ blockId, sessionId }) => (dispatch(fetchSessionDataByBlockId({ blockId, sessionId })))
   }
}

export default connect(mapStateToProps, mapDispatchToProps)(SessionPlayer); 
