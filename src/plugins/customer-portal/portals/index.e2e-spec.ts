import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import CustomerPortal from '.';

describe(CustomerPortal.name, () => {
  describe('portals', () => {
    it('should fail to set portal admin user without permset', function() {
      this.timeout(1000 * 60);
      this.slow(1000 * 15);
      const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
        'browserforce:apply',
        '-f',
        path.resolve(path.join(__dirname, 'set-portal-admin.json'))
      ]);
      assert.deepEqual(
        setupPortalCmd.status,
        1,
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to '\[{"name":"Customer Portal"/.test(
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
        path.resolve(path.join(__dirname, 'sfdx-source'))
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
        path.resolve(path.join(__dirname, 'setup-portal.json'))
      ]);
      assert.deepEqual(
        setupPortalCmd.status,
        0,
        setupPortalCmd.output.toString()
      );
      assert(
        /changing 'portals' to '\[{"name":"Foo Portal"/.test(
          setupPortalCmd.output.toString()
        ),
        setupPortalCmd.output.toString()
      );
    });
  });
});
