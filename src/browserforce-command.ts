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
      description: 'path to a browserforce config file',
    }),
    'dry-run': Flags.boolean({
      char: 'd',
      description: 'dry run',
      env: 'BROWSERFORCE_DRY_RUN',
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
        throw new Error('Failed parsing config file');
      }
    }
    handleDeprecations(definition);
    // TODO: use require.resolve to dynamically load plugins from npm packages
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
