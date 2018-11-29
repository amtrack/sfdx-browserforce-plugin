// source: https://gitlab.com/snippets/1775781 Daniel Iñigo <danielinigobanos@gmail.com>
export async function retry(
  fn,
  retriesLeft = 5,
  interval = 1000,
  exponential = false
) {
  try {
    const val = await fn();
    return val;
  } catch (error) {
    if (retriesLeft) {
      // tslint:disable-next-line no-string-based-set-timeout
      await new Promise(r => setTimeout(r, interval));
      return retry(
        fn,
        retriesLeft - 1,
        exponential ? interval * 2 : interval,
        exponential
      );
    } else throw error;
  }
}

export function removeEmptyValues(obj) {
  if (!obj) {
    obj = {};
  }
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (Array.isArray(value)) {
      if (value.length) {
        acc[key] = value;
      }
    } else if (typeof value === 'object') {
      if (Object.keys(value).length) {
        acc[key] = value;
      }
    } else if (value !== undefined && value !== null) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function removeNullValues(obj) {
  if (!obj) {
    obj = {};
  }
  Object.entries(obj).forEach(
    ([key, val]) =>
      (val && typeof val === 'object' && removeNullValues(val)) ||
      ((val === null || val === undefined) && delete obj[key])
  );
  return obj;
}

// an object only containing an id is semantically empty
export function semanticallyCleanObject(obj, id = 'id') {
  if (!obj) {
    obj = {};
  }
  if (Object.keys(obj).length === 1 && Object.keys(obj)[0] === id) {
    return null;
  }
  return obj;
}
