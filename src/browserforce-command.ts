import { Messages } from '@salesforce/core';
import { Flags, SfCommand, Ux, requiredOrgFlagWithDeprecations } from '@salesforce/sf-plugins-core';
import { promises } from 'fs';
import * as path from 'path';
import { Browserforce } from './browserforce';
import { ConfigParser } from './config-parser';
import * as DRIVERS from './plugins';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-browserforce-plugin', 'browserforce');

export class BrowserforceCommand extends SfCommand<unknown> {
  public static readonly flags = {
    'target-org': requiredOrgFlagWithDeprecations,
    definitionfile: Flags.string({
      char: 'f',
      summary: messages.getMessage('definitionFileDescription'),
      description: messages.getMessage('definitionFileDescription')
    }),
    planfile: Flags.string({
      char: 'p',
      name: 'plan',
      summary: messages.getMessage('planFileDescription'),
      description: messages.getMessage('planFileDescription')
    }),
    statefile: Flags.string({
      char: 's',
      name: 'state',
      summary: messages.getMessage('stateFileDescription'),
      description: messages.getMessage('stateFileDescription')
    })
  };

  protected bf: Browserforce;
  protected settings: any[];

  public async init(): Promise<void> {
    const { flags } = await this.parse(BrowserforceCommand);
    await super.init();
    let definition;
    if (flags.definitionfile) {
      const definitionFileData = await promises.readFile(path.resolve(flags.definitionfile), 'utf8');
      try {
        definition = JSON.parse(definitionFileData);
      } catch (err) {
        throw new Error('Failed parsing definitionfile');
      }
    }
    // TODO: use require.resolve to dynamically load plugins from npm packages
    this.settings = ConfigParser.parse(DRIVERS, definition);
    this.bf = new Browserforce(flags['target-org'], new Ux({ jsonEnabled: this.jsonEnabled() }));
    this.spinner.start('logging in');
    await this.bf.login();
    this.spinner.stop();
  }

  public async run(): Promise<unknown> {
    throw new Error('BrowserforceCommand should not be run directly');
  }

  public async finally(err?: Error): Promise<void> {
    this.spinner.stop(err?.message);
    if (this.bf) {
      this.spinner.start('logging out');
      await this.bf.logout();
      this.spinner.stop();
    }
  }
}
