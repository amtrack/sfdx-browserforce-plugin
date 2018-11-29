import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import CustomerPortalAvailableCustomObjects from './availableCustomObjects';
import CustomerPortalEnable from './enabled';
import CustomerPortalSetup from './portals';

describe(CustomerPortalEnable.name, () => {
  const dir = path.resolve(path.join(__dirname, 'enabled'));
  it('should enable', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'enable.json')
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /to 'true'/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should already be enabled', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'enable.json')
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /no action necessary/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should fail to disable', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'disable.json')
    ]);
    assert.deepEqual(disableCmd.status, 1, disableCmd.output.toString());
    assert(
      /to 'false'/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
    assert(
      /cannot be disabled/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
});

describe(CustomerPortalSetup.name, () => {
  const dir = path.resolve(path.join(__dirname, 'portals'));
  describe('portals', () => {
    it('should fail to set portal admin user without permset', function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 15);
      const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
        'browserforce:apply',
        '-f',
        path.join(dir, 'set-portal-admin.json')
      ]);
      assert.deepEqual(
        setupPortalCmd.status,
        1,
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to .*"User User"/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
      assert(
        /This user has insufficient permissions to be a portal administrator/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
    });
    it('should setup user for portal', function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 15);
      const sourceDeployCmd = child.spawnSync('sfdx', [
        'force:source:deploy',
        '-p',
        path.join(dir, 'sfdx-source')
      ]);
      assert.deepEqual(
        sourceDeployCmd.status,
        0,
        sourceDeployCmd.output.toString()
      );
      assert(
        /Customer_Portal_Admin/.test(sourceDeployCmd.output.toString()),
        sourceDeployCmd.output.toString()
      );
      const permSetAssignCmd = child.spawnSync('sfdx', [
        'force:user:permset:assign',
        '-n',
        'Customer_Portal_Admin'
      ]);
      assert.deepEqual(
        permSetAssignCmd.status,
        0,
        permSetAssignCmd.output.toString()
      );
      assert(
        /Customer_Portal_Admin/.test(permSetAssignCmd.output.toString()),
        permSetAssignCmd.output.toString()
      );
    });
    it('should setup portal', function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 15);
      const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
        'browserforce:apply',
        '-f',
        path.join(dir, 'setup-portal.json')
      ]);
      assert.deepEqual(
        setupPortalCmd.status,
        0,
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to .*"name":"Foo Portal"/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to .*isSelfRegistrationActivated/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to .*portalProfileMemberships/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
    });
    it('should already be set up', function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 15);
      const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
        'browserforce:apply',
        '-f',
        path.join(dir, 'setup-portal.json')
      ]);
      assert.deepEqual(
        setupPortalCmd.status,
        0,
        setupPortalCmd.output.toString()
      );
      assert(
        /no action necessary/.test(setupPortalCmd.output.toString()),
        setupPortalCmd.output.toString()
      );
    });
  });
});

describe(CustomerPortalAvailableCustomObjects.name, () => {
  const dir = path.resolve(path.join(__dirname, 'availableCustomObjects'));
  it('should fail to make non-existent custom objects available for customer portal', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'available.json')
    ]);
    assert.deepEqual(
      setupPortalCmd.status,
      1,
      setupPortalCmd.output.toString()
    );
    assert(
      /Could not find CustomObject/.test(setupPortalCmd.output.toString()),
      setupPortalCmd.output.toString()
    );
  });
  it('should deploy custom object', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const sourceDeployCmd = child.spawnSync('sfdx', [
      'force:source:deploy',
      '-p',
      path.join(dir, 'sfdx-source')
    ]);
    assert.deepEqual(
      sourceDeployCmd.status,
      0,
      sourceDeployCmd.output.toString()
    );
    assert(
      /Dummy/.test(sourceDeployCmd.output.toString()),
      sourceDeployCmd.output.toString()
    );
  });
  it('should make custom objects available for customer portal', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const setupCustomObjectsCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'available.json')
    ]);
    assert.deepEqual(
      setupCustomObjectsCmd.status,
      0,
      setupCustomObjectsCmd.output.toString()
    );
    assert(
      /changing 'availableCustomObjects' to .*"available":true/.test(
        setupCustomObjectsCmd.output.toString()
      ),
      setupCustomObjectsCmd.output.toString()
    );
  });
  it('should have applied checkbox available for customer portal', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const setupCustomObjectsCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'available.json')
    ]);
    assert.deepEqual(
      setupCustomObjectsCmd.status,
      0,
      setupCustomObjectsCmd.output.toString()
    );
    assert(
      /no action necessary/.test(setupCustomObjectsCmd.output.toString()),
      setupCustomObjectsCmd.output.toString()
    );
  });
  it('should make custom objects unavailable for customer portal', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const setupCustomObjectsCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(dir, 'unavailable.json')
    ]);
    assert.deepEqual(
      setupCustomObjectsCmd.status,
      0,
      setupCustomObjectsCmd.output.toString()
    );
    assert(
      /changing 'availableCustomObjects' to .*"available":false/.test(
        setupCustomObjectsCmd.output.toString()
      ),
      setupCustomObjectsCmd.output.toString()
    );
  });
});
