import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { DensitySettings } from '.';

describe(DensitySettings.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should set to Compact', () => {
    const setCompactCommand = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'compact.json'))
    ]);
    assert.deepStrictEqual(
      setCompactCommand.status,
      0,
      setCompactCommand.output.toString()
    );
    assert.ok(
      /to '"Compact"'/.test(setCompactCommand.output.toString()),
      setCompactCommand.output.toString()
    );
  });
  it('should already be set to Compact', () => {
    const setCompactCommand2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'compact.json'))
    ]);
    assert.deepStrictEqual(
      setCompactCommand2.status,
      0,
      setCompactCommand2.output.toString()
    );
    assert.ok(
      /no action necessary/.test(setCompactCommand2.output.toString()),
      setCompactCommand2.output.toString()
    );
  });
  it('should set to Comfy', () => {
    const setComfyCommand = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'comfy.json'))
    ]);
    assert.deepStrictEqual(
      setComfyCommand.status,
      0,
      setComfyCommand.output.toString()
    );
    assert.ok(
      /to '"Comfy"'/.test(setComfyCommand.output.toString()),
      setComfyCommand.output.toString()
    );
  });
  it('should already be set to Comfy', () => {
    const setComfyCommand2 = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'comfy.json'))
    ]);
    assert.deepStrictEqual(
      setComfyCommand2.status,
      0,
      setComfyCommand2.output.toString()
    );
    assert.ok(
      /no action necessary/.test(setComfyCommand2.output.toString()),
      setComfyCommand2.output.toString()
    );
  });
});
