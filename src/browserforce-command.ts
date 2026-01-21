import { Flags, SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { promises } from 'fs';
import * as path from 'path';
import { Browserforce } from './browserforce.js';
import { ConfigParser } from './config-parser.js';
import { handleDeprecations } from './plugins/deprecated.js';
import * as DRIVERS from './plugins/index.js';

export abstract class BrowserforceCommand<T> extends SfCommand<T> {
  static baseFlags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.requiredOrg(),
    definitionfile: Flags.string({
      char: 'f',
      description: 'path to a browserforce state file',
    }),
    planfile: Flags.string({
      char: 'p',
      name: 'plan',
      description: 'path to a browserforce plan file',
    }),
    statefile: Flags.string({
      char: 's',
      name: 'state',
      description:
        'path to a browserforce definition file\nThe schema is similar to the scratch org definition file.\nSee https://github.com/amtrack/sfdx-browserforce-plugin#supported-org-preferences for supported values.',
    }),
  };
  protected bf: Browserforce;
  protected settings: any[];

  public async init(): Promise<void> {
    await super.init();
    const { flags } = await this.parse({
      baseFlags: BrowserforceCommand.baseFlags,
    });
    let definition;
    if (flags.definitionfile) {
      const definitionFileData = await promises.readFile(path.resolve(flags.definitionfile), 'utf8');
      try {
        definition = JSON.parse(definitionFileData);
      } catch (err) {
        throw new Error('Failed parsing definitionfile');
      }
    }
    handleDeprecations(definition);
    this.settings = ConfigParser.parse(DRIVERS, definition);
    this.bf = new Browserforce(flags['target-org'], new Ux({ jsonEnabled: this.jsonEnabled() }));
    this.spinner.start('logging in');
    await this.bf.login();
    this.spinner.stop();
  }

  public async finally(err?: Error): Promise<void> {
    this.spinner.stop(err?.toString());
    if (err?.cause instanceof Error) {
      this.logToStderr(`Cause: ${err.cause.toString()}`);
    }
    if (this.bf) {
      this.spinner.start('logging out');
      await this.bf.logout();
      this.spinner.stop();
    }
  }
}
