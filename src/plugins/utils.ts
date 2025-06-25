import { isDeepStrictEqual } from 'util';

// an object only containing an id is semantically empty
export function semanticallyCleanObject<T extends unknown>(
  obj: T,
  id = 'id'
): T | undefined {
  if (typeof obj === 'object' && obj !== null) {
    if (Object.keys(obj).length === 1 && Object.keys(obj)[0] === id) {
      return undefined;
    }
  }
  return obj;
}

export function isEmptyObjectOrArray(arg: unknown): boolean {
  if (typeof arg === 'object' && arg !== null) {
    return Object.keys(arg).length === 0;
  }
  return false;
}

export function deepDiff<T extends unknown>(
  source: T | undefined,
  target: T | undefined
): T | undefined {
  if (isDeepStrictEqual(source, target)) {
    return undefined;
  }
  if (
    typeof target === 'object' &&
    target !== null &&
    typeof source === 'object' &&
    source !== null
  ) {
    let objectOrArray: T | undefined;
    if (Array.isArray(target)) {
      objectOrArray = target
        .map((item, i) => deepDiff(source?.[i], item))
        .filter((x) => x !== undefined) as T | undefined;
    } else {
      const targetKeys = Object.keys(target);
      const minSource = Object.fromEntries(
        Object.entries(source).filter(([key, value]) =>
          targetKeys.includes(key)
        )
      ) as T | {};
      if (!isDeepStrictEqual(minSource, source)) {
        return deepDiff(minSource as T, target);
      }
      objectOrArray = target;
    }
    if (isEmptyObjectOrArray(objectOrArray)) {
      return undefined;
    }
    return objectOrArray;
  }
  // simple value
  return target;
}
