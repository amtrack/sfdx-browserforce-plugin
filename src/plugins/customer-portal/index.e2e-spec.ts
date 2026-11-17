import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import {
  CustomerPortalAvailableCustomObjects,
  CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR,
} from './available-custom-objects/index.js';
import { CustomerPortalEnable } from './enabled/index.js';
import { CustomerPortalSetup, LIST_VIEW_PATH } from './portals/index.js';
import { customerPortalSchema } from './index.js';
import { capture } from '../../../test/capture.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('CustomerPortal', () => {
  describe(CustomerPortalEnable.name, function () {
    let plugin: CustomerPortalEnable;
    before(() => {
      plugin = new CustomerPortalEnable(global.browserforce);
    });

    it(
      'should enable @capture',
      capture(customerPortalSchema, {
        config: { enabled: true },
        pages: {
          'customer-portal-setup': {
            open: (doc) => doc.open(LIST_VIEW_PATH),
            context: ['.bPageTitle', '.bPageBlock'],
            pills: {
              enabled:
                'td.labelCol:text-is("Enable Customer Portal") + td, tr.dataRow:has(a:text-is("Customer Portal"))',
            },
          },
        },
      }),
    );
    it('should be enabled', async () => {
      const res = await plugin.retrieve();
      assert.deepStrictEqual(res, true);
    });
    it('should fail to disable', async () => {
      let err;
      try {
        await plugin.run(false);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /cannot be disabled/);
    });
  });

  describe(CustomerPortalSetup.name, function () {
    let plugin: CustomerPortalSetup;
    before(() => {
      plugin = new CustomerPortalSetup(global.browserforce);
    });

    const configSetPortalAdmin = [
      {
        name: 'Customer Portal',
        adminUser: 'User User',
        isSelfRegistrationActivated: true,
      },
    ];
    const configSetupPortal = [
      {
        name: 'Foo Portal',
        oldName: 'Customer Portal',
        description: 'Foo Portal',
        adminUser: 'User User',
        isSelfRegistrationActivated: true,
        selfRegUserDefaultLicense: 'Customer Portal Manager Custom',
        selfRegUserDefaultRole: 'User',
        selfRegUserDefaultProfile: 'Customer Portal Manager Custom',
        portalProfileMemberships: [
          {
            name: 'Customer Portal Manager Standard',
            active: false,
          },
          {
            name: 'Dummy',
            active: true,
          },
        ],
      },
    ];
    const configRevertPortal = [
      {
        name: 'Customer Portal',
        oldName: 'Foo Portal',
        description: 'Customer Portal',
        isSelfRegistrationActivated: false,
      },
    ];
    const dir = path.resolve(path.join(__dirname, 'portals'));
    it('should fail to set portal admin user without permset', async () => {
      let err;
      try {
        await plugin.run(configSetPortalAdmin);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /This user has insufficient permissions to be a portal administrator/);
    });
    it('should set up user for portal', async () => {
      const sourceDeployCmd = child.spawnSync('sf', [
        'project',
        'deploy',
        'start',
        '-d',
        path.join(dir, 'sfdx-source'),
        '--json',
      ]);
      assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
      const permSetAssignCmd = child.spawnSync('sf', ['org', 'assign', 'permset', '-n', 'Customer_Portal_Admin']);
      assert.deepStrictEqual(permSetAssignCmd.status, 0, permSetAssignCmd.output.toString());
    });
    it(
      'should choose the profiles of the portal @capture',
      capture(customerPortalSchema, {
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
        pages: {
          'portal-profiles': {
            title: 'Profiles of the portal',
            height: 2600,
            async open(doc) {
              const page = await doc.open(LIST_VIEW_PATH);
              await doc.click(page, 'tr.dataRow a:text-is("Customer Portal")');
              return page;
            },
            context: ['.bRelatedList:has(h3:text-is("Assigned Profiles"))'],
            hide: [
              'tr:has(> td.labelCol:text-is("From Email Address"))',
              'tr:has(> td.labelCol:text-is("From Email Name"))',
            ],
            pills: {
              'portals[0].portalProfileMemberships':
                '.bRelatedList:has(h3:text-is("Assigned Profiles")) a:text-is("Dummy")',
            },
          },
        },
      }),
    );
    it('should set up portal', async () => {
      await plugin.run(configSetupPortal);
    });
    it('portal should be set up', async () => {
      const res = await plugin.run(configSetupPortal);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should revert back', async () => {
      await plugin.run(configRevertPortal);
    });
    it('should be reverted back', async () => {
      const res = await plugin.run(configRevertPortal);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it(
      'should rename the portal @capture',
      capture(customerPortalSchema, {
        config: { enabled: true, portals: [{ name: 'Acme Support', oldName: 'Customer Portal' }] },
        // the portal before its rename
        screenshot: 'before',
        pages: {
          portals: {
            // retrieve() then opens the page of each portal
            path: LIST_VIEW_PATH,
            context: ['.bPageTitle', '.bPageBlock'],
            pills: {
              'portals[0].oldName': 'tr.dataRow a:text-is("Customer Portal")',
            },
          },
        },
      }),
    );
    it('should rename the portal back', async () => {
      await plugin.run([{ name: 'Customer Portal', oldName: 'Acme Support' }]);
    });
    it('should cleanup', async () => {
      await global.browserforce.connection.metadata.delete('Profile', ['Dummy']);
      const result = await global.browserforce.connection.query(
        "SELECT Id FROM PermissionSetAssignment WHERE PermissionSet.Name='Customer_Portal_Admin'",
      );
      if (result.records.length) {
        await global.browserforce.connection.delete(
          'PermissionSetAssignment',
          result.records.map((rec) => rec.Id),
        );
      }
      await global.browserforce.connection.metadata.delete('PermissionSet', ['Customer_Portal_Admin']);
    });
  });

  describe(CustomerPortalAvailableCustomObjects.name, function () {
    let plugin: CustomerPortalAvailableCustomObjects;
    before(() => {
      plugin = new CustomerPortalAvailableCustomObjects(global.browserforce);
    });

    const configAvailableCustomObjects = [
      {
        name: 'Dummy',
        available: true,
      },
    ];
    const configNonAvailableCustomObjects = [
      {
        name: 'DummyXYZ',
        available: true,
      },
    ];
    const configUnavailableCustomObjects = [
      {
        name: 'Dummy',
        available: false,
      },
    ];

    const dir = path.resolve(path.join(__dirname, 'available-custom-objects'));
    it('should fail to make non-existent custom objects available for customer portal', async () => {
      let err;
      try {
        await plugin.run(configNonAvailableCustomObjects);
      } catch (e) {
        err = e;
      }
      assert.throws(() => {
        throw err;
      }, /Could not find CustomObject/);
    });
    it('should deploy custom object', () => {
      const sourceDeployCmd = child.spawnSync('sf', [
        'project',
        'deploy',
        'start',
        '-d',
        path.join(dir, 'sfdx-source'),
        '--json',
      ]);
      assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
    });
    (process.env['CPQ'] === 'true' ? it : it.skip)(
      'should make a custom object and the quotes of Salesforce CPQ available @capture',
      capture(customerPortalSchema, {
        config: {
          enabled: true,
          availableCustomObjects: [
            { name: 'Dummy', available: true },
            { name: 'Quote', namespacePrefix: 'SBQQ', available: true },
          ],
        },
        // the edit pages of the objects, in the order of the config, not the home page retrieve() opens first
        pages: {
          dummy: {
            title: 'The custom object Dummy__c',
            positions: { 'availableCustomObjects[0].available': { px: 47.3, py: 50 } },
            path: 'ObjectManager',
            height: 1400,
            pills: {
              'availableCustomObjects[0].available': CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR,
            },
          },
          'cpq-quote': {
            title: 'The Quote object of Salesforce CPQ (SBQQ__Quote__c)',
            positions: { 'availableCustomObjects[1].available': { px: 47.3, py: 50 } },
            path: 'ObjectManager',
            height: 1400,
            pills: {
              'availableCustomObjects[1].available': CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR,
            },
          },
        },
      }),
    );
    it('should make custom objects available for customer portal', async () => {
      await plugin.run(configAvailableCustomObjects);
    });
    it('should have applied checkbox available for customer portal', async () => {
      const res = await plugin.run(configAvailableCustomObjects);
      assert.deepStrictEqual(res, { message: 'no action necessary' });
    });
    it('should make custom objects unavailable for customer portal', async () => {
      await plugin.run(configUnavailableCustomObjects);
    });
    it('should remove the CustomObject', async () => {
      await global.browserforce.connection.metadata.delete('CustomObject', ['Dummy__c']);
    });
  });
});
