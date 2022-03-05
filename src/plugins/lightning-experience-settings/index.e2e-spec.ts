import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { LightningExperienceSettings } from '.';

describe(LightningExperienceSettings.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should activate LightningLite theme', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate-lightning-lite.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /changing 'activeThemeName' to '"LightningLite"'/.test(
        cmd.output.toString()
      ),
      cmd.output.toString()
    );
  });
  it('LightningLite theme should already be activated', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'activate-lightning-lite.json')
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('should activate Lightning theme', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'activate-lightning.json'))
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /changing 'activeThemeName' to '"Lightning"'/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
  it('Lightning theme should already be activated', () => {
    const cmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'activate-lightning.json')
    ]);
    assert.deepStrictEqual(cmd.status, 0, cmd.output.toString());
    assert.ok(
      /no action necessary/.test(cmd.output.toString()),
      cmd.output.toString()
    );
  });
});
