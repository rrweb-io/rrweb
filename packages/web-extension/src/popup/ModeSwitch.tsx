import { useRef, type KeyboardEvent } from 'react';
import { Box, Flex, Grid, Link } from '@chakra-ui/react';
import type { IconType } from 'react-icons';
import { FiArrowUpRight, FiCloud, FiCloudOff } from 'react-icons/fi';
import { RecorderStatus, type RecordingKind } from '~/types';
import type { RecorderControls } from './PopupParts';

/**
 * The Cloud half of the switch.
 * selectable: an organization is connected; its dashboard link sits under it.
 * connect-first: it can be picked, but a pitch to connect replaces recording.
 */
export type CloudSegment =
  | { name: 'selectable'; dashboardUrl: string }
  | { name: 'connect-first' };

type Option = {
  mode: RecordingKind;
  label: string;
  Icon: IconType;
};

// The unchosen side's link stays readable: white at 55% on navy is over 5:1.
const DIMMED = 0.55;

/**
 * Where the next recording goes: a radio group of two segments. The chosen
 * segment is a bordered pill, so the choice is shown by shape as well as
 * colour. `disabled` locks both while a recording runs.
 */
export function ModeSwitch({
  shown,
  cloud,
  disabled,
  onChoose,
  onOpenSessions,
}: {
  shown: RecordingKind;
  cloud: CloudSegment;
  disabled: boolean;
  onChoose: (mode: RecordingKind) => void;
  onOpenSessions: () => void;
}) {
  const options: Option[] = [
    { mode: 'cloud', label: 'Cloud', Icon: FiCloud },
    { mode: 'offline', label: 'Offline', Icon: FiCloudOff },
  ];
  const refs = useRef<Record<RecordingKind, HTMLButtonElement | null>>({
    cloud: null,
    offline: null,
  });
  const pickable = disabled ? [] : options;

  const onKeyDown = (event: KeyboardEvent) => {
    const step = {
      ArrowLeft: -1,
      ArrowUp: -1,
      ArrowRight: 1,
      ArrowDown: 1,
    }[event.key];
    if (step === undefined || pickable.length === 0) return;
    event.preventDefault();
    const at = pickable.findIndex((o) => o.mode === shown);
    const next =
      pickable[(at + step + pickable.length) % pickable.length] ?? pickable[0];
    onChoose(next.mode);
    refs.current[next.mode]?.focus();
  };

  return (
    <Box>
      <Flex
        role="radiogroup"
        aria-label="Where recordings go"
        bg="rgba(0,0,0,0.25)"
        border="1px solid rgba(255,255,255,0.12)"
        borderRadius="10px"
        p="3px"
        onKeyDown={onKeyDown}
      >
        {options.map(({ mode, label, Icon }) => {
          const checked = shown === mode;
          const off = disabled;
          return (
            <Flex
              key={mode}
              as="button"
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={off}
              tabIndex={checked ? 0 : -1}
              ref={(el: HTMLButtonElement | null) => {
                refs.current[mode] = el;
              }}
              onClick={() => onChoose(mode)}
              flex="1"
              align="center"
              justify="center"
              gap="6px"
              py="8px"
              px="6px"
              fontSize="13px"
              fontWeight={600}
              borderRadius="8px"
              border="1px solid"
              borderColor={checked ? 'rgba(255,255,255,0.22)' : 'transparent'}
              bg={checked ? 'rgba(255,255,255,0.12)' : 'transparent'}
              color={checked ? 'white' : 'brand.muted'}
              cursor={off ? 'not-allowed' : 'pointer'}
              _hover={off || checked ? undefined : { color: 'white' }}
              _focusVisible={{ boxShadow: 'outline', outline: 'none' }}
            >
              <Icon aria-hidden="true" size="15px" />
              {label}
            </Flex>
          );
        })}
      </Flex>
      <Grid templateColumns="1fr 1fr" mt="10px" fontSize="12px">
        <Box>
          {cloud.name === 'selectable' && (
            <Link
              href={cloud.dashboardUrl}
              isExternal
              opacity={shown === 'cloud' ? 1 : DIMMED}
            >
              Cloud dashboard{' '}
              <FiArrowUpRight
                aria-hidden="true"
                style={{ display: 'inline' }}
              />
            </Link>
          )}
        </Box>
        <Box textAlign="right">
          <Link
            as="button"
            onClick={onOpenSessions}
            opacity={shown === 'offline' ? 1 : DIMMED}
          >
            Offline sessions
          </Link>
        </Box>
      </Grid>
    </Box>
  );
}

/** The switch with nothing connected: Cloud can be picked and then pitches. */
export function NotConnectedSwitch({
  recorder,
  shown,
  onChoose,
  onOpenSessions,
}: {
  recorder: RecorderControls;
  shown: RecordingKind;
  onChoose: (mode: RecordingKind) => void;
  onOpenSessions: () => void;
}) {
  return (
    <ModeSwitch
      shown={shown}
      cloud={{ name: 'connect-first' }}
      disabled={recorder.status !== RecorderStatus.IDLE}
      onChoose={onChoose}
      onOpenSessions={onOpenSessions}
    />
  );
}
