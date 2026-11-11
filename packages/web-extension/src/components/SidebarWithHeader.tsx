import type { ReactNode } from 'react';
import {
  IconButton,
  Box,
  CloseButton,
  Flex,
  HStack,
  Icon,
  Link,
  Drawer,
  DrawerContent,
  useDisclosure,
  type BoxProps,
  type FlexProps,
  Heading,
  Stack,
} from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { Logo } from '~/popup/PopupParts';

export interface SideBarItem {
  label: string;
  icon: IconType;
  href: string;
  /** The page this item points at is the one showing. */
  active?: boolean;
}

export default function SidebarWithHeader({
  children,
  title,
  headBarItems,
  sideBarItems,
}: {
  title?: string;
  sideBarItems: SideBarItem[];
  headBarItems: SideBarItem[];
  children: ReactNode;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <Box minH="100vh" bg="brand.bg" color="white">
      <SidebarContent
        sideBarItems={sideBarItems}
        onClose={() => onClose}
        display={{ base: 'none', md: 'block' }}
        title={title}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full"
      >
        <DrawerContent bg="brand.field" color="white">
          <SidebarContent
            onClose={onClose}
            sideBarItems={sideBarItems}
            title={title}
          />
        </DrawerContent>
      </Drawer>
      <MobileNav onOpen={onOpen}>
        <Flex
          alignItems={'center'}
          display={{ base: 'none', md: 'flex' }}
          ml={10}
        >
          <DesktopNav headBarItems={headBarItems} />
        </Flex>
      </MobileNav>
      <Box ml={{ base: 0, md: 60 }}>{children}</Box>
    </Box>
  );
}

interface SidebarProps extends BoxProps {
  onClose: () => void;
  title?: string;
  sideBarItems: SideBarItem[];
}

const SidebarContent = ({
  onClose,
  sideBarItems,
  title,
  ...rest
}: SidebarProps) => {
  return (
    <Box
      bg="brand.field"
      color="white"
      borderRight="1px"
      borderRightColor="brand.line"
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}
    >
      <Flex h="20" alignItems="center" mx="6" justify="space-between" gap="3">
        <Link
          href="https://github.com/rrweb-io/rrweb"
          target="_blank"
          rel="noopener noreferrer"
          textDecoration="none"
          _hover={{ textDecoration: 'none' }}
        >
          <Logo />
        </Link>
        <CloseButton
          display={{ base: 'flex', md: 'none' }}
          onClick={onClose}
          _hover={{ bg: 'brand.hover' }}
        />
      </Flex>
      {title && (
        <Heading
          as="h2"
          fontSize="sm"
          fontWeight={500}
          color="brand.pitch"
          mx="6"
          mb="3"
        >
          {title}
        </Heading>
      )}
      {sideBarItems.map((link) => (
        <NavItem
          key={link.label}
          icon={link.icon}
          href={link.href}
          active={link.active}
        >
          {link.label}
        </NavItem>
      ))}
    </Box>
  );
};

interface NavItemProps extends FlexProps {
  icon: IconType;
  href: string;
  active?: boolean;
  children: string;
}
const NavItem = ({ icon, href, active, children, ...rest }: NavItemProps) => {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{ textDecoration: 'none' }}
      _hover={{ textDecoration: 'none' }}
      fontSize="lg"
      fontWeight={500}
    >
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        color="white"
        // The yellow marker is drawn inside the item, so it needs no extra width.
        boxShadow={active ? 'inset 4px 0 0 #EEC202' : 'none'}
        bg={active ? 'brand.active' : 'transparent'}
        _hover={{ bg: active ? 'brand.active' : 'brand.hover' }}
        {...rest}
      >
        <>
          {icon && <Icon mr="4" fontSize="16" as={icon} />}
          {children}
        </>
      </Flex>
    </Link>
  );
};

interface MobileProps extends FlexProps {
  onOpen: () => void;
}
const MobileNav = ({ onOpen, ...rest }: MobileProps) => {
  return (
    <Flex
      ml={{ base: 0, md: 60 }}
      px={{ base: 4, md: 4 }}
      height="20"
      alignItems="center"
      bg="brand.bg"
      color="white"
      borderBottomWidth="1px"
      borderBottomColor="brand.line"
      justifyContent={{ base: 'space-between', md: 'flex-start' }}
      {...rest}
    >
      <IconButton
        display={{ base: 'flex', md: 'none' }}
        onClick={onOpen}
        variant="outline"
        borderColor="brand.line"
        color="white"
        _hover={{ bg: 'brand.hover' }}
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <HStack spacing={{ base: '0', md: '6' }}>
        {rest.children && rest.children}
      </HStack>
    </Flex>
  );
};

const DesktopNav = ({ headBarItems }: { headBarItems: SideBarItem[] }) => {
  return (
    <Stack direction={'row'} spacing={2}>
      {headBarItems.map((navItem) => (
        <Link
          key={navItem.label}
          px={3}
          py={2}
          href={navItem.href}
          aria-current={navItem.active ? 'page' : undefined}
          fontSize={'sm'}
          fontWeight={500}
          color="white"
          borderRadius="md"
          bg={navItem.active ? 'brand.active' : 'transparent'}
          textDecoration="none"
          _hover={{
            textDecoration: 'none',
            bg: navItem.active ? 'brand.active' : 'brand.hover',
          }}
        >
          {navItem.label}
        </Link>
      ))}
    </Stack>
  );
};
