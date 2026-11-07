export type JsonSchema = Record<string, unknown>;

/** A path inside a config value: object keys and array indices, as in zod issues. */
export type PathSegment = string | number;

/**
 * The keys of a path joined with dots, array indices dropped, as the schema sees it
 * (e.g. ['portals', 0, 'adminUser'] -> 'portals.adminUser').
 */
export function toKeyPath(path: PathSegment[]): string {
  return path.filter((segment) => typeof segment === 'string').join('.');
}

export type FieldType = 'string' | 'boolean' | 'number' | 'integer' | 'string[]' | 'json';

/** A repeatable part of a setting: the items of an array, or the entries of an object keyed by name. */
export type FieldGroup = {
  /** `[]` for a setting that is an array, `portals[]` for an array field, `*` for entries keyed by name */
  path: string;
  kind: 'array' | 'record';
  title?: string;
  description?: string;
  /** record only: the pattern the entry names must match */
  keyPattern?: string;
};

export type Field = {
  /** dot path, with `[]` for array items and `*` for entries keyed by name (e.g. `portals[].name`, `*.consumerKey`) */
  path: string;
  /** path of the group the field repeats with, if any */
  group?: string;
  type: FieldType;
  title?: string;
  description?: string;
  required: boolean;
  enum?: unknown[];
  default?: unknown;
  isPassword: boolean;
  /** `x-irreversible` in the schema: once applied, the value cannot be changed back */
  isIrreversible: boolean;
};

export type FlatFields = {
  groups: FieldGroup[];
  fields: Field[];
};

const isObject = (value: unknown): value is JsonSchema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Returns a copy of the schema where every local `$ref` (`#/definitions/x`) is replaced by its definition,
 * and single-element `allOf` wrappers are merged into their parent. `definitions` and `$schema` are dropped.
 */
export function inlineRefs(schema: JsonSchema): JsonSchema {
  const definitions = isObject(schema.definitions) ? schema.definitions : {};
  const inline = (node: unknown, seen: string[]): unknown => {
    if (Array.isArray(node)) {
      return node.map((item) => inline(item, seen));
    }
    if (!isObject(node)) {
      return node;
    }
    let current: JsonSchema = node;
    if (typeof current.$ref === 'string') {
      const match = /^#\/definitions\/(.+)$/.exec(current.$ref);
      if (!match || !isObject(definitions[match[1]])) {
        throw new Error(`Cannot resolve JSON Schema reference '${current.$ref}'`);
      }
      if (seen.includes(match[1])) {
        throw new Error(`Recursive JSON Schema reference '${current.$ref}' is not supported`);
      }
      const { $ref, ...siblings } = current;
      const resolved = inline(definitions[match[1]], [...seen, match[1]]) as JsonSchema;
      return inline({ ...resolved, ...siblings }, seen);
    }
    if (Array.isArray(current.allOf) && current.allOf.length === 1) {
      const { allOf, ...siblings } = current;
      current = { ...(inline(allOf[0], seen) as JsonSchema), ...siblings };
    }
    const result: JsonSchema = {};
    for (const [key, value] of Object.entries(current)) {
      if (key === 'definitions' || key === '$schema') {
        continue;
      }
      result[key] =
        key === 'properties' && isObject(value) ? inlineValues(value, (v) => inline(v, seen)) : inline(value, seen);
    }
    return result;
  };
  return inline(schema, []) as JsonSchema;
}

function inlineValues(record: JsonSchema, fn: (value: unknown) => unknown): JsonSchema {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, fn(value)]));
}

/** The non-null branch of a nullable schema (`anyOf: [x, {type: 'null'}]`), or the schema itself. */
function unwrapNullable(schema: JsonSchema): JsonSchema {
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : undefined;
  if (!variants) {
    return schema;
  }
  const nonNull = variants.filter((variant) => !(isObject(variant) && variant.type === 'null'));
  if (nonNull.length === 1 && isObject(nonNull[0])) {
    const { anyOf, oneOf, ...siblings } = schema;
    return { ...nonNull[0], ...siblings };
  }
  return schema;
}

const isRecordSchema = (schema: JsonSchema): boolean =>
  schema.type === 'object' && !isObject(schema.properties) && isObject(schema.additionalProperties);

/** The schema of the value found at `path` inside a value of the given (inlined) schema. */
export function schemaAtPath(schema: JsonSchema, path: PathSegment[]): JsonSchema | undefined {
  let current: JsonSchema | undefined = unwrapNullable(schema);
  for (const segment of path) {
    if (!current) {
      return undefined;
    }
    let next: unknown;
    if (typeof segment === 'number') {
      next = current.type === 'array' ? current.items : undefined;
    } else if (isObject(current.properties) && segment in current.properties) {
      next = current.properties[segment];
    } else if (isObject(current.additionalProperties)) {
      next = current.additionalProperties;
    }
    current = isObject(next) ? unwrapNullable(next) : undefined;
  }
  return current;
}

/** The JSON type a schema expects (`string`, `boolean`, `number`, `integer`, `object`, `array`), if it has one. */
export function schemaType(schema: JsonSchema | undefined): string | undefined {
  if (!schema) {
    return undefined;
  }
  const unwrapped = unwrapNullable(schema);
  if (typeof unwrapped.type === 'string') {
    return unwrapped.type;
  }
  if (Array.isArray(unwrapped.enum) && unwrapped.enum.every((value) => typeof value === 'string')) {
    return 'string';
  }
  return undefined;
}

const PRIMITIVE_TYPES = ['string', 'boolean', 'number', 'integer'];

const joinPath = (prefix: string, key: string): string => (prefix ? `${prefix}.${key}` : key);

/**
 * Flattens an (inlined) setting schema into fields ready to be prompted.
 * Objects become dot paths. The first array of objects or object keyed by name becomes a group whose
 * item fields are listed under it. Arrays of primitives are typed `string[]`; deeper arrays and records are `json`.
 */
export function flattenFields(schema: JsonSchema): FlatFields {
  const groups: FieldGroup[] = [];
  const fields: Field[] = [];

  const addField = (node: JsonSchema, path: string, group: string | undefined, required: boolean, type: FieldType) => {
    fields.push({
      path,
      ...(group !== undefined ? { group } : {}),
      type,
      ...(typeof node.title === 'string' ? { title: node.title } : {}),
      ...(typeof node.description === 'string' && node.description ? { description: node.description } : {}),
      required,
      ...(Array.isArray(node.enum) ? { enum: node.enum } : {}),
      ...(node.default !== undefined ? { default: node.default } : {}),
      isPassword: node['x-password'] === true,
      isIrreversible: node['x-irreversible'] === true,
    });
  };

  const addGroup = (node: JsonSchema, path: string, kind: FieldGroup['kind']) => {
    const propertyNames = isObject(node.propertyNames) ? node.propertyNames : undefined;
    groups.push({
      path,
      kind,
      ...(typeof node.title === 'string' ? { title: node.title } : {}),
      ...(typeof node.description === 'string' && node.description ? { description: node.description } : {}),
      ...(kind === 'record' && typeof propertyNames?.pattern === 'string' ? { keyPattern: propertyNames.pattern } : {}),
    });
  };

  const walkObject = (node: JsonSchema, path: string, group: string | undefined) => {
    const required = Array.isArray(node.required) ? node.required : [];
    for (const [key, child] of Object.entries(node.properties as JsonSchema)) {
      if (isObject(child)) {
        walk(child, joinPath(path, key), group, required.includes(key));
      }
    }
  };

  const walk = (rawNode: JsonSchema, path: string, group: string | undefined, required: boolean) => {
    const node = unwrapNullable(rawNode);
    const type = schemaType(node);
    if (type && PRIMITIVE_TYPES.includes(type)) {
      addField(node, path, group, required, type as FieldType);
      return;
    }
    if (type === 'array') {
      const items = isObject(node.items) ? unwrapNullable(node.items) : undefined;
      const itemType = schemaType(items);
      if (itemType === 'string') {
        addField(node, path, group, required, 'string[]');
      } else if (items && group === undefined && itemType === 'object' && isObject(items.properties)) {
        const groupPath = `${path}[]`;
        addGroup(node, groupPath, 'array');
        walkObject(items, groupPath, groupPath);
      } else {
        addField(node, path, group, required, 'json');
      }
      return;
    }
    if (type === 'object' && isObject(node.properties)) {
      walkObject(node, path, group);
      return;
    }
    if (isRecordSchema(node) && group === undefined) {
      const groupPath = joinPath(path, '*');
      addGroup(node, groupPath, 'record');
      walk(node.additionalProperties as JsonSchema, groupPath, groupPath, false);
      return;
    }
    addField(node, path, group, required, 'json');
  };

  walk(schema, '', undefined, false);
  return { groups, fields };
}
