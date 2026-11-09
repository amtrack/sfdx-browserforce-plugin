import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { SfError } from '@salesforce/core';
import { promises } from 'node:fs';
import * as path from 'node:path';
import { type ConfigIssue, ConfigParser, getSettingsObject } from '../../../config-parser.js';
import { findEnvReferences, formatPath } from '../../../env-references.js';

export type BrowserforcePluginsValidateResult = {
  valid: boolean;
  /** the settings (plugin keys) used by the config */
  settings: string[];
  errors: ConfigIssue[];
  /** the environment variables the config references, resolved only by `browserforce apply` */
  environmentVariables: Array<{ name: string; path: string }>;
};

export class BrowserforcePluginsValidate extends SfCommand<BrowserforcePluginsValidateResult> {
  public static summary = 'validate a Browserforce config without connecting to an org';
  public static description = `Check a config file, or inline JSON, against the schemas of all settings and report every error with its path and the documentation page of the setting. Removed settings are reported with their migration instructions.

Values written with a dollar sign followed by a variable name in braces (the shell style reference to an environment variable, for example API_KEY) are accepted in place of any value: they are environment variable references that "browserforce apply" resolves and checks before logging in. They are listed in the result. Write two dollar signs in front of the opening brace to keep the literal text.

The command exits with code 1 when the config is invalid; with --json, the result still lists the errors.`;
  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -f ./config/currency.json`,
    `$ <%= config.bin %> <%= command.id %> --config '{"settings":{"densitySettings":{"density":"Compact"}}}' --json`,
  ];

  public static flags = {
    definitionfile: Flags.string({
      char: 'f',
      summary: 'path to a browserforce config file',
      exactlyOne: ['definitionfile', 'config'],
    }),
    config: Flags.string({
      summary: 'browserforce config as a JSON string',
      exactlyOne: ['definitionfile', 'config'],
    }),
  };

  public async run(): Promise<BrowserforcePluginsValidateResult> {
    const { flags } = await this.parse(BrowserforcePluginsValidate);
    const data = await readConfig(flags.definitionfile, flags.config);
    const errors = ConfigParser.validate(data, { allowEnvReferences: true });
    const settings = getSettingsObject(data) ?? {};
    const result: BrowserforcePluginsValidateResult = {
      valid: errors.length === 0,
      settings: Object.keys(settings),
      errors,
      environmentVariables: findEnvReferences(settings).map((reference) => ({
        name: reference.name,
        path: formatPath(['settings', ...reference.path]),
      })),
    };

    if (result.valid) {
      this.logSuccess(`The config is valid (${result.settings.length} setting(s)).`);
    } else {
      this.log(`The config is invalid:`);
      for (const error of errors) {
        // a removed setting's message already ends with its instructions URL
        this.log(
          `  ${error.path}: ${error.message}${error.message.includes(error.docUrl) ? '' : ` (${error.docUrl})`}`,
        );
      }
      process.exitCode = 1;
    }
    if (result.environmentVariables.length > 0) {
      this.log(
        `Environment variables resolved by "browserforce apply": ${[
          ...new Set(result.environmentVariables.map((variable) => variable.name)),
        ].join(', ')}`,
      );
    }
    return result;
  }
}

async function readConfig(definitionFile: string | undefined, inlineConfig: string | undefined): Promise<unknown> {
  const text = definitionFile ? await promises.readFile(path.resolve(definitionFile), 'utf8') : (inlineConfig ?? '');
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new SfError(
      `Failed parsing ${definitionFile ? `config file ${definitionFile}` : 'config'}: ${(err as Error).message}`,
      'InvalidJson',
    );
  }
}
