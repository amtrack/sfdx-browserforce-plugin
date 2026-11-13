import { defineUseCases } from '../../../scripts/use-cases.js';
import { securitySchema } from './index.js';

export const useCases = defineUseCases(securitySchema, [
  {
    slug: '01-import-a-certificate-from-a-keystore',
    title: 'Import a certificate and its private key from a keystore',
    config: {
      certificateAndKeyManagement: {
        importFromKeystore: [
          { name: 'Dummy', filePath: './src/plugins/security/certificate-and-key-management/Dummy.jks', password: '' },
        ],
        certificates: [{ name: 'AcmeSelfSigned', label: 'Acme Self Signed', keysize: 2048, exportable: true }],
      },
    },
    restore: false,
    story: [
      'Acme signs the SAML assertions of its identity provider with a certificate issued by its own certificate authority, and the same certificate and private key must exist in every org that acts as identity provider. Salesforce does not let any API import a private key: the only way in is the **Import from Keystore** button of Certificate and Key Management, which uploads a Java keystore (JKS).',
      'This config uploads the keystore file at `filePath`, relative to the folder where `apply` runs, and the certificate appears as **Dummy (1)**, the name Salesforce gives it from the keystore alias (in lowercase unless `name` changes its case). The same config can create self-signed certificates with `certificates`, although the Metadata API can do that too. The org must act as an identity provider first.',
    ],
    withoutPill: {
      'certificateAndKeyManagement.importFromKeystore[0].filePath':
        'the keystore file uploaded from the computer that runs Browserforce',
      'certificateAndKeyManagement.importFromKeystore[0].password':
        'the keystore password, empty for this test keystore; use an environment variable such as ${KEYSTORE_PASSWORD}',
      'certificateAndKeyManagement.certificates[0].name':
        'a self-signed certificate, which the Certificate type of the Metadata API can also create',
      'certificateAndKeyManagement.certificates[0].label':
        'a self-signed certificate, which the Certificate type of the Metadata API can also create',
      'certificateAndKeyManagement.certificates[0].keysize':
        'a self-signed certificate, which the Certificate type of the Metadata API can also create',
      'certificateAndKeyManagement.certificates[0].exportable':
        'a self-signed certificate, which the Certificate type of the Metadata API can also create',
    },
    async prepare(doc) {
      // the certificates of a previous run: a keystore cannot be imported over its certificate
      await doc.browserforce.connection.metadata.delete('Certificate', ['Dummy', 'AcmeSelfSigned']);
    },
    async shoot(doc) {
      await using page = await doc.open('/0P1');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('certificates', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bRelatedList, .listRelatedObject, .bPageBlock')],
        pills: {
          'certificateAndKeyManagement.importFromKeystore[0].name': {
            locator: ui.locator('tr.dataRow:has(:text-matches("^dummy$", "i"))'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '02-offer-single-sign-on-on-the-login-page',
    title: 'Offer single sign-on on the login page of My Domain',
    given: { authenticationConfiguration: { services: [{ authProviderApiName: 'TestAuthMethod', enabled: false }] } },
    config: {
      authenticationConfiguration: {
        services: [
          { authProviderApiName: 'TestAuthMethod', enabled: true },
          { label: 'Login Form', enabled: true },
        ],
      },
    },
    story: [
      "Acme's employees log in to Salesforce through the company's identity provider, set up as an Auth. Provider, while a few administrators keep a password as a fallback. The buttons of the My Domain login page come from its **Authentication Configuration** section, which no Metadata API setting holds: after each deployment of the Auth. Provider, an admin had to tick it there.",
      'This config ticks **(2)** the Auth. Provider **TestAuthMethod (1)**, named by its API name with `authProviderApiName`, and keeps the **Login Form (3)** ticked **(4)**, named by the label Setup shows with `label`. Services the config does not list stay as they are.',
    ],
    captures: {
      'authentication-configuration': {
        pills: {
          'authenticationConfiguration.services[0].enabled': { px: 42.5, py: 57.9 },
          'authenticationConfiguration.services[1].enabled': { px: 42.5, py: 41.7 },
        },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/OrgDomain/page?address=%2Fdomainname%2FEditLogin.apexp', {
        height: 1200,
      });
      const ui = await doc.within(page, 'label:text-is("TestAuthMethod")');
      await doc.shot('authentication-configuration', page, {
        hide: [ui.locator('input[type="file"]')],
        pills: {
          'authenticationConfiguration.services[0].authProviderApiName': ui.locator('label:text-is("TestAuthMethod")'),
          'authenticationConfiguration.services[0].enabled': ui.locator(
            'input.authOption:has(+ label:text-is("TestAuthMethod"))',
          ),
          'authenticationConfiguration.services[1].label': ui.locator('label:text-is("Login Form")'),
          'authenticationConfiguration.services[1].enabled': ui.locator('input.authOption[value="*login"]'),
        },
      });
    },
  },
]);
