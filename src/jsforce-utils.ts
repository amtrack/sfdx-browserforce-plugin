/**
 * workaround as the Metadata API (converted from XML) returns an object instead of an array of length 1
 * @param prop result of a Metadata API call (array or object)
 */
export function ensureArray<T>(
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  prop: T
): Array<T> {
  if (Array.isArray(prop)) {
    return prop;
  }
  if (prop === undefined || prop === null) {
    return [];
  }
  return [prop];
}
