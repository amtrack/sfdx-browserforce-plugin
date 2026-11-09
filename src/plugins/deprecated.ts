import { hallOfFameUrl } from '../docs.js';
import { getValueAtPath } from '../env-references.js';

export type DeprecatedSetting = {
  /** dot path under `settings` */
  path: string;
  /** why it was removed: Salesforce now supports it in the Metadata API, or the feature was retired */
  reason: 'metadata-api' | 'retired';
  message: string;
  /** what to use instead, when it is not the Metadata API */
  alternatives?: string;
  /** migration instructions */
  url: string;
};

const METADATA_API_MESSAGE = 'Salesforce now supports this setting in the Metadata API.';

const metadataApi = (path: string, anchor: string): DeprecatedSetting => ({
  path,
  reason: 'metadata-api',
  message: METADATA_API_MESSAGE,
  url: hallOfFameUrl(anchor),
});

export const deprecatedSettings: DeprecatedSetting[] = [
  metadataApi('communities', 'communities'),
  metadataApi('deferSharingCalculation', 'defersharingcalculation'),
  {
    path: 'salesforceToSalesforce',
    reason: 'retired',
    message: 'Salesforce to Salesforce has been retired.',
    alternatives: 'Partner Cloud, Data Cloud One, MuleSoft Anypoint, or MuleSoft for Flow',
    url: hallOfFameUrl('salesforcetosalesforce'),
  },
  metadataApi('security.loginAccessPolicies', 'security-loginaccesspolicies-administratorscanloginasanyuser'),
  metadataApi('security.identityProvider', 'security-identityprovider'),
  metadataApi('security.sharing', 'security-sharing'),
];

/** The deprecated settings used in a config. */
export function findDeprecations(definition: unknown): DeprecatedSetting[] {
  const settings = (definition as { settings?: unknown } | undefined)?.settings;
  return deprecatedSettings.filter((deprecated) => getValueAtPath(settings, deprecated.path.split('.')) !== undefined);
}

export function formatDeprecation(deprecated: DeprecatedSetting): string {
  return [
    `The sfdx-browserforce-plugin setting '${deprecated.path}' is deprecated and has been removed.`,
    `${deprecated.reason === 'retired' ? '❌' : '✅'} ${deprecated.message}`,
    ...(deprecated.alternatives ? [`👉 Use one of these alternative solutions: ${deprecated.alternatives}.`] : []),
    `👉 Please see the instructions at ${deprecated.url}.`,
  ].join('\n');
}

export const handleDeprecations = (definition: unknown): void => {
  const [deprecated] = findDeprecations(definition);
  if (deprecated) {
    throw new Error(formatDeprecation(deprecated));
  }
};
