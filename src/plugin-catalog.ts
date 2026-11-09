import { z } from 'zod';
import { settingDocUrl, withRawImageUrls } from './docs.js';
import { type FieldGroup, type Field, flattenFields, inlineRefs, type JsonSchema } from './json-schema-utils.js';
import { type DeprecatedSetting, deprecatedSettings } from './plugins/deprecated.js';
import { schemas } from './plugins/index.js';
import { rootSchema } from './plugins/schema.js';

/**
 * Version of the catalog format. Adding information keeps it; removing or renaming a field increments it,
 * so tools reading the catalog (like sfdx-hardis) can detect an incompatible change.
 * Version 1 is the format of the first release that contains `sf browserforce plugins list`.
 * `docUrl` was added later without changing it.
 */
export const CATALOG_FORMAT_VERSION = 1;

export type PluginKey = keyof typeof schemas;

export type PluginCatalogEntry = {
  /** the key under `settings` in a config file */
  key: PluginKey;
  title?: string;
  /** Markdown; its images point to their raw URL on GitHub */
  description?: string;
  /** page of the setting on the documentation site */
  docUrl: string;
  /**
   * JSON Schema (draft-7) of the value under `settings.<key>`, without $ref.
   * Secrets have `x-password: true`, values that cannot be reverted `x-irreversible: true`.
   */
  jsonSchema: JsonSchema;
  groups: FieldGroup[];
  fields: Field[];
  /** ready-to-use values of `settings.<key>` (`examples` of the JSON Schema); the first one is the default */
  examples: unknown[];
  warnings: {
    /** paths of the fields that cannot be changed back once applied (`x-irreversible`) */
    irreversibleFields: string[];
    /** the feature only exists in this user interface (`x-user-interface`) */
    userInterface: 'classic' | 'lightning' | null;
    /** what the org needs before the setting can be applied (`x-prerequisites`) */
    prerequisites: string[];
  };
};

export type PluginCatalog = {
  formatVersion: number;
  browserforceVersion: string;
  plugins: PluginCatalogEntry[];
  deprecatedSettings: DeprecatedSetting[];
};

const jsonSchemaCache = new Map<string, JsonSchema>();

/** The JSON Schema of a setting with every $ref inlined, or undefined for an unknown setting. */
export function getPluginJsonSchema(key: string): JsonSchema | undefined {
  const schema = schemas[key as PluginKey];
  if (!schema) {
    return undefined;
  }
  let jsonSchema = jsonSchemaCache.get(key);
  if (!jsonSchema) {
    jsonSchema = withRawImageUrls(inlineRefs(z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) as JsonSchema));
    jsonSchemaCache.set(key, jsonSchema);
  }
  return jsonSchema;
}

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/**
 * JSON Schema of a whole config file, written to src/plugins/schema.json: images of the descriptions point to their
 * raw URL on GitHub, and each setting has a `markdownDescription` linking to its documentation page, shown by IDEs
 * when hovering its key.
 */
export function buildConfigJsonSchema(): JsonSchema {
  const jsonSchema = withRawImageUrls(z.toJSONSchema(rootSchema, { target: 'draft-7', io: 'input' }) as JsonSchema);
  const settings = (jsonSchema.properties as Record<string, JsonSchema>).settings;
  const settingsProperties = settings.properties as Record<string, JsonSchema>;
  for (const key of Object.keys(schemas)) {
    const { description, title } = getPluginJsonSchema(key) as JsonSchema;
    const summary = typeof description === 'string' ? description : typeof title === 'string' ? title : '';
    settingsProperties[key].markdownDescription =
      `${summary ? `${summary}\n\n` : ''}[Documentation](${settingDocUrl(key)})`;
  }
  return jsonSchema;
}

export function buildPluginCatalog(browserforceVersion: string): PluginCatalog {
  const plugins = (Object.keys(schemas) as PluginKey[]).toSorted().map((key): PluginCatalogEntry => {
    const jsonSchema = getPluginJsonSchema(key) as JsonSchema;
    const { groups, fields } = flattenFields(jsonSchema);
    const userInterface = jsonSchema['x-user-interface'];
    return {
      key,
      ...(typeof jsonSchema.title === 'string' ? { title: jsonSchema.title } : {}),
      ...(typeof jsonSchema.description === 'string' && jsonSchema.description
        ? { description: jsonSchema.description }
        : {}),
      docUrl: settingDocUrl(key),
      jsonSchema,
      groups,
      fields,
      examples: Array.isArray(jsonSchema.examples) ? jsonSchema.examples : [],
      warnings: {
        irreversibleFields: fields.filter((field) => field.isIrreversible).map((field) => field.path),
        userInterface: userInterface === 'classic' || userInterface === 'lightning' ? userInterface : null,
        prerequisites: stringArray(jsonSchema['x-prerequisites']),
      },
    };
  });
  return {
    formatVersion: CATALOG_FORMAT_VERSION,
    browserforceVersion,
    plugins,
    deprecatedSettings,
  };
}
