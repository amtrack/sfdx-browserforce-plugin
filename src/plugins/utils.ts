import { isDeepStrictEqual } from 'util';
import { z } from 'zod';
import { type PathSegment, toKeyPath } from '../json-schema-utils.js';

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
        T | undefined;
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
 * Marks a zod schema as a password field so it gets masked when logged.
 * @param schema The zod schema to mark
 * @returns The same schema with `x-password: true` merged into its metadata
 */
export function password<T extends z.ZodType>(schema: T): T {
  return schema.meta({ ...schema.meta(), 'x-password': true }) as T;
}

/**
 * Masks sensitive values in an object for safe logging:
 * - strings of the fields marked `x-password` in the schema,
 * - every value at one of the masked paths, whatever its type,
 * - every string equal to one of the masked values, wherever it is (e.g. in a diff that does not keep the config shape).
 * @param value The value to mask (can be object, array, or primitive)
 * @param schema JSON schema of the setting with every $ref inlined (see inlineRefs())
 * @param maskedPaths paths relative to the setting, see toMaskingPath(): 'portals.adminUser' masks the field in every
 * item, 'portals[0]' masks only that item, '' masks everything
 * @param maskedValues strings to mask wherever they appear
 * @returns Masked value safe for logging
 */
export function maskSensitiveValues(
  value: unknown,
  schema?: unknown,
  maskedPaths: string[] = [],
  maskedValues: string[] = [],
): unknown {
  // Extract password fields from schema once, up front, instead of on every recursive call
  const passwordFields = schema ? extractPasswordFields(schema) : new Set<string>();
  return maskValue(value, [], { passwordFields, maskedPaths, maskedValues: new Set(maskedValues) });
}

type MaskingRules = {
  passwordFields: Set<string>;
  maskedPaths: string[];
  maskedValues: Set<string>;
};

/**
 * Extracts password field names from a JSON schema whose $ref are inlined
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

  // merges the results of recursing into subSchema at the same or nested prefix
  const recurseInto = (subSchema: unknown, subPrefix: string): void => {
    extractPasswordFields(subSchema, subPrefix).forEach((field) => passwordFields.add(field));
  };

  // Check if this schema object is marked as password using x-password property
  if (schemaObj['x-password'] === true && prefix) {
    passwordFields.add(prefix);
  }

  // Handle patternProperties (for dynamic keys like auth-providers)
  if (schemaObj.patternProperties && typeof schemaObj.patternProperties === 'object') {
    for (const subSchema of Object.values(schemaObj.patternProperties)) {
      recurseInto(subSchema, prefix);
    }
  }

  // Handle additionalProperties (object form, for z.record(...))
  if (schemaObj.additionalProperties && typeof schemaObj.additionalProperties === 'object') {
    recurseInto(schemaObj.additionalProperties, prefix);
  }

  // Handle array items (for z.array(...))
  if (schemaObj.items && typeof schemaObj.items === 'object') {
    recurseInto(schemaObj.items, prefix);
  }

  // Handle properties (for fixed keys)
  if (schemaObj.properties && typeof schemaObj.properties === 'object') {
    for (const [key, propSchema] of Object.entries(schemaObj.properties)) {
      recurseInto(propSchema, prefix ? `${prefix}.${key}` : key);
    }
  }

  return passwordFields;
}

function maskValue(value: unknown, path: PathSegment[], rules: MaskingRules): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item, index) => maskValue(item, [...path, index], rules));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, maskValue(item, [...path, key], rules)]),
    );
  }

  // Values of the masked paths (e.g. resolved from environment variables) are masked whatever their type
  if (isMaskedPath(path, rules.maskedPaths)) {
    return '****';
  }

  if (typeof value === 'string' && (rules.maskedValues.has(value) || isPasswordField(path, rules.passwordFields))) {
    return '****';
  }

  return value;
}

/** `portals[0]`: the item 0 of the collection at `portals` */
const ITEM_PATH_PATTERN = /^(.*)\[(\d+)\]$/;

/**
 * True when the value at path is, or is inside, one of the masked paths.
 */
function isMaskedPath(path: PathSegment[], maskedPaths: string[]): boolean {
  if (maskedPaths.length === 0) {
    return false;
  }
  const keyPath = toKeyPath(path);
  return maskedPaths.some((maskedPath) => {
    const item = ITEM_PATH_PATTERN.exec(maskedPath);
    if (!item) {
      return maskedPath === '' || keyPath === maskedPath || keyPath.startsWith(`${maskedPath}.`);
    }
    const [, collectionPath, index] = item;
    return path.some(
      (segment, position) => segment === Number(index) && toKeyPath(path.slice(0, position)) === collectionPath,
    );
  });
}

/**
 * Checks if a field path matches any password field from the schema
 * @param path The path of the value (e.g. ['test', 'consumerSecret'])
 * @param passwordFields Set of password field paths from schema
 * @returns True if the field should be masked
 */
function isPasswordField(path: PathSegment[], passwordFields: Set<string>): boolean {
  const keyPath = toKeyPath(path);
  if (!keyPath) {
    return false;
  }
  // Check exact match, or a password field as a suffix of the current path
  // e.g., if schema has "consumerSecret" and path is "test.consumerSecret"
  return [...passwordFields].some(
    (passwordField) => keyPath === passwordField || keyPath.endsWith(`.${passwordField}`),
  );
}
