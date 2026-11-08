import { SETTINGS_DOC_URL, settingDocUrl } from './docs.js';
import { formatPath, getEnvReferenceName, getValueAtPath } from './env-references.js';
import { type PathSegment } from './json-schema-utils.js';
import { BrowserforcePlugin } from './plugin.js';
import { deprecatedSettings, findDeprecations, formatDeprecation } from './plugins/deprecated.js';
import { schemas } from './plugins/index.js';
import { rootSchema } from './plugins/schema.js';

type Drivers = {
  [key: string]: typeof BrowserforcePlugin;
};

type Data = {
  settings?: unknown;
};

type Config = {
  Driver: typeof BrowserforcePlugin;
  key: string;
  value: unknown;
};

/** A problem found in a config, located by its dot path (e.g. `settings.densitySettings.density`). */
export type ConfigIssue = {
  path: string;
  message: string;
  /** documentation of the setting concerned, or of the removed setting, or the list of settings */
  docUrl: string;
};

export type ValidateOptions = {
  /** accept `${VAR}` in place of any value, whatever type the schema expects there */
  allowEnvReferences?: boolean;
};

type SettingsIssue = {
  path: PathSegment[];
  message: string;
};

/** Documentation page for an issue located at a path relative to `settings`. */
function issueDocUrl(path: PathSegment[]): string {
  const [key] = path;
  return typeof key === 'string' && Object.hasOwn(schemas, key) ? settingDocUrl(key) : SETTINGS_DOC_URL;
}

/** The `settings` of a config when it is an object (keyed by setting), otherwise undefined. */
export function getSettingsObject(data: unknown): Record<string, unknown> | undefined {
  const settings = (data as Data | undefined)?.settings;
  return typeof settings === 'object' && settings !== null && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : undefined;
}

const DEPRECATED_SETTING_PATHS = new Set(deprecatedSettings.map((deprecated) => deprecated.path));

/** Validates the value of `settings` against the schemas of all plugins. Paths are relative to `settings`. */
function validateSettings(settings: unknown, options: ValidateOptions = {}): SettingsIssue[] {
  const result = rootSchema.shape.settings.safeParse(settings);
  if (result.success) {
    return [];
  }
  return result.error.issues.flatMap((issue): SettingsIssue[] => {
    const path = issue.path as PathSegment[];
    if (options.allowEnvReferences && getEnvReferenceName(getValueAtPath(settings, path))) {
      return [];
    }
    if (issue.code === 'unrecognized_keys') {
      // a removed setting is reported once, with its migration instructions
      const keys = issue.keys.filter((key) => !DEPRECATED_SETTING_PATHS.has(formatPath([...path, key])));
      if (keys.length === 0) {
        return [];
      }
      if (keys.length < issue.keys.length) {
        const keyList = keys.map((key) => `"${key}"`).join(', ');
        return [{ path, message: `Unrecognized key${keys.length > 1 ? 's' : ''}: ${keyList}` }];
      }
    }
    return [{ path, message: issue.message }];
  });
}

function formatSettingsIssues(issues: SettingsIssue[]): string {
  return issues
    .map(
      (issue) =>
        `${issue.path.length ? `${formatPath(issue.path)}: ` : ''}${issue.message} (${issueDocUrl(issue.path)})`,
    )
    .join('\n');
}

export class ConfigParser {
  public static parse(drivers: Drivers, data: Data): Config[] {
    const settings: Config[] = [];
    if (data?.settings) {
      const issues = validateSettings(data.settings);
      if (issues.length > 0) {
        throw new Error(`Invalid browserforce configuration:\n${formatSettingsIssues(issues)}`);
      }
      const rawSettings = data.settings as Record<string, unknown>;
      for (const driverName of Object.keys(rawSettings)) {
        if (drivers[driverName]) {
          settings.push({
            Driver: drivers[driverName],
            key: driverName,
            value: rawSettings[driverName],
          });
        } else {
          throw new Error(`Could not find plugin named '${driverName}' in definition: ${JSON.stringify(data)}`);
        }
      }
    } else {
      throw new Error(`Missing 'settings' attribute in definition: ${JSON.stringify(data)}`);
    }
    return settings;
  }

  /**
   * Lists every problem of a config without throwing: missing `settings`, removed settings, and schema violations.
   * Paths start with `settings`.
   */
  public static validate(data: unknown, options: ValidateOptions = {}): ConfigIssue[] {
    const settings = getSettingsObject(data);
    if (!settings) {
      return [{ path: 'settings', message: "Missing 'settings' attribute", docUrl: SETTINGS_DOC_URL }];
    }
    const deprecations = findDeprecations(data).map((deprecated) => ({
      path: `settings.${deprecated.path}`,
      message: formatDeprecation(deprecated),
      docUrl: deprecated.url,
    }));
    const schemaIssues = validateSettings(settings, options).map((issue) => ({
      path: formatPath(['settings', ...issue.path]),
      message: issue.message,
      docUrl: issueDocUrl(issue.path),
    }));
    return [...deprecations, ...schemaIssues];
  }
}
