import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import CustomerPortalAvailableCustomObjects from '.';

describe(CustomerPortalAvailableCustomObjects.name, () => {
  it('should fail to make non-existent custom objects available for customer portal', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const setupPortalCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'definition.json'))
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
      path.resolve(path.join(__dirname, 'sfdx-source'))
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
      path.resolve(path.join(__dirname, 'definition.json'))
    ]);
    assert.deepEqual(
      setupCustomObjectsCmd.status,
      0,
      setupCustomObjectsCmd.output.toString()
    );
    assert(
      /changing 'availableCustomObjects' to '\[{"name":"Dummy"/.test(
        setupCustomObjectsCmd.output.toString()
      ),
      setupCustomObjectsCmd.output.toString()
    );
  });
});
