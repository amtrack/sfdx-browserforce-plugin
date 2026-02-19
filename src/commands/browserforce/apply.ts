import { readFileSync } from 'fs';
import { BrowserforceCommand } from '../../browserforce-command.js';
import { maskSensitiveValues } from '../../plugins/utils.js';

// Convert camelCase to kebab-case (e.g., "authProviders" -> "auth-providers")
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Load schema for a plugin
function loadPluginSchema(pluginName: string): unknown | undefined {
  try {
    // Resolve schema path relative to the plugins directory
    // Since we're in src/commands/browserforce/, we need to go up to src/plugins/
    const schemaPath = new URL(
      `../../plugins/${camelToKebab(pluginName)}/schema.json`,
      import.meta.url,
    );
    const schemaContent = readFileSync(schemaPath, 'utf8');
    return JSON.parse(schemaContent);
  } catch (error) {
    // Schema file not found or invalid - return undefined to fall back to pattern matching
    return undefined;
  }
}

type BrowserforceApplyResponse = {
  success: boolean;
};

export class BrowserforceApply extends BrowserforceCommand<BrowserforceApplyResponse> {
  public static description = 'apply a plan from a config file';
  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -f ./config/currency.json --target-org myOrg@example.com
  logging in... done
  Applying config file ./config/currency.json to org myOrg@example.com
  [CompanyInformation] retrieving state... done
  [CompanyInformation] changing 'defaultCurrencyIsoCode' to '"English (South Africa) - ZAR"'... done
  logging out... done
  `,
  ];

  public async run(): Promise<BrowserforceApplyResponse> {
    const { flags } = await this.parse(BrowserforceApply);
    this.log(`Applying config file ${flags.definitionfile} to org ${flags['target-org'].getUsername()}`);
    for (const setting of this.settings) {
      const driver = setting.Driver;
      const instance = new driver(this.browserforce);
      this.spinner.start(`[${driver.name}] retrieving state`);
      await this.browserforce.browserContext.tracing.group(driver.name);
      let state;
      try {
        state = await instance.retrieve(setting.value);
      } catch (err) {
        this.spinner.stop('failed');
        throw err;
      }
      this.spinner.stop();
      const diff = instance.diff(state, setting.value);
      const action = flags['dry-run'] ? 'would change' : 'changing';
      if (diff !== undefined) {
        // Load schema for this plugin to check for password fields
        const schema = loadPluginSchema(setting.key);
        // Mask sensitive values before logging (using schema if available)
        const maskedDiff = maskSensitiveValues(diff, '', schema) as typeof diff;
        this.spinner.start(
          `[${driver.name}] ${Object.keys(maskedDiff)
            .map((key) => {
              return `${action} '${key}' to '${JSON.stringify(maskedDiff[key])}'`;
            })
            .join('\n')}`,
        );
        if (!flags['dry-run']) {
          try {
            await instance.apply(diff);
          } catch (err) {
            this.spinner.stop('failed');
            throw err;
          }
          this.spinner.stop();
        }
        await this.browserforce.browserContext.tracing.groupEnd();
      } else {
        this.log(`[${driver.name}] no action necessary`);
      }
    }
    return {
      success: true,
    };
  }
}
