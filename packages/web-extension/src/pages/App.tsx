import { Route, Routes } from 'react-router-dom';
import SidebarWithHeader from '~/components/SidebarWithHeader';
import { SessionList } from './SessionList';
import { FiList, FiUser } from 'react-icons/fi';
import Player from './Player';

export default function App() {
  return (
    <SidebarWithHeader
      title="Sessions"
      headBarItems={[
        {
          label: 'Account',
          icon: FiUser,
          href: '/options/index.html#',
        },
        {
          label: 'Sessions',
          icon: FiList,
          href: '#',
          active: true,
        },
      ]}
      sideBarItems={[
        {
          label: 'List',
          icon: FiList,
          href: `#`,
          active: true,
        },
      ]}
    >
      <Routes>
        <Route path="/" element={<SessionList />} />
        <Route path="session/:sessionId" element={<Player />} />
      </Routes>
    </SidebarWithHeader>
  );
}
