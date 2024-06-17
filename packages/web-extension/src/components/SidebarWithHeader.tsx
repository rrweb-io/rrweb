import type { ReactNode } from 'react';
import {
  IconButton,
  Box,
  CloseButton,
  Flex,
  HStack,
  Icon,
  Image,
  useColorModeValue,
  Link,
  Drawer,
  DrawerContent,
  useDisclosure,
  BoxProps,
  FlexProps,
  Heading,
  Stack,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@chakra-ui/react';
import { FiChevronRight, FiMenu } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import Browser from 'webextension-polyfill';

export interface SideBarItem {
  label: string;
  icon: IconType;
  href: string;
}

export interface HeadBarItem {
  label: string;
  subLabel?: string;
  children?: Array<HeadBarItem>;
  href?: string;
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
    <Box minH="100vh">
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
        <DrawerContent>
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
      transition="3s ease"
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}
    >
      <Flex h="20" alignItems="center" mx="8" justify="flex-start" gap="3">
        <Link href="https://github.com/rrweb-io/rrweb" target="_blank">
          <Image
            borderRadius="md"
            boxSize="2rem"
            src={Browser.runtime.getURL('icon128.png')}
            alt="RRWeb Logo"
          />
        </Link>
        {title && (
          <Heading as="h4" size="md">
            {title}
          </Heading>
        )}
        <CloseButton display={{ base: 'flex', md: 'none' }} onClick={onClose} />
      </Flex>
      {sideBarItems.map((link) => (
        <NavItem key={link.label} icon={link.icon} href={link.href}>
          {link.label}
        </NavItem>
      ))}
    </Box>
  );
};

interface NavItemProps extends FlexProps {
  icon: IconType;
  href: string;
  children: string;
}
const NavItem = ({ icon, href, children, ...rest }: NavItemProps) => {
  return (
    <Link
      href={href}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
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
        _hover={{
          bg: 'gray.200',
        }}
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
      bg={useColorModeValue('white', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent={{ base: 'space-between', md: 'flex-start' }}
      {...rest}
    >
      <IconButton
        display={{ base: 'flex', md: 'none' }}
        onClick={onOpen}
        variant="outline"
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <HStack spacing={{ base: '0', md: '6' }}>
        {rest.children && rest.children}
      </HStack>
    </Flex>
  );
};

const DesktopNav = ({ headBarItems }: { headBarItems: HeadBarItem[] }) => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = useColorModeValue('gray.800', 'white');
  const popoverContentBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Stack direction={'row'} spacing={4}>
      {headBarItems.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <Link
                p={2}
                href={navItem.href ?? '#'}
                fontSize={'sm'}
                fontWeight={500}
                color={linkColor}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor,
                }}
              >
                {navItem.label}
              </Link>
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}
              >
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  );
};

const DesktopSubNav = ({ label, href, subLabel }: HeadBarItem) => {
  return (
    <Link
      href={href}
      role={'group'}
      display={'block'}
      p={2}
      rounded={'md'}
      _hover={{ bg: useColorModeValue('pink.50', 'gray.900') }}
    >
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text
            transition={'all .3s ease'}
            _groupHover={{ color: 'pink.400' }}
            fontWeight={500}
          >
            {label}
          </Text>
          <Text fontSize={'sm'}>{subLabel}</Text>
        </Box>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}
        >
          <Icon color={'pink.400'} w={5} h={5} as={FiChevronRight} />
        </Flex>
      </Stack>
    </Link>
  );
};
