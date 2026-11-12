import { useEffect, useRef, useState } from 'react';
import Browser from 'webextension-polyfill';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
  Flex,
  Link,
  Text,
} from '@chakra-ui/react';
import { ACCOUNT_NOT_SET_UP_ERROR } from '~/background/sinks';
import { ACCOUNT_HREF } from '~/components/PageChrome';
import { config } from '~/config';
import { LocalDataKey, ServiceName } from '~/types';
import type { LocalData, SharedSessions, ShareResult } from '~/types';
import Channel from '~/utils/channel';
import { useStoredOrg } from './StoredOrgLabel';

const channel = new Channel();

/** Whether this session was uploaded with Share, as stored by the background. */
type StoredShare =
  | { name: 'loading' }
  | { name: 'not-shared' }
  | { name: 'pending'; orgName: string }
  | { name: 'shared'; recordingId: string };

/** This page's own attempt to share the session. */
type Attempt =
  | { name: 'not-shared' }
  | { name: 'confirming' }
  | { name: 'uploading' }
  | { name: 'shared'; recordingId: string }
  | { name: 'share-failed'; errorMessage: string };

const NO_ANSWER_ERROR =
  'The extension did not answer. Reload the page and try again.';

function storedShareFrom(
  shared: SharedSessions | undefined,
  sessionId: string,
): StoredShare {
  const share = shared?.[sessionId];
  if (share?.state === 'shared')
    return { name: 'shared', recordingId: share.recordingId };
  // A pending share is resumed by pressing Share again, in its organization.
  if (share?.state === 'pending')
    return { name: 'pending', orgName: share.orgName };
  return { name: 'not-shared' };
}

function useStoredShare(sessionId: string): StoredShare {
  const [share, setShare] = useState<StoredShare>({ name: 'loading' });
  useEffect(() => {
    let current = true;
    void Browser.storage.local.get(LocalDataKey.sharedSessions).then((data) => {
      if (current)
        setShare(
          storedShareFrom(
            (data as LocalData)[LocalDataKey.sharedSessions],
            sessionId,
          ),
        );
    });
    const onChanged = (
      changes: Record<string, Browser.Storage.StorageChange>,
    ) => {
      const change = changes[LocalDataKey.sharedSessions];
      if (change)
        setShare(
          storedShareFrom(
            change.newValue as SharedSessions | undefined,
            sessionId,
          ),
        );
    };
    Browser.storage.local.onChanged.addListener(onChanged);
    return () => {
      current = false;
      Browser.storage.local.onChanged.removeListener(onChanged);
    };
  }, [sessionId]);
  return share;
}

/** The background's answer, if it is one this version can read. */
function shareResultFrom(value: unknown): ShareResult {
  if (typeof value === 'object' && value !== null) {
    const { name, recordingId, errorMessage } = value as Record<
      string,
      unknown
    >;
    if (name === 'shared' && typeof recordingId === 'string' && recordingId)
      return { name, recordingId };
    if (name === 'share-failed' && typeof errorMessage === 'string')
      return { name, errorMessage };
  }
  return { name: 'share-failed', errorMessage: NO_ANSWER_ERROR };
}

const linkProps = { as: 'a', target: '_blank', rel: 'noreferrer' } as const;

/**
 * "Share" for one offline session: uploads it to the stored account's
 * organization after the person confirms a warning that form fields are not
 * masked. Once shared it opens the cloud copy instead.
 */
export function ShareSession({ sessionId }: { sessionId: string }) {
  // Keyed: a table cell can be reused for another session, and nothing about
  // one session's attempt, or its late answer, may reach the next.
  return <ShareOneSession key={sessionId} sessionId={sessionId} />;
}

function ShareOneSession({ sessionId }: { sessionId: string }) {
  const org = useStoredOrg();
  const stored = useStoredShare(sessionId);
  const [attempt, setAttempt] = useState<Attempt>({ name: 'not-shared' });
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (org.name === 'loading' || stored.name === 'loading') return null;
  const shared =
    stored.name === 'shared'
      ? stored
      : attempt.name === 'shared'
      ? attempt
      : null;
  if (shared)
    return (
      <Button
        {...linkProps}
        href={`${config.dashboardUrl}/recordings/${shared.recordingId}`}
        variant="quiet"
        size="sm"
      >
        Open in rrweb
      </Button>
    );
  if (org.name === 'none')
    return (
      // The Account page, in this tab, signs in and connects the organization;
      // this page follows the stored account when that is done.
      <Button as="a" href={ACCOUNT_HREF} variant="quiet" size="sm">
        Sign in to share
      </Button>
    );

  const upload = async () => {
    if (org.name !== 'org') return;
    setAttempt({ name: 'uploading' });
    let result: ShareResult;
    try {
      result = shareResultFrom(
        await channel.request(ServiceName.ShareSession, {
          sessionId,
          userId: org.userId,
          orgId: org.orgId,
        }),
      );
    } catch (error) {
      result = {
        name: 'share-failed',
        errorMessage: error instanceof Error ? error.message : NO_ANSWER_ERROR,
      };
    }
    setAttempt(result);
  };

  return (
    <Flex direction="column" align="flex-start" gap="4px">
      <Button
        variant="quiet"
        size="sm"
        isLoading={attempt.name === 'uploading'}
        loadingText="Uploading"
        onClick={() =>
          setAttempt(
            org.name === 'not-set-up'
              ? { name: 'share-failed', errorMessage: ACCOUNT_NOT_SET_UP_ERROR }
              : { name: 'confirming' },
          )
        }
      >
        Share
      </Button>
      {attempt.name === 'share-failed' && (
        <Text fontSize="12px" color="red.300" role="alert">
          {attempt.errorMessage}
        </Text>
      )}
      <AlertDialog
        isOpen={attempt.name === 'confirming'}
        leastDestructiveRef={cancelRef}
        onClose={() => setAttempt({ name: 'not-shared' })}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="brand.surface" color="white" mx="16px">
            <AlertDialogHeader fontSize="18px" fontWeight={600}>
              {stored.name === 'pending'
                ? `Finish uploading this recording to ${stored.orgName}?`
                : 'Share this recording?'}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="14px">
              {stored.name === 'pending'
                ? `This finishes the earlier upload to ${stored.orgName} in rrweb.`
                : `This uploads the recording to ${org.orgName} in rrweb.`}{' '}
              Offline recordings don't mask form fields, so anything typed into
              forms on this page will be uploaded. Password fields stay masked.
              <Text mt="12px">
                <Link href={config.privacyPolicyUrl} isExternal>
                  Read how rrweb handles your recordings in our privacy policy
                </Link>
              </Text>
            </AlertDialogBody>
            <AlertDialogFooter gap="8px">
              <Button
                ref={cancelRef}
                variant="quiet"
                onClick={() => setAttempt({ name: 'not-shared' })}
              >
                Cancel
              </Button>
              <Button
                bg="white"
                color="#0A1325"
                _hover={{ bg: 'whiteAlpha.800' }}
                _active={{ bg: 'whiteAlpha.700' }}
                onClick={() => void upload()}
              >
                Upload and share
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Flex>
  );
}
