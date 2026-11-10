import { defineUseCases } from '../../../scripts/use-cases.js';
import { userAccessPoliciesSchema } from './index.js';

export const useCases = defineUseCases(userAccessPoliciesSchema, [
  {
    slug: '01-new-admins-get-their-permissions',
    title: 'New administrators get their permission sets automatically',
    given: { accessPolicies: [{ apiName: 'Grant_Permissions', active: false }] },
    config: { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
    notIdempotent: 'Apply To All is an action, not a state: every run applies the policy to the matching users again',
    story: [
      'Every time Fourth Coffee hires a Salesforce administrator, someone forgets one of the permission sets they need. The team describes the rule in a user access policy, `Grant_Permissions` **(1)**: users with the System Administrator profile get the admin permission sets. The policy is deployed with the rest of the metadata, but the Metadata API cannot switch it on: a policy deployed with the status `Active` is saved as `Design`, and no metadata runs it for the existing users.',
      'This config automates the policy **(2)** so that it runs whenever a matching user is **created (3)**, and runs **Apply Policy (4)** once ("Apply To All") for the administrators who already exist. Apply To All cannot be undone and runs again at every apply, so keep it out of the config once the existing users have their access.',
    ],
    captures: {
      policy: {
        clip: { x: 256, y: 140, width: 1184, height: 440 },
      },
    },
    async shoot(doc) {
      const userAccessPolicyId = await doc.recordId(
        "SELECT Id FROM UserAccessPolicy WHERE DeveloperName = 'Grant_Permissions'",
      );
      await using page = await doc.open(`/lightning/setup/UserAccessPolicies/${userAccessPolicyId}/view`);
      const ui = await doc.within(
        page,
        'li.slds-page-header__detail-block:has(> p:text-is("API Name")):has-text("Grant_Permissions")',
      );
      await doc.shot('policy', page, {
        pills: {
          'accessPolicies[0].apiName': ui.locator(
            'li.slds-page-header__detail-block:has(> p:text-is("API Name")):has-text("Grant_Permissions")',
          ),
          'accessPolicies[0].active': ui.locator('li.slds-page-header__detail-block:has(> p:text-is("Status"))'),
          'accessPolicies[0].on': ui.locator('li.slds-page-header__detail-block:has(> p:text-is("Trigger Type"))'),
          'accessPolicies[0].applyToAll': ui.locator('button:has-text("Apply Policy")'),
        },
      });
    },
  },
]);
