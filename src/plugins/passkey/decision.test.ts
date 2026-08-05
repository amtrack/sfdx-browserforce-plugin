import assert from 'assert';
import { decide, partitionRegistrations, type PasskeyConfig, type PasskeyPlan, type PasskeyState } from './decision.js';

const OURS = '0moRR0000000uzt';
const FOREIGN = '0moRR0000000v37';
const CREDENTIAL_FILE = './sf-passkey-acme.my.salesforce.com.json';

function state(partial: Partial<PasskeyState> = {}): PasskeyState {
  const registrationIds = partial.registrationIds ?? [];
  const heldRegistrationId = 'heldRegistrationId' in partial ? partial.heldRegistrationId : undefined;
  return {
    registrationIds,
    heldRegistrationId,
    registered:
      partial.registered ?? (heldRegistrationId !== undefined && registrationIds.includes(heldRegistrationId)),
  };
}

type T = {
  description: string;
  state: PasskeyState;
  config: PasskeyConfig;
  expected: PasskeyPlan;
};

const tests: T[] = [
  {
    description: 'should enroll when the user has no Registration',
    state: state(),
    config: { registered: true, credentialFile: CREDENTIAL_FILE },
    expected: { action: 'enroll', credentialFile: CREDENTIAL_FILE },
  },
  {
    description: 'should enroll without persisting the Credential when no credentialFile is configured',
    state: state(),
    config: { registered: true },
    expected: { action: 'enroll', credentialFile: undefined },
  },
  {
    description: 'should do nothing when a Registration we hold the Credential for exists',
    state: state({ registrationIds: [OURS], heldRegistrationId: OURS }),
    config: { registered: true, credentialFile: CREDENTIAL_FILE },
    expected: { action: 'none' },
  },
  {
    description: 'should do nothing when our Registration coexists with a foreign one',
    state: state({ registrationIds: [FOREIGN, OURS], heldRegistrationId: OURS }),
    config: { registered: true, credentialFile: CREDENTIAL_FILE },
    expected: { action: 'none' },
  },
  {
    description: 'should refuse to enroll when a Registration we do not hold the Credential for exists',
    state: state({ registrationIds: [FOREIGN], heldRegistrationId: OURS }),
    config: { registered: true, credentialFile: CREDENTIAL_FILE },
    expected: {
      action: 'refuse',
      reason: `refusing to touch the passkey Registration(s) ${FOREIGN} of this user: the Credential in '${CREDENTIAL_FILE}' does not match it. A human may own it. Set 'force': true in the passkey settings to delete it anyway, but only if this user is a dedicated automation user.`,
    },
  },
  {
    description: 'should replace a foreign Registration when force is set',
    state: state({ registrationIds: [FOREIGN], heldRegistrationId: OURS }),
    config: { registered: true, credentialFile: CREDENTIAL_FILE, force: true },
    expected: { action: 'replace', registrationIds: [FOREIGN], credentialFile: CREDENTIAL_FILE },
  },
  {
    description: 'should delete our Registration',
    state: state({ registrationIds: [OURS], heldRegistrationId: OURS }),
    config: { registered: false, credentialFile: CREDENTIAL_FILE },
    expected: { action: 'delete', registrationIds: [OURS] },
  },
  {
    description: 'should do nothing when there is no Registration to delete',
    state: state({ heldRegistrationId: OURS }),
    config: { registered: false, credentialFile: CREDENTIAL_FILE },
    expected: { action: 'none' },
  },
  {
    description: 'should refuse to delete a Registration we do not hold the Credential for',
    state: state({ registrationIds: [FOREIGN], heldRegistrationId: OURS }),
    config: { registered: false, credentialFile: CREDENTIAL_FILE },
    expected: {
      action: 'refuse',
      reason: `refusing to touch the passkey Registration(s) ${FOREIGN} of this user: the Credential in '${CREDENTIAL_FILE}' does not match it. A human may own it. Set 'force': true in the passkey settings to delete it anyway, but only if this user is a dedicated automation user.`,
    },
  },
  {
    description: 'should refuse to delete any Registration when no credentialFile is configured',
    state: state({ registrationIds: [FOREIGN] }),
    config: { registered: false },
    expected: {
      action: 'refuse',
      reason: `refusing to touch the passkey Registration(s) ${FOREIGN} of this user: no 'credentialFile' is configured, so no Registration can be recognized as ours. A human may own it. Set 'force': true in the passkey settings to delete it anyway, but only if this user is a dedicated automation user.`,
    },
  },
  {
    description: 'should delete all Registrations when force is set',
    state: state({ registrationIds: [FOREIGN, OURS], heldRegistrationId: OURS }),
    config: { registered: false, credentialFile: CREDENTIAL_FILE, force: true },
    expected: { action: 'delete', registrationIds: [FOREIGN, OURS] },
  },
  {
    description: 'should refuse when registered is missing',
    state: state(),
    config: {} as PasskeyConfig,
    expected: {
      action: 'refuse',
      reason: `the passkey setting 'registered' is required and must be a boolean, but was 'undefined'`,
    },
  },
];

describe('decide', () => {
  for (const t of tests) {
    it(t.description, () => {
      assert.deepStrictEqual(decide(t.state, t.config), t.expected);
    });
  }
});

describe('partitionRegistrations', () => {
  it('should treat a Registration without a held Credential as foreign', () => {
    assert.deepStrictEqual(partitionRegistrations(state({ registrationIds: [FOREIGN] })), {
      ours: [],
      foreign: [FOREIGN],
    });
  });
  it('should separate ours from foreign ones', () => {
    assert.deepStrictEqual(
      partitionRegistrations(state({ registrationIds: [FOREIGN, OURS], heldRegistrationId: OURS })),
      { ours: [OURS], foreign: [FOREIGN] },
    );
  });
});
