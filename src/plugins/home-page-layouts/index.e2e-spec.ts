import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import HomePageLayouts from '.';

describe(HomePageLayouts.name, () => {
  it('should assign the home page default', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const assignHomePageDefaultCmd = child.spawnSync(
      path.resolve('bin', 'run'),
      [
        'browserforce:apply',
        '-f',
        path.resolve(path.join(__dirname, 'home-page-default.json'))
      ]
    );
    assert.deepEqual(
      assignHomePageDefaultCmd.status,
      0,
      assignHomePageDefaultCmd.output.toString()
    );
    assert(
      /'\[{"profile":"Standard User","layout":""},{"profile":"System Administrator","layout":""}\]'/.test(
        assignHomePageDefaultCmd.output.toString()
      ),
      assignHomePageDefaultCmd.output.toString()
    );
  });
  it('should assign the org default', function() {
    this.timeout(1000 * 60);
    this.slow(1000 * 15);
    const assignOrgDefaultCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'org-default.json'))
    ]);
    assert.deepEqual(
      assignOrgDefaultCmd.status,
      0,
      assignOrgDefaultCmd.output.toString()
    );
    assert(
      /'\[{"profile":"Standard User","layout":"DE Default"},{"profile":"System Administrator","layout":"DE Default"}\]'/.test(
        assignOrgDefaultCmd.output.toString()
      ),
      assignOrgDefaultCmd.output.toString()
    );
  });
});
