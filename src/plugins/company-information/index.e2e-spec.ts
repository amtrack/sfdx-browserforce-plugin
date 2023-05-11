import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { CompanyInformation } from '.';

describe(CompanyInformation.name, function () {
  this.slow('30s');
  this.timeout('2m');

  // Note order is important here, the scratch org will be created with all access set, I have placed last so if a scratch is reused at least it is in the same state
  it('should change currency to "English (South Africa) - ZAR"', () => {
    const execStr = path.resolve('bin', 'run');
    const bffile = path.join(__dirname, 'currency-eng-zar.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.deepStrictEqual(apply.status, 0, apply.output.toString());
    assert.ok(
      /to '"English (South Africa) - ZAR"'/.test(apply.output.toString()),
      apply.output.toString()
    );
  });
  it('should change currency to "English (Ireland) - EUR"', () => {
    const execStr = path.resolve('bin', 'run');
    const bffile = path.join(__dirname, 'currency-eng-ireland.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.deepStrictEqual(apply.status, 0, apply.output.toString());
    assert.ok(
      /to '"English (Ireland) - EUR"'/.test(apply.output.toString()),
      apply.output.toString()
    );
  });
  it('should respond to no action necessary for currency change', () => {
    const execStr = path.resolve('bin', 'run');
    const bffile = path.join(__dirname, 'currency-eng-ireland.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.deepStrictEqual(apply.status, 0, apply.output.toString());
    assert.ok(
      /no action necessary/.test(apply.output.toString()),
      apply.output.toString()
    );
  });
  it('should error on invalid input for invalid currency', () => {
    const execStr = path.resolve('bin', 'run');
    const bffile = path.join(__dirname, 'currency-invalid.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.notDeepStrictEqual(apply.status, 0, apply.output.toString());
    assert.ok(
      /Invalid currency provided/.test(apply.output.toString()),
      apply.output.toString()
    );
  });
});
