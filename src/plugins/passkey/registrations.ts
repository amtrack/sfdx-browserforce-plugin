/**
 * A passkey Registration is the server side record ("Built-in Authenticators"
 * related list on the classic user detail page). Its id has the `0mo` prefix.
 */
export const REGISTRATION_ID_PREFIX = '0mo';

/**
 * The classic user detail page renders a `Del` link for many related lists
 * (permission sets, licenses, ...). Clicking the wrong one deletes the wrong
 * record (this actually happened during the POC, see poc/README.md), so the
 * record id prefix is asserted before a link is ever clicked.
 */
export function parseRegistrationId(href: string | null | undefined): string {
  const id = /[?&]delID=([a-zA-Z0-9]+)/.exec(href ?? '')?.[1];
  if (id === undefined) {
    throw new Error(`could not parse a delID from the delete link href '${href}'`);
  }
  if (!id.startsWith(REGISTRATION_ID_PREFIX)) {
    throw new Error(
      `refusing to click the delete link '${href}': the record id '${id}' is not a passkey Registration (${REGISTRATION_ID_PREFIX})`,
    );
  }
  return id;
}

/**
 * The number of rows Salesforce reports for the related list, e.g.
 * "Built-in Authenticators[2]". Used to cross check the delete links found.
 * @returns undefined when the related list is not rendered (e.g. localized)
 */
export function parseRegistrationCount(pageText: string): number | undefined {
  const count = /Built-in Authenticators\s*\[(\d+)\]/.exec(pageText)?.[1];
  return count === undefined ? undefined : Number(count);
}
