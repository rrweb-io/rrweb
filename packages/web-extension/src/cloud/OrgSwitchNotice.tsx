import { Link, Text, type TextProps } from '@chakra-ui/react';
import type { OrgSwitch } from './OrgPicker';

/** What the organization switch tells the person after it did not complete. */
export function OrgSwitchNotice({
  orgSwitch,
  dashboardUrl,
  ...spacing
}: { orgSwitch: OrgSwitch; dashboardUrl: string } & TextProps) {
  if (orgSwitch.name === 'no-key')
    return (
      <Text color="brand.danger" fontSize="13px" role="alert" {...spacing}>
        {orgSwitch.orgName} isn't set up for recording yet. Open it in the{' '}
        <Link href={dashboardUrl} isExternal>
          Cloud dashboard
        </Link>{' '}
        to finish setting it up.
      </Text>
    );
  if (orgSwitch.name === 'failed')
    return (
      <Text color="brand.danger" fontSize="13px" role="alert" {...spacing}>
        Could not switch organization. Try again.
      </Text>
    );
  return null;
}
