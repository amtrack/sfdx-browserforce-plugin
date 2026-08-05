/**
 * The pure decision logic of the passkey plugin: given the passkey
 * Registrations of the user and the Credential we hold, what has to happen?
 *
 * See docs/adr/0001-passkey-plugin-exactly-one-on-dedicated-privileged-user.md
 */

export type PasskeyConfig = {
  /**
   * The desired state, sharpened: `true` means "a Registration exists that we
   * hold the Credential for", not merely "a Registration exists".
   */
  registered: boolean;
  /**
   * Where the Credential of the Registration is stored (contains the private
   * key). Without it, no Registration can ever be recognized as ours.
   */
  credentialFile?: string;
  /**
   * Delete a Registration whose Credential we do not hold (a human may own it).
   */
  force?: boolean;
};

export type PasskeyState = {
  /** whether a Registration we hold the Credential for exists */
  registered: boolean;
  /** all Registration ids of the user (empty at the Enrollment Gate) */
  registrationIds: string[];
  /** the Registration id of the Credential we hold, if any */
  heldRegistrationId?: string;
};

export type PasskeyPlan =
  | { action: 'none' }
  | { action: 'enroll'; credentialFile?: string }
  | { action: 'delete'; registrationIds: string[] }
  | { action: 'replace'; registrationIds: string[]; credentialFile?: string }
  | { action: 'refuse'; reason: string };

/**
 * Splits the Registrations of the user into the one we hold the Credential for
 * and the ones we do not (which may belong to a human).
 */
export function partitionRegistrations(state: PasskeyState): { ours: string[]; foreign: string[] } {
  const isOurs = (registrationId: string) => registrationId === state.heldRegistrationId;
  return {
    ours: state.registrationIds.filter(isOurs),
    foreign: state.registrationIds.filter((registrationId) => !isOurs(registrationId)),
  };
}

export function decide(state: PasskeyState, config: PasskeyConfig): PasskeyPlan {
  if (typeof config.registered !== 'boolean') {
    return {
      action: 'refuse',
      reason: `the passkey setting 'registered' is required and must be a boolean, but was '${JSON.stringify(config.registered)}'`,
    };
  }
  const { ours, foreign } = partitionRegistrations(state);
  if (config.registered) {
    if (ours.length) {
      // desired state reached, even if a foreign Registration coexists
      return { action: 'none' };
    }
    if (!foreign.length) {
      return { action: 'enroll', credentialFile: config.credentialFile };
    }
    if (!config.force) {
      return { action: 'refuse', reason: refuseReason(foreign, config) };
    }
    return { action: 'replace', registrationIds: foreign, credentialFile: config.credentialFile };
  }
  if (!state.registrationIds.length) {
    return { action: 'none' };
  }
  if (foreign.length && !config.force) {
    return { action: 'refuse', reason: refuseReason(foreign, config) };
  }
  return { action: 'delete', registrationIds: state.registrationIds };
}

function refuseReason(foreign: string[], config: PasskeyConfig): string {
  const held = config.credentialFile
    ? `the Credential in '${config.credentialFile}' does not match ${foreign.length > 1 ? 'any of them' : 'it'}`
    : `no 'credentialFile' is configured, so no Registration can be recognized as ours`;
  return [
    `refusing to touch the passkey Registration(s) ${foreign.join(', ')} of this user:`,
    `${held}.`,
    `A human may own it. Set 'force': true in the passkey settings to delete it anyway,`,
    `but only if this user is a dedicated automation user.`,
  ].join(' ');
}
