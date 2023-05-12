import assert from 'assert';
import * as child from 'child_process';
import * as path from 'path';
import { CompanyInformation } from '.';
import Os from 'os';

describe(CompanyInformation.name, function () {
  this.slow('30s');
  this.timeout('2m');

  const execStr = path.resolve('bin', Os.platform().startsWith('win') ? 'run.cmd' : 'run');

  it('should set the currency to "English (South Africa) - ZAR" for next steps', () => {
    const bffile = path.join(__dirname, 'currency-zar.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.deepStrictEqual(apply.status, 0, apply.output.toString());
    // no additional assertions are done here as this is a preparation for the followup tests
  });
  it('should change currency to "English (Ireland) - EUR"', () => {
    const bffile = path.join(__dirname, 'currency-ireland.json');
    const apply = child.spawnSync(execStr, [
      'browserforce:apply',
      '-f',
      bffile
    ]);
    assert.deepStrictEqual(apply.status, 0, apply.output.toString());
    assert.ok(
      /to '"English \(Ireland\) - EUR"'/.test(apply.output.toString()),
      apply.output.toString()
    );
  });
  it('should respond to no action necessary for currency change', () => {
    const bffile = path.join(__dirname, 'currency-ireland.json');
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
