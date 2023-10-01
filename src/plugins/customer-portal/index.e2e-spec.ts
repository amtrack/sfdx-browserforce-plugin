import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { CustomerPortalAvailableCustomObjects } from './available-custom-objects';
import { CustomerPortalEnable } from './enabled';
import { CustomerPortalSetup } from './portals';

describe('CustomerPortal', () => {
  describe(CustomerPortalEnable.name, function () {
    let plugin;
    before(() => {
      plugin = new CustomerPortalEnable(global.bf);
    });

    it('should enable', async () => {
      await plugin.run(true);
    });
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
    let plugin;
    before(() => {
      plugin = new CustomerPortalSetup(global.bf);
    });

    const configSetPortalAdmin = [
      {
        name: 'Customer Portal',
        adminUser: 'User User',
        isSelfRegistrationActivated: true
      }
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
            active: false
          },
          {
            name: 'Dummy',
            active: true
          }
        ]
      }
    ];
    const configRevertPortal = [
      {
        name: 'Customer Portal',
        oldName: 'Foo Portal',
        description: 'Customer Portal',
        isSelfRegistrationActivated: false
      }
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
      const sourceDeployCmd = child.spawnSync('sfdx', [
        'force:source:deploy',
        '-p',
        path.join(dir, 'sfdx-source'),
        '--json'
      ]);
      assert.deepStrictEqual(
        sourceDeployCmd.status,
        0,
        sourceDeployCmd.output.toString()
      );
      const stdout = JSON.parse(sourceDeployCmd.stdout.toString());
      assert.ok(
        stdout.result &&
          stdout.result.deployedSource &&
          stdout.result.deployedSource.find(
            (source) => source.fullName === 'Customer_Portal_Admin'
          ),
        sourceDeployCmd.output.toString()
      );
      const permSetAssignCmd = child.spawnSync('sfdx', [
        'force:user:permset:assign',
        '-n',
        'Customer_Portal_Admin'
      ]);
      assert.deepStrictEqual(
        permSetAssignCmd.status,
        0,
        permSetAssignCmd.output.toString()
      );
      assert.ok(
        /Customer_Portal_Admin/.test(permSetAssignCmd.output.toString()),
        permSetAssignCmd.output.toString()
      );
    });
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
    it('should cleanup', async () => {
      const conn = global.bf.org.getConnection();
      await conn.metadata.delete('Profile', ['Dummy']);
      const permSetUnassignCmd = child.spawnSync('sfdx', [
        'force:data:record:delete',
        '-s',
        'PermissionSetAssignment',
        '-w',
        'PermissionSet.Name=Customer_Portal_Admin'
      ]);
      assert.deepStrictEqual(
        permSetUnassignCmd.status,
        0,
        permSetUnassignCmd.output.toString()
      );
      assert.ok(
        /Successfully deleted record/.test(
          permSetUnassignCmd.output.toString()
        ),
        permSetUnassignCmd.output.toString()
      );
      await conn.metadata.delete('PermissionSet', ['Customer_Portal_Admin']);
    });
  });

  describe(CustomerPortalAvailableCustomObjects.name, function () {
    let plugin;
    before(() => {
      plugin = new CustomerPortalAvailableCustomObjects(global.bf);
    });

    const configAvailableCustomObjects = [
      {
        name: 'Dummy',
        available: true
      }
    ];
    const configNonAvailableCustomObjects = [
      {
        name: 'DummyXYZ',
        available: true
      }
    ];
    const configUnavailableCustomObjects = [
      {
        name: 'Dummy',
        available: false
      }
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
      const sourceDeployCmd = child.spawnSync('sfdx', [
        'force:source:deploy',
        '-p',
        path.join(dir, 'sfdx-source'),
        '--json'
      ]);
      assert.deepStrictEqual(
        sourceDeployCmd.status,
        0,
        sourceDeployCmd.output.toString()
      );
      const stdout = JSON.parse(sourceDeployCmd.stdout.toString());
      assert.ok(
        stdout.result &&
          stdout.result.deployedSource &&
          stdout.result.deployedSource.find(
            (source) => source.fullName === 'Dummy__c'
          ),
        sourceDeployCmd.output.toString()
      );
    });
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
      const conn = global.bf.org.getConnection();
      await conn.metadata.delete('CustomObject', ['Dummy__c']);
    });
  });
});
