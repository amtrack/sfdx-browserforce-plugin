import * as assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { EmailDeliverability } from '.';

describe(EmailDeliverability.name, function() {
  this.slow('30s');
  this.timeout('2m');
  // Note order is important here, the scratch org will be created with all access set, I have placed last so if a scratch is reused at least it is in the same state
  it('should set "no access"', () => {
    const applyNoAccessCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'no-access.json'))
    ]);
    assert.deepStrictEqual(applyNoAccessCmd.status, 0, applyNoAccessCmd.output.toString());
    assert(
      /to '"No access"'/.test(applyNoAccessCmd.output.toString()),
      applyNoAccessCmd.output.toString()
    );
  });
  it('should already be set to "no access"', () => {
    const applyNoAccessCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'no-access.json')
    ]);
    assert.deepStrictEqual(applyNoAccessCmd.status, 0, applyNoAccessCmd.output.toString());
    assert(
      /no action necessary/.test(applyNoAccessCmd.output.toString()),
      applyNoAccessCmd.output.toString()
    );
  });
  it('should set "syetem only"', () => {
    const systemEmailCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'system.json'))
    ]);
    assert.deepStrictEqual(systemEmailCmd.status, 0, systemEmailCmd.output.toString());
    assert(
      /to '"System email only"'/.test(systemEmailCmd.output.toString()),
      systemEmailCmd.output.toString()
    );
  });
  it('should already be set to no access', () => {
    const systemEmailCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'system.json')
    ]);
    assert.deepStrictEqual(systemEmailCmd.status, 0, systemEmailCmd.output.toString());
    assert(
      /no action necessary/.test(systemEmailCmd.output.toString()),
      systemEmailCmd.output.toString()
    );
  });
  it('should apply all email', () => {
    const applyAllCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.resolve(path.join(__dirname, 'all.json'))
    ]);
    assert.deepStrictEqual(applyAllCmd.status, 0, applyAllCmd.output.toString());
    assert(
      /to '"All email"'/.test(applyAllCmd.output.toString()),
      applyAllCmd.output.toString()
    );
  });
  it('should already be have all enabled', () => {
    const applyAllCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'all.json')
    ]);
    assert.deepStrictEqual(applyAllCmd.status, 0, applyAllCmd.output.toString());
    assert(
      /no action necessary/.test(applyAllCmd.output.toString()),
      applyAllCmd.output.toString()
    );
  });
  it('should error on invalid input', () => {
    const systemEmailCmd = child.spawnSync(path.resolve('bin', 'run'), [
      'browserforce:apply',
      '-f',
      path.join(__dirname, 'invalid.json')
    ]);
    assert.notDeepStrictEqual(systemEmailCmd.status, 0, systemEmailCmd.output.toString());
    assert(
      /Invalid email access level/.test(systemEmailCmd.output.toString()),
      systemEmailCmd.output.toString()
    );
  });
});
