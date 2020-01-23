---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.e2e-spec.ts
---
import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import <%= h.changeCase.pascalCase(name) %> from '.';

describe(<%= h.changeCase.pascalCase(name) %>.name, () => {
  it('should enable', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable.json'))
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /to 'true'/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should already be enabled', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'enable.json')
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /no action necessary/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should disable', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable.json'))
    ]);
    assert.deepEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert(
      /to 'false'/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
  it('should already be disabled', function() {
    this.timeout(1000 * 90);
    this.slow(1000 * 30);
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'disable.json')
    ]);
    assert.deepEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert(
      /no action necessary/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
});
