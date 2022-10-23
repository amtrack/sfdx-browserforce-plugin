import { flags, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { promises } from 'fs';
import * as path from 'path';
import { Browserforce } from './browserforce';
import { ConfigParser } from './config-parser';
import * as DRIVERS from './plugins';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export class BrowserforceCommand extends SfdxCommand {
  protected static requiresUsername = true;

  protected static flagsConfig = {
    definitionfile: flags.string({
      char: 'f',
      description: messages.getMessage('definitionFileDescription')
    }),
    planfile: flags.string({
      char: 'p',
      name: 'plan',
      description: messages.getMessage('planFileDescription')
    }),
    statefile: flags.string({
      char: 's',
      name: 'state',
      description: messages.getMessage('stateFileDescription')
    })
  };

  protected bf: Browserforce;
  protected settings: any[];

  public async init(): Promise<void> {
    await super.init();
    const definitionFileData = await promises.readFile(
      path.resolve(this.flags.definitionfile),
      'utf8'
    );
    let definition;
    try {
      definition = JSON.parse(definitionFileData);
    } catch (err) {
      throw new Error('Failed parsing definitionfile');
    }
    // TODO: use require.resolve to dynamically load plugins from npm packages
    this.settings = ConfigParser.parse(DRIVERS, definition);
    this.bf = new Browserforce(this.org, this.ux);
    this.ux.startSpinner('logging in');
    await this.bf.login();
    this.ux.stopSpinner();
  }

  public async run(): Promise<unknown> {
    throw new Error('BrowserforceCommand should not be run directly');
  }

  public async finally(err: Error): Promise<void> {
    this.ux.stopSpinner();
    if (this.bf) {
      this.ux.startSpinner('logging out');
      await this.bf.logout();
      this.ux.stopSpinner();
    }
  }
}
