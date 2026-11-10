import { defineUseCases } from '../../../scripts/use-cases.js';
import { CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR } from './available-custom-objects/index.js';
import { customerPortalSchema } from './index.js';

export const useCases = defineUseCases(customerPortalSchema, [
  {
    slug: '01-enable-the-customer-portal',
    title: 'Enable the Customer Portal with its default portal',
    config: { enabled: true },
    restore: false,
    story: [
      'Acme still serves its older customers through a Salesforce Classic Customer Portal, and every new sandbox or scratch org of its developers needs it. The Metadata API can turn on `OrgSettings.enableCustomerSuccessPortal`, but only Setup also creates the portal named **Customer Portal**, with the current user as its administrator and email sender, which the next use cases configure.',
      'This config ticks **Enable Customer Portal (1)**. It cannot be turned off afterwards, so Browserforce only ever enables it.',
    ],
    async shoot(doc) {
      await using page = await doc.open('/_ui/core/portal/CustomerSuccessPortalSetup/d');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('customer-portal-setup', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: {
          enabled: ui.locator(
            'td.labelCol:text-is("Enable Customer Portal") + td, tr.dataRow:has(a:text-is("Customer Portal"))',
          ),
        },
      });
    },
  },
  {
    slug: '02-choose-the-portal-profiles',
    title: 'Choose the profiles of the portal and its self-registration',
    given: {
      enabled: true,
      portals: [
        {
          name: 'Customer Portal',
          isSelfRegistrationActivated: false,
          portalProfileMemberships: [{ name: 'Dummy', active: false }],
        },
      ],
    },
    config: {
      enabled: true,
      portals: [
        {
          name: 'Customer Portal',
          adminUser: 'User User',
          description: 'Customer Portal',
          isSelfRegistrationActivated: true,
          selfRegUserDefaultLicense: 'Customer Portal Manager Custom',
          selfRegUserDefaultRole: 'User',
          selfRegUserDefaultProfile: 'Customer Portal Manager Custom',
          portalProfileMemberships: [{ name: 'Dummy', active: true }],
        },
      ],
    },
    story: [
      "Acme's distributors log in to the Customer Portal with their own profile, `Dummy` in this org, and must be able to register themselves. Which profiles may use a portal is set on the **Customer Portal Profiles** page of the portal: the `Profile` and `Portal` types of the Metadata API have no field for it.",
      'This config makes the profile `Dummy` **(1)** one of the assigned profiles of the portal named **Customer Portal**, and sets its self-registration defaults. Profiles that `portalProfileMemberships` does not list keep their setting.',
    ],
    withoutPill: {
      enabled: 'the Customer Portal must be enabled first (use case 1)',
      'portals[0].name': 'the portal whose profiles change',
      'portals[0].adminUser': 'also deployable with the Portal type of the Metadata API (admin)',
      'portals[0].description': 'also deployable with the Portal type of the Metadata API',
      'portals[0].isSelfRegistrationActivated': 'also deployable with the Portal type of the Metadata API',
      'portals[0].selfRegUserDefaultLicense': 'the license of the users who register themselves',
      'portals[0].selfRegUserDefaultRole': 'also deployable with the Portal type of the Metadata API',
      'portals[0].selfRegUserDefaultProfile': 'also deployable with the Portal type of the Metadata API',
    },
    captures: {
      'portal-profiles': {
        title: 'Profiles of the portal',
      },
    },
    async prepare(doc) {
      // the portal administrator (adminUser) needs the permission set of the fixtures (portals/sfdx-source)
      const connection = doc.browserforce.connection;
      const userId = (await connection.identity()).user_id;
      const permissionSet = await connection.singleRecordQuery<{ Id: string }>(
        "SELECT Id FROM PermissionSet WHERE Name = 'Customer_Portal_Admin'",
      );
      const assigned = await connection.query(
        `SELECT Id FROM PermissionSetAssignment WHERE AssigneeId = '${userId}' AND PermissionSetId = '${permissionSet.Id}'`,
      );
      if (assigned.totalSize === 0) {
        await connection
          .sobject('PermissionSetAssignment')
          .create({ AssigneeId: userId, PermissionSetId: permissionSet.Id });
      }
    },
    async shoot(doc) {
      await using page = await doc.open('/_ui/core/portal/CustomerSuccessPortalSetup/d', { height: 2600 });
      await doc.click(page, 'tr.dataRow a:text-is("Customer Portal")');
      const ui = await doc.within(page, '.bRelatedList:has(h3:text-is("Assigned Profiles"))');
      await doc.shot('portal-profiles', page, {
        context: [ui.locator('.bRelatedList:has(h3:text-is("Assigned Profiles"))')],
        hide: [
          ui.locator('tr:has(> td.labelCol:text-is("From Email Address"))'),
          ui.locator('tr:has(> td.labelCol:text-is("From Email Name"))'),
        ],
        pills: {
          'portals[0].portalProfileMemberships': {
            locator: ui.locator('.bRelatedList:has(h3:text-is("Assigned Profiles")) a:text-is("Dummy")'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '03-rename-the-portal',
    title: 'Rename the portal',
    given: { enabled: true, portals: [{ name: 'Customer Portal', oldName: 'Acme Support' }] },
    config: { enabled: true, portals: [{ name: 'Acme Support', oldName: 'Customer Portal' }] },
    story: [
      'The portal created by Setup is named Customer Portal, and Acme wants its customers to see **Acme Support** in the emails and pages of the portal. The `Portal` type of the Metadata API identifies a portal by its name, so a deployment cannot rename it: it would look for a portal of the new name.',
      '`oldName` **(1)** finds the portal, and `name` **(2)** is its new name. Once renamed, a second `apply` finds no portal named Customer Portal but one named Acme Support, and does nothing.',
    ],
    withoutPill: {
      enabled: 'the Customer Portal must be enabled first (use case 1)',
    },
    async shoot(doc) {
      await using page = await doc.open('/_ui/core/portal/CustomerSuccessPortalSetup/d');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('portals', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('.bPageBlock')],
        pills: {
          'portals[0].oldName': { locator: ui.locator('tr.dataRow a:text-is("Customer Portal")'), in: 'before' },
          'portals[0].name': { locator: ui.locator('tr.dataRow a:text-is("Acme Support")'), in: 'after' },
        },
      });
    },
  },
  {
    slug: '04-make-a-custom-object-available',
    title: 'Make custom objects available in the portal',
    given: {
      enabled: true,
      availableCustomObjects: [
        { name: 'Dummy', available: false },
        { name: 'Quote', namespacePrefix: 'SBQQ', available: false },
      ],
    },
    config: {
      enabled: true,
      availableCustomObjects: [
        { name: 'Dummy', available: true },
        { name: 'Quote', namespacePrefix: 'SBQQ', available: true },
      ],
    },
    story: [
      "Acme's customers must see their Dummy records and their Salesforce CPQ quotes in the portal. A custom object only appears in a Customer Portal once **Available for Customer Portal** is ticked in the definition of the object, an option of its Setup page.",
      'This config ticks it for `Dummy__c` **(1)** and for the `SBQQ__Quote__c` object of Salesforce CPQ **(2)**: an object is named by its API name without suffix, with its `namespacePrefix` when it comes from a managed package. `available: false` removes an object from the portal.',
    ],
    withoutPill: {
      enabled: 'the Customer Portal must be enabled first (use case 1)',
      'availableCustomObjects[0].name': 'the API name of the object, without its __c suffix',
      'availableCustomObjects[1].name': 'the API name of the object, without its namespace and __c suffix',
      'availableCustomObjects[1].namespacePrefix':
        'the namespace of the managed package of the object, SBQQ for Salesforce CPQ',
    },
    captures: {
      dummy: {
        title: 'The custom object Dummy__c',
        pills: { 'availableCustomObjects[0].available': { px: 47.3, py: 50 } },
      },
      'cpq-quote': {
        title: 'The Quote object of Salesforce CPQ (SBQQ__Quote__c)',
        pills: { 'availableCustomObjects[1].available': { px: 47.3, py: 50 } },
      },
    },
    async shoot(doc) {
      {
        const customObjectId = await doc.recordId(
          "SELECT Id FROM CustomObject WHERE DeveloperName = 'Dummy' AND NamespacePrefix = null",
          { tooling: true },
        );
        await using page = await doc.open(
          `/lightning/setup/ObjectManager/${customObjectId}/edit?nodeId=ObjectManager&address=%2F${customObjectId}%2Fe`,
          { height: 1400 },
        );
        const ui = await doc.within(page, CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR);
        await doc.shot('dummy', page, {
          pills: {
            'availableCustomObjects[0].available': ui.locator(CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR),
          },
        });
      }
      {
        const customObjectId2 = await doc.recordId(
          "SELECT Id FROM CustomObject WHERE DeveloperName = 'Quote' AND NamespacePrefix = 'SBQQ'",
          { tooling: true },
        );
        await using page = await doc.open(
          `/lightning/setup/ObjectManager/${customObjectId2}/edit?nodeId=ObjectManager&address=%2F${customObjectId2}%2Fe`,
          { height: 1400 },
        );
        const ui = await doc.within(page, CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR);
        await doc.shot('cpq-quote', page, {
          pills: {
            'availableCustomObjects[1].available': ui.locator(CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR),
          },
        });
      }
    },
  },
]);
