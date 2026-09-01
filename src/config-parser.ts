import { z } from 'zod';
import { BrowserforcePlugin } from './plugin.js';
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

export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
    .join('\n');
}

export class ConfigParser {
  public static parse(drivers: Drivers, data: Data): Config[] {
    const settings: Config[] = [];
    if (data?.settings) {
      try {
        rootSchema.shape.settings.parse(data.settings);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid browserforce configuration:\n${formatZodError(error)}`);
        }
        throw error;
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
}
