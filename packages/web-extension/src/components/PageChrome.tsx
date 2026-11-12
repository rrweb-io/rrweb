import type { ReactNode } from 'react';
import { Box, Flex, Link, Text } from '@chakra-ui/react';
import { FiArrowUpRight } from 'react-icons/fi';
import { config } from '~/config';
import { Logo } from '~/popup/PopupParts';

/** The full pages, each with its link in the bar. */
export type PageName = 'sessions' | 'account';

export const SESSIONS_HREF = '/pages/index.html#/';
export const ACCOUNT_HREF = '/options/index.html#/';

const PAGES: { name: PageName; label: string; href: string }[] = [
  { name: 'sessions', label: 'Offline Stored Sessions', href: SESSIONS_HREF },
  { name: 'account', label: 'Account', href: ACCOUNT_HREF },
];

// The rrweb dashboard's floating top bar and its translucent white tint.
const glassBar = {
  background:
    'linear-gradient(135deg, rgb(255 255 255 / 0.09) 0%, rgb(255 255 255 / 0.02) 45%, rgb(238 194 2 / 0.05) 100%), radial-gradient(120% 180% at 0% 0%, rgb(99 140 255 / 0.12) 0%, transparent 60%), rgb(10 19 37 / 0.38)',
  backdropFilter: 'blur(20px) saturate(180%)',
  border: '1px solid rgb(255 255 255 / 0.1)',
  boxShadow:
    '0 8px 32px rgb(0 0 0 / 0.35), inset 0 1px 0 rgb(255 255 255 / 0.08), inset 0 -1px 0 rgb(0 0 0 / 0.15)',
} as const;

const invertedGlass = {
  background: 'rgb(255 255 255 / 0.12)',
  border: '1px solid rgb(255 255 255 / 0.2)',
  boxShadow:
    'inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -1px 0 rgb(255 255 255 / 0.06), 0 1px 2px rgb(0 0 0 / 0.15)',
} as const;

/**
 * A full extension page: the dashboard's top bar over its folded backdrop,
 * then the page. `end` is the right of the bar, such as the account label.
 */
export default function PageChrome({
  current,
  end,
  children,
}: {
  current: PageName;
  end?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box position="relative" minH="100vh" bg="#050C16" color="brand.ink">
      <FoldedBackdrop />
      <Box as="header" position="relative" zIndex={2} px="16px" pt="12px">
        <Flex
          sx={glassBar}
          align="center"
          gap="20px"
          borderRadius="16px"
          py="6px"
          pl="8px"
          pr="12px"
        >
          <Link
            href={SESSIONS_HREF}
            flexShrink={0}
            textDecoration="none"
            _hover={{ textDecoration: 'none' }}
            borderRadius="14px"
          >
            <Logo size="page" />
          </Link>
          <Flex as="nav" aria-label="Pages" align="center" gap="4px">
            {PAGES.map((page) => (
              <NavLink
                key={page.name}
                href={page.href}
                active={page.name === current}
              >
                {page.label}
              </NavLink>
            ))}
            {config.cloudEnabled && (
              <NavLink href={config.dashboardUrl} active={false} external>
                <>
                  Cloud dashboard{' '}
                  <FiArrowUpRight
                    aria-hidden="true"
                    style={{ display: 'inline' }}
                  />
                </>
              </NavLink>
            )}
          </Flex>
          <Flex ml="auto" minW={0} align="center">
            {end}
          </Flex>
        </Flex>
      </Box>
      <Box
        as="main"
        position="relative"
        zIndex={1}
        maxW="1280px"
        mx="auto"
        px="16px"
        py="32px"
      >
        {children}
      </Box>
    </Box>
  );
}

function NavLink({
  href,
  active,
  external = false,
  children,
}: {
  href: string;
  active: boolean;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      isExternal={external}
      aria-current={active ? 'page' : undefined}
      flexShrink={0}
      borderRadius="10px"
      px="12px"
      py="8px"
      fontSize="14px"
      fontWeight={600}
      lineHeight="20px"
      textDecoration="none"
      transition="color 150ms"
      // The current page sits in a translucent white tint with a border, so it
      // is told apart by shape, not colour alone.
      sx={active ? invertedGlass : { border: '1px solid transparent' }}
      color={active ? 'white' : 'brand.inkSoft'}
      _hover={{ color: 'white', textDecoration: 'none' }}
    >
      {children}
    </Link>
  );
}

/** The account's email or organization, on the right of the bar. */
export function BarLabel({ label }: { label: string }) {
  return (
    <Text
      fontSize="14px"
      color="brand.inkSoft"
      noOfLines={1}
      wordBreak="break-all"
      title={label}
    >
      {label}
    </Text>
  );
}

/** The dashboard's backdrop: a navy wash, a faint skewed grid and grain. */
function FoldedBackdrop() {
  return (
    <Box
      aria-hidden="true"
      position="fixed"
      inset={0}
      zIndex={0}
      pointerEvents="none"
      overflow="hidden"
    >
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="fb-ink-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#142E4A" />
            <stop offset="0.48" stopColor="#0D2035" />
            <stop offset="1" stopColor="#050C16" />
          </linearGradient>
          <pattern
            id="fb-grid"
            width="160"
            height="160"
            patternUnits="userSpaceOnUse"
            patternTransform="translate(22 46) skewX(-4) skewY(-2)"
          >
            <path
              d="M32 0V160M64 0V160M96 0V160M128 0V160M0 32H160M0 64H160M0 96H160M0 128H160"
              fill="none"
              stroke="#89A9C2"
              strokeOpacity="0.075"
              strokeWidth="0.6"
            />
            <path
              d="M160 0H0V160"
              fill="none"
              stroke="#89A9C2"
              strokeOpacity="0.18"
              strokeWidth="1.1"
            />
          </pattern>
          <radialGradient
            id="fb-grid-visibility"
            gradientUnits="userSpaceOnUse"
            cx="50%"
            cy="0%"
            r="85%"
          >
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.82" />
            <stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.22" />
          </radialGradient>
          <mask id="fb-grid-mask">
            <rect width="100%" height="100%" fill="url(#fb-grid-visibility)" />
          </mask>
          <filter id="fb-paper-noise" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="2"
              seed="17"
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.13 0"
            />
          </filter>
        </defs>
        <rect width="100%" height="100%" fill="url(#fb-ink-wash)" />
        <rect
          width="100%"
          height="100%"
          fill="url(#fb-grid)"
          mask="url(#fb-grid-mask)"
        />
        <rect
          width="100%"
          height="100%"
          fill="#FFFFFF"
          filter="url(#fb-paper-noise)"
          opacity="0.06"
          style={{ mixBlendMode: 'soft-light' }}
        />
      </svg>
    </Box>
  );
}
