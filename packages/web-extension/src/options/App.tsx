import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import SidebarWithHeader from '~/components/SidebarWithHeader';
import { FiList, FiUser } from 'react-icons/fi';
import { Box, Heading } from '@chakra-ui/react';
import { AccountLoading, SignedOutAccount } from './AccountViews';

// Same test as `config.cloudEnabled`, written inline so the bundler folds it
// and the Firefox build contains no Clerk code at all.
const CloudAccountPage =
  import.meta.env.VITE_TARGET_BROWSER !== 'firefox'
    ? lazy(() => import('./CloudAccountPage'))
    : 'cloud-disabled';

function AccountPage() {
  if (CloudAccountPage === 'cloud-disabled')
    return <SignedOutAccount offer={{ name: 'unavailable' }} />;
  return (
    <Suspense fallback={<AccountLoading label="Loading" />}>
      <CloudAccountPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <SidebarWithHeader
      title="Account"
      headBarItems={[
        {
          label: 'Sessions',
          icon: FiList,
          href: '/pages/index.html#',
        },
        {
          label: 'Account',
          icon: FiUser,
          href: '#',
          active: true,
        },
      ]}
      sideBarItems={[]}
    >
      <Box p="10">
        <Heading as="h1" size="lg" mb="6">
          Account
        </Heading>
        <Routes>
          <Route path="/" element={<AccountPage />} />
        </Routes>
      </Box>
    </SidebarWithHeader>
  );
}
