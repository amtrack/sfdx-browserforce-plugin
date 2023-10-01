export function removeEmptyValues(obj: any): any {
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

export function removeNullValues(obj: any): any {
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
export function semanticallyCleanObject(obj: any, id = 'id'): any {
  if (!obj) {
    obj = {};
  }
  if (Object.keys(obj).length === 1 && Object.keys(obj)[0] === id) {
    return null;
  }
  return obj;
}

export function isEmpty(obj: unknown): Boolean {
  return !(
    (obj !== undefined && obj !== null && obj !== Object(obj)) ||
    (obj === Object(obj) && Object.keys(obj).length > 0)
  );
}
