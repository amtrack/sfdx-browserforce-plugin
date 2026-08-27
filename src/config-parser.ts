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
      let parsedSettings: Record<string, unknown>;
      try {
        parsedSettings = rootSchema.shape.settings.parse(data.settings);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid browserforce configuration:\n${formatZodError(error)}`);
        }
        throw error;
      }
      for (const driverName of Object.keys(data.settings as Record<string, unknown>)) {
        settings.push({
          Driver: drivers[driverName],
          key: driverName,
          value: parsedSettings[driverName],
        });
      }
    } else {
      throw new Error(`Missing 'settings' attribute in definition: ${JSON.stringify(data)}`);
    }
    return settings;
  }
}
