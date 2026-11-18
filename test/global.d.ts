import type { Browserforce } from '../src/browserforce.js';

declare global {
  var browserforce: Browserforce;
  /** the email and username of the org user, masked in the screenshots (CAPTURE=true) */
  var captureIdentities: string[] | undefined;
}

export {};
