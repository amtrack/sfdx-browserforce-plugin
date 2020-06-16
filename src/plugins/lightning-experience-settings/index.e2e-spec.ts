import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import LightningExperienceSettings from '.';

describe(LightningExperienceSettings.name, () => {
  it('should activate LightningLite theme', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate-lightning-lite.json'))
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'activeThemeName' to '"LightningLite"'/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('LightningLite theme should already be activated', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'activate-lightning-lite.json')
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should activate Lightning theme', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate-lightning.json'))
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /changing 'activeThemeName' to '"Lightning"'/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('Lightning theme should already be activated', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'activate-lightning.json')
    ]);
    assert.deepEqual(cmd.status, 0, cmd.output.toString());
    assert(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
});
