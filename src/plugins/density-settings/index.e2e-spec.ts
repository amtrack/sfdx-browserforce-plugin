import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import DensitySettings from '.';

describe(DensitySettings.name, () => {
  it('should set to Compact', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const setCompactCommand = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'compact.json'))
    ]);
    assert.deepEqual(
      setCompactCommand.status,
      0,
      setCompactCommand.output.toString()
    );
    assert(
      /to '"Compact"'/.test(setCompactCommand.output.toString()),
      setCompactCommand.output.toString()
    );
  });
  it('should already be set to Compact', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const setCompactCommand2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'compact.json'))
    ]);
    assert.deepEqual(
      setCompactCommand2.status,
      0,
      setCompactCommand2.output.toString()
    );
    assert(
      /no action necessary/.test(setCompactCommand2.output.toString()),
      setCompactCommand2.output.toString()
    );
  });
  it('should set to Comfy', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const setComfyCommand = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'comfy.json'))
    ]);
    assert.deepEqual(
      setComfyCommand.status,
      0,
      setComfyCommand.output.toString()
    );
    assert(
      /to '"Comfy"'/.test(setComfyCommand.output.toString()),
      setComfyCommand.output.toString()
    );
  });
  it('should already be set to Comfy', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const setComfyCommand2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'comfy.json'))
    ]);
    assert.deepEqual(
      setComfyCommand2.status,
      0,
      setComfyCommand2.output.toString()
    );
    assert(
      /no action necessary/.test(setComfyCommand2.output.toString()),
      setComfyCommand2.output.toString()
    );
  });
});
