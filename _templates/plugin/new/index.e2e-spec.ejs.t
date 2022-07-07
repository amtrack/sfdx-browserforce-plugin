---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.e2e-spec.ts
---
import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { <%= h.changeCase.pascalCase(name) %> } from '.';

describe(<%= h.changeCase.pascalCase(name) %>.name, function() {
  this.slow('30s');
  this.timeout('2m');
  it('should enable', () => {
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'enable.json'))
    ]);
    assert.deepStrictEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /to 'true'/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should already be enabled', () => {
    const enableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'enable.json')
    ]);
    assert.deepStrictEqual(enableCmd.status, 0, enableCmd.output.toString());
    assert(
      /no action necessary/.test(enableCmd.output.toString()),
      enableCmd.output.toString()
    );
  });
  it('should disable', () => {
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'disable.json'))
    ]);
    assert.deepStrictEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert(
      /to 'false'/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
  it('should already be disabled', () => {
    const disableCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'disable.json')
    ]);
    assert.deepStrictEqual(disableCmd.status, 0, disableCmd.output.toString());
    assert(
      /no action necessary/.test(disableCmd.output.toString()),
      disableCmd.output.toString()
    );
  });
});
