import { core, flags, SfdxCommand } from '@salesforce/command';
import * as path from 'path';
import Browserforce from './browserforce';
import ConfigParser from './config-parser';
import * as DRIVERS from './plugins';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export default class BrowserforceCommand extends SfdxCommand {
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

  public async init() {
    await super.init();
    const definition = await core.fs.readJson(
      path.resolve(this.flags.definitionfile)
    );
    // TODO: use require.resolve to dynamically load plugins from npm packages
    this.settings = ConfigParser.parse(DRIVERS, definition);
    this.bf = new Browserforce(this.org, this.ux.cli);
    this.ux.startSpinner('logging in');
    await this.bf.login();
    this.ux.stopSpinner();
  }

  public async run(): Promise<any> {
    throw new Error('BrowserforceCommand should not be run directly');
  }

  public async finally(err: any) {
    this.ux.stopSpinner();
    if (this.bf) {
      this.ux.startSpinner('logging out');
      await this.bf.logout();
      this.ux.stopSpinner();
    }
  }
}
