import { isDeepStrictEqual } from 'util';

// an object only containing an id is semantically empty
export function semanticallyCleanObject<T extends unknown>(obj: T, id = 'id'): T | undefined {
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

export function deepDiff<T extends unknown>(source: T | undefined, target: T | undefined): T | undefined {
  if (isDeepStrictEqual(source, target)) {
    return undefined;
  }
  if (typeof target === 'object' && target !== null && typeof source === 'object' && source !== null) {
    let objectOrArray: T | undefined;
    if (Array.isArray(target)) {
      objectOrArray = target.map((item, i) => deepDiff(source?.[i], item)).filter((x) => x !== undefined) as
        | T
        | undefined;
    } else {
      const targetKeys = Object.keys(target);
      const minSource = Object.fromEntries(
        Object.entries(source).filter(([key, value]) => targetKeys.includes(key)),
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

/**
 * Extracts password field names from a JSON schema
 * @param schema The JSON schema object
 * @param prefix The current path prefix (for nested schemas)
 * @returns Set of field paths that are marked as password type
 */
function extractPasswordFields(schema: unknown, prefix = ''): Set<string> {
  const passwordFields = new Set<string>();

  if (typeof schema !== 'object' || schema === null) {
    return passwordFields;
  }

  const schemaObj = schema as Record<string, unknown>;

  // Check if this schema object is marked as password using x-password property
  if (schemaObj['x-password'] === true) {
    if (prefix) {
      passwordFields.add(prefix);
    }
  }

  // Handle patternProperties (for dynamic keys like auth-providers)
  if (schemaObj.patternProperties && typeof schemaObj.patternProperties === 'object') {
    const patternProps = schemaObj.patternProperties as Record<string, unknown>;
    for (const subSchema of Object.values(patternProps)) {
      const subPasswordFields = extractPasswordFields(subSchema, prefix);
      subPasswordFields.forEach((field) => passwordFields.add(field));
    }
  }

  // Handle properties (for fixed keys)
  if (schemaObj.properties && typeof schemaObj.properties === 'object') {
    const properties = schemaObj.properties as Record<string, unknown>;
    for (const [key, propSchema] of Object.entries(properties)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      const propPasswordFields = extractPasswordFields(propSchema, currentPath);
      propPasswordFields.forEach((field) => passwordFields.add(field));
    }
  }

  return passwordFields;
}

/**
 * Checks if a field path matches any password field from the schema
 * @param fieldPath The field path to check (e.g., "consumerSecret" or "test.consumerSecret")
 * @param passwordFields Set of password field paths from schema
 * @returns True if the field should be masked
 */
function isPasswordField(fieldPath: string, passwordFields: Set<string>): boolean {
  // Check exact match
  if (passwordFields.has(fieldPath)) {
    return true;
  }

  // Check if any password field is a suffix of the current path
  // e.g., if schema has "consumerSecret" and path is "test.consumerSecret"
  const passwordFieldsArray = Array.from(passwordFields);
  for (const passwordField of passwordFieldsArray) {
    if (fieldPath.endsWith(`.${passwordField}`) || fieldPath === passwordField) {
      return true;
    }
  }

  return false;
}

/**
 * Masks sensitive values in an object for safe logging
 * Fields matching patterns like "secret", "password", "key", "token", etc. will be masked
 * Additionally, fields marked as type "password" in the schema will be masked
 * @param value The value to mask (can be object, array, or primitive)
 * @param keyPath The current key path (for nested objects)
 * @param schema Optional JSON schema to check for password type fields
 * @returns Masked value safe for logging
 */
export function maskSensitiveValues(value: unknown, keyPath = '', schema?: unknown): unknown {
  // Extract password fields from schema if provided
  const passwordFields = schema ? extractPasswordFields(schema) : new Set<string>();

  // List of patterns that indicate sensitive fields (fallback for when schema is not available)
  const sensitivePatterns = [
    /secret/i,
    /password/i,
    /token/i,
    /key/i,
    /credential/i,
    /auth/i,
    /api[_-]?key/i,
    /access[_-]?token/i,
  ];

  const isSensitiveField = (key: string): boolean => {
    // First check schema-based password fields
    if (passwordFields.size > 0 && isPasswordField(key, passwordFields)) {
      return true;
    }
    // Fallback to pattern matching
    return sensitivePatterns.some((pattern) => pattern.test(key));
  };

  if (value === null || value === undefined) {
    return value;
  }

  // If it's a string and we're in a sensitive field context, mask it
  if (typeof value === 'string' && keyPath && isSensitiveField(keyPath)) {
    return '****';
  }

  // If it's an object, recursively mask nested values
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item, index) => maskSensitiveValues(item, `${keyPath}[${index}]`, schema));
    } else {
      const masked: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        const currentPath = keyPath ? `${keyPath}.${key}` : key;
        if (isSensitiveField(key) && typeof val === 'string' && val.length > 0) {
          masked[key] = '****';
        } else {
          masked[key] = maskSensitiveValues(val, currentPath, schema);
        }
      }
      return masked;
    }
  }

  return value;
}
