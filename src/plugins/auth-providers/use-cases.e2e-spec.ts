import { defineUseCases } from '../../../scripts/use-cases.js';
import { authProvidersSchema } from './index.js';

export const useCases = defineUseCases(authProvidersSchema, [
  {
    slug: '01-rotate-the-sso-credentials',
    title: 'Set the credentials of a single sign-on provider in each environment',
    given: { TestAuthProvider: { consumerKey: 'acme-portal-uat', consumerSecret: 'uat-secret' } },
    config: { TestAuthProvider: { consumerKey: 'acme-portal-production', consumerSecret: '${PARTNER_SSO_SECRET}' } },
    notIdempotent: 'Salesforce never shows the consumer secret again, so every run sets it',
    story: [
      "Acme's partners log in to its community with their own OpenID Connect identity provider. The Auth. Provider is deployed with the Metadata API, but each environment talks to a different client of the identity provider, and the Metadata API only exports the consumer secret as a placeholder and only deploys a value encrypted by the org itself: the real secret has to be typed in Setup in each environment.",
      'This config sets the **Consumer Key (1)** and the **Consumer Secret (2)** of the Auth. Provider named `TestAuthProvider` (its API name, the key of the entry). The secret comes from the environment variable `PARTNER_SSO_SECRET` of the pipeline, never from the file, and `apply` masks it in its output. Setup never shows a secret back, so Browserforce cannot compare it: every `apply` writes both values again.',
    ],
    captures: {
      'auth-provider': {
        pills: {
          'TestAuthProvider.consumerKey': { px: 34, py: 27.5 },
          'TestAuthProvider.consumerSecret': { px: 34, py: 30.3 },
        },
      },
    },
    async shoot(doc) {
      const authProviderId = await doc.recordId("SELECT Id FROM AuthProvider WHERE DeveloperName = 'TestAuthProvider'");
      await using page = await doc.open(`/${authProviderId}`);
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('auth-provider', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock.brandSecondaryBrd')],
        pills: {
          'TestAuthProvider.consumerKey': ui.locator('td.labelCol:text-is("Consumer Key") + td'),
          'TestAuthProvider.consumerSecret': ui.locator('td.labelCol:text-is("Consumer Secret") + td'),
        },
      });
    },
  },
]);
