import { SfError } from '@salesforce/core';
import { BrowserforceCommand } from '../../browserforce-command.js';
import { settingDocUrl } from '../../docs.js';
import { getPluginJsonSchema } from '../../plugin-catalog.js';
import { maskSensitiveValues } from '../../plugins/utils.js';

export type BrowserforceApplySettingResult = {
  /** config key of the setting, e.g. `densitySettings` */
  key: string;
  /** planned changes with secrets and environment values masked, `null` when no action is necessary */
  changes: Record<string, unknown> | null;
  /** true only when the changes were applied to the org */
  applied: boolean;
};

type BrowserforceApplyResponse = {
  success: boolean;
  dryRun: boolean;
  settings: BrowserforceApplySettingResult[];
};

export class BrowserforceApply extends BrowserforceCommand<BrowserforceApplyResponse> {
  public static description = `apply a plan from a config file

With --json, the result lists each setting in the order applied, with its planned changes (secrets and values from environment variables shown as ****, null when no action is necessary) and whether they were applied.`;
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
    const dryRun = flags['dry-run'] === true;
    const settings: BrowserforceApplySettingResult[] = [];
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
        throw withSettingResults(err, { dryRun, settings, failedSetting: setting.key });
      }
      this.spinner.stop();
      const diff = instance.diff(state, setting.value);
      const action = dryRun ? 'would change' : 'changing';
      if (diff !== undefined) {
        // Mask secrets (x-password fields) and values resolved from environment variables before logging
        const envMasking = this.envMasking.get(setting.key);
        const maskedDiff = maskSensitiveValues(
          diff,
          getPluginJsonSchema(setting.key),
          envMasking?.paths,
          envMasking?.values,
        ) as typeof diff;
        this.spinner.start(
          `[${driver.name}] ${Object.keys(maskedDiff)
            .map((key) => {
              return `${action} '${key}' to '${JSON.stringify(maskedDiff[key])}'`;
            })
            .join('\n')}`,
        );
        let applied = false;
        if (!dryRun) {
          try {
            await instance.apply(diff);
          } catch (err) {
            this.spinner.stop('failed');
            throw withSettingResults(err, {
              dryRun,
              settings: [...settings, buildSettingResult(setting.key, maskedDiff, false)],
              failedSetting: setting.key,
            });
          }
          this.spinner.stop();
          applied = true;
        }
        settings.push(buildSettingResult(setting.key, maskedDiff, applied));
        await this.browserforce.browserContext.tracing.groupEnd();
      } else {
        this.log(`[${driver.name}] no action necessary`);
        settings.push(buildSettingResult(setting.key, undefined, false));
      }
    }
    return {
      success: true,
      dryRun,
      settings,
    };
  }
}

/**
 * Entry of the `apply --json` result for one setting.
 * @param key config key of the setting
 * @param maskedDiff planned changes, already masked; undefined when no action is necessary
 * @param applied whether the changes were applied to the org
 */
export function buildSettingResult(key: string, maskedDiff: unknown, applied: boolean): BrowserforceApplySettingResult {
  if (maskedDiff === undefined) {
    return { key, changes: null, applied: false };
  }
  return { key, changes: maskedDiff as Record<string, unknown>, applied };
}

/**
 * The error of a failed setting, carrying in its `data` (shown by `--json`) the results of the settings handled before
 * it, so a caller knows which ones were already applied, and the documentation page of the failed setting (also shown
 * as an action). The message and the cause stay those of the original error.
 */
export function withSettingResults(
  err: unknown,
  data: { dryRun: boolean; settings: BrowserforceApplySettingResult[]; failedSetting: string },
): SfError {
  let sfError: SfError;
  if (err instanceof SfError) {
    sfError = err;
  } else if (err instanceof Error) {
    sfError = SfError.create({ message: err.message, name: err.name, cause: err.cause });
    sfError.stack = err.stack;
  } else {
    sfError = SfError.wrap(err);
  }
  const existingData =
    typeof sfError.data === 'object' && sfError.data !== null && !Array.isArray(sfError.data) ? sfError.data : {};
  const docUrl = settingDocUrl(data.failedSetting);
  sfError.actions = [...(sfError.actions ?? []), `See the documentation of '${data.failedSetting}': ${docUrl}`];
  // the results are plain JSON
  return sfError.setData({ ...existingData, ...data, docUrl } as unknown as SfError['data']);
}
