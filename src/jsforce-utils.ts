/**
 * workaround as the Metadata API (converted from XML) returns an object instead of an array of length 1
 * @param prop result of a Metadata API call (array or object)
 */
export function ensureArray(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  prop: any
): Array<any> {
  if (Array.isArray(prop)) {
    return prop;
  }
  if (prop === undefined || prop === null) {
    return [];
  }
  return [prop];
}
