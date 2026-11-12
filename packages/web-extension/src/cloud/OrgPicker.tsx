import { Select, Text } from '@chakra-ui/react';
import type { CloudAccount } from '~/types';

export type OrgOption = { id: string; name: string };

export type OrgSwitch =
  | { name: 'idle' }
  | { name: 'switching' }
  | { name: 'no-key'; orgName: string }
  | { name: 'failed' };

const pill = {
  bg: 'brand.field',
  border: '1px solid',
  borderColor: 'brand.line',
  borderRadius: '999px',
  fontSize: '13px',
  maxW: '170px',
} as const;

export function OrgPicker({
  account,
  orgs,
  disabled,
  onPick,
}: {
  account: CloudAccount;
  orgs: OrgOption[];
  disabled: boolean;
  onPick: (org: OrgOption) => void;
}) {
  if (orgs.length < 2) {
    return (
      <Text {...pill} px="10px" py="4px" noOfLines={1} title={account.orgName}>
        {account.orgName}
      </Text>
    );
  }
  return (
    <Select
      {...pill}
      size="sm"
      w="auto"
      aria-label="Organization"
      value={account.orgId}
      isDisabled={disabled}
      onChange={(e) => {
        const org = orgs.find((o) => o.id === e.target.value);
        if (org) onPick(org);
      }}
      _focusVisible={{ boxShadow: 'outline' }}
    >
      {orgs.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </Select>
  );
}
