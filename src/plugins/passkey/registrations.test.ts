import assert from 'assert';
import { parseRegistrationCount, parseRegistrationId } from './registrations.js';

describe('parseRegistrationId', () => {
  it('should parse the Registration id of a passkey delete link', () => {
    assert.strictEqual(
      parseRegistrationId('/setup/secur/RemoteAccessAuthorizationPage.apexp?delID=0moRR0000000uzt&retURL=%2F005'),
      '0moRR0000000uzt',
    );
  });
  it('should refuse the delete link of another related list', () => {
    // this mis-click removed a permission set assignment during the POC
    assert.throws(
      () => parseRegistrationId('/p/setup/perm/PermSetAssignment?delID=0Pa000000000000'),
      /refusing to click the delete link .*: the record id '0Pa000000000000' is not a passkey Registration \(0mo\)/,
    );
  });
  it('should fail on a link without a delID', () => {
    assert.throws(() => parseRegistrationId('/005RR000000abcd'), /could not parse a delID/);
  });
  it('should fail on a missing href', () => {
    assert.throws(() => parseRegistrationId(null), /could not parse a delID/);
  });
});

describe('parseRegistrationCount', () => {
  it('should read the related list count', () => {
    assert.strictEqual(parseRegistrationCount('Permission Set Assignments[3]\nBuilt-in Authenticators[2]\n'), 2);
  });
  it('should read a count of zero', () => {
    assert.strictEqual(parseRegistrationCount('Built-in Authenticators[0]'), 0);
  });
  it('should return undefined when the related list is not rendered', () => {
    assert.strictEqual(parseRegistrationCount('Permission Set Assignments[3]'), undefined);
  });
});
