import { type JsonSchema, type PathSegment, schemaAtPath, schemaType } from './json-schema-utils.js';

/** A config value that is exactly `${NAME}` references the environment variable NAME. */
const ENV_REFERENCE_PATTERN = /^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/;

export type EnvReference = {
  /** name of the environment variable */
  name: string;
  /** path of the value, starting with the setting key (e.g. ['authProviders', 'MyProvider', 'consumerSecret']) */
  path: PathSegment[];
};

/** The variable name when the value is an environment variable reference. */
export function getEnvReferenceName(value: unknown): string | undefined {
  return typeof value === 'string' ? ENV_REFERENCE_PATTERN.exec(value)?.[1] : undefined;
}

/** Formats a path like zod does: segments joined with dots. */
export function formatPath(path: PathSegment[]): string {
  return path.join('.');
}

export function getValueAtPath(value: unknown, path: PathSegment[]): unknown {
  let current = value;
  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<PathSegment, unknown>)[segment];
  }
  return current;
}

/** Lists the environment variable references found in a value, depth first. */
export function findEnvReferences(value: unknown, path: PathSegment[] = []): EnvReference[] {
  const name = getEnvReferenceName(value);
  if (name !== undefined) {
    return [{ name, path }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findEnvReferences(item, [...path, index]));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, item]) => findEnvReferences(item, [...path, key]));
  }
  return [];
}

/**
 * The path of a value as the output masking sees it, relative to the setting:
 * keys joined with dots, array indices dropped (e.g. ['customerPortal', 'portals', 0, 'adminUser'] -> 'portals.adminUser').
 */
export function toMaskingPath(path: PathSegment[]): string {
  return path
    .slice(1)
    .filter((segment) => typeof segment === 'string')
    .join('.');
}

/** `$${NAME}` is the escaped form of a value that must stay the literal text `${NAME}`. */
const ESCAPED_ENV_REFERENCE_PATTERN = /^\$(\$\{[A-Za-z_][A-Za-z0-9_]*\})$/;

/**
 * Replaces every escaped reference `$${NAME}` with the literal text `${NAME}`.
 * Returns the same value (and the same nested objects) where nothing changes.
 */
function unescapeEnvReferences(value: unknown): unknown {
  if (typeof value === 'string') {
    return ESCAPED_ENV_REFERENCE_PATTERN.exec(value)?.[1] ?? value;
  }
  if (Array.isArray(value)) {
    const items = value.map(unescapeEnvReferences);
    return items.some((item, index) => item !== value[index]) ? items : value;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value).map(([key, item]) => [key, unescapeEnvReferences(item)] as const);
    const record = value as Record<string, unknown>;
    return entries.some(([key, item]) => item !== record[key]) ? Object.fromEntries(entries) : value;
  }
  return value;
}

/** Converts the text of an environment variable to the type the schema expects at that place. */
function convertValue(text: string, expectedType: string | undefined): { value?: unknown; error?: string } {
  switch (expectedType) {
    case 'boolean': {
      const normalized = text.trim().toLowerCase();
      if (normalized === 'true' || normalized === 'false') {
        return { value: normalized === 'true' };
      }
      return { error: 'must be true or false' };
    }
    case 'number':
    case 'integer': {
      const number = text.trim() === '' ? NaN : Number(text);
      return Number.isFinite(number) ? { value: number } : { error: 'must be a number' };
    }
    case 'object':
    case 'array':
      try {
        return { value: JSON.parse(text) };
      } catch {
        return { error: `must be a JSON ${expectedType}` };
      }
    default:
      return { value: text };
  }
}

function setValueAtPath(target: unknown, path: PathSegment[], value: unknown): unknown {
  if (path.length === 0) {
    return value;
  }
  const [head, ...rest] = path;
  const container = target as Record<PathSegment, unknown>;
  container[head] = setValueAtPath(container[head], rest, value);
  return target;
}

export type ResolvedEnvReferences = {
  /** the settings with every reference replaced by the converted value */
  settings: Record<string, unknown>;
  references: EnvReference[];
};

/**
 * Replaces every `${NAME}` value of the settings with the environment variable NAME,
 * converted to the type the setting's JSON Schema expects at that place, and every escaped `$${NAME}` with the
 * literal text `${NAME}`.
 * Throws one error listing every unset, empty or unconvertible variable.
 * @param getSchema returns the inlined JSON Schema of a setting, or undefined for an unknown setting
 */
export function resolveEnvReferences(
  settings: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
  getSchema: (settingKey: string) => JsonSchema | undefined,
): ResolvedEnvReferences {
  const references = findEnvReferences(settings);
  const unescaped = unescapeEnvReferences(settings) as Record<string, unknown>;
  if (references.length === 0) {
    return { settings: unescaped, references };
  }
  const resolved = unescaped === settings ? structuredClone(settings) : unescaped;
  const errors: string[] = [];
  for (const reference of references) {
    const location = `settings.${formatPath(reference.path)}`;
    const text = env[reference.name];
    if (text === undefined || text === '') {
      errors.push(`${location}: environment variable ${reference.name} is not set`);
      continue;
    }
    const [settingKey, ...pathInSetting] = reference.path;
    const schema = getSchema(String(settingKey));
    const expectedType = schema ? schemaType(schemaAtPath(schema, pathInSetting)) : undefined;
    const { value, error } = convertValue(text, expectedType);
    if (error) {
      errors.push(`${location}: environment variable ${reference.name} ${error}`);
      continue;
    }
    setValueAtPath(resolved, reference.path, value);
  }
  if (errors.length > 0) {
    throw new Error(`Invalid environment variable references in browserforce configuration:\n${errors.join('\n')}`);
  }
  return { settings: resolved, references };
}
