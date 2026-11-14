import { Route, Routes } from 'react-router-dom';
import PageChrome from '~/components/PageChrome';
import { SessionList } from './SessionList';
import Player from './Player';
import { StoredOrgLabel } from './StoredOrgLabel';

export default function App() {
  return (
    <PageChrome current="sessions" end={<StoredOrgLabel />}>
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="session/:sessionId" element={<Player />} />
      </Routes>
    </PageChrome>
  );
}
