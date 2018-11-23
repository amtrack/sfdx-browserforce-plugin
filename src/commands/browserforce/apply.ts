import { core, flags, SfdxCommand } from '@salesforce/command';
import { fs } from '@salesforce/core';
import * as path from 'path';
import Browserforce from '../../browserforce';
import ConfigParser from '../../config-parser';
import * as DRIVERS from '../../plugins';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export default class BrowserforceApply extends SfdxCommand {
  public static description = messages.getMessage(
    'applyCommandDescription'
  );

  public static examples = [
    `$ sfdx browserforce:apply -f ./config/setup-admin-login-as-any.json --targetusername myOrg@example.com
  Applying plan file ./config/setup-admin-login-as-any.json to org myOrg@example.com
  logging in... done
  [LoginAccessPolicies] retrieving state... done
  [LoginAccessPolicies] changing 'administratorsCanLogInAsAnyUser' to 'true'... done
  logging out... done
  `
  ];

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

  protected static requiresUsername = true;
  private bf: Browserforce;

  // tslint:disable-next-line:no-any
  public async run(): Promise<any> {
    const definition = await fs.readJson(
      path.resolve(this.flags.definitionfile)
    );
    const settings = ConfigParser.parse(DRIVERS, definition);
    const logger = await core.Logger.root();
    this.ux.log(
      `Applying plan file ${
        this.flags.definitionfile
      } to org ${this.org.getUsername()}`
    );
    this.bf = new Browserforce(this.org);

    this.ux.startSpinner('logging in');
    await this.bf.login();
    this.ux.stopSpinner();

    for (const setting of settings) {
      const driver = setting.Driver.default;
      const instance = new driver(this.bf, this.org);
      this.ux.startSpinner(`[${driver.name}] retrieving state`);
      let state;
      try {
        state = await instance.retrieve();
      } catch (err) {
        this.ux.stopSpinner('failed');
        throw err;
      }
      this.ux.stopSpinner();
      logger.debug(`generating action for driver ${driver.name}`);
      const action = instance.diff(state, setting.value);
      this.ux.stopSpinner();
      if (action && Object.keys(action).length) {
        this.ux.startSpinner(
          `[${driver.name}] ${Object.keys(action)
            .map(key => {
              return `changing '${key}' to '${JSON.stringify(action[key])}'`;
            })
            .join('\n')}`
        );
        try {
          await instance.apply(action);
        } catch (err) {
          this.ux.stopSpinner('failed');
          throw err;
        }
        this.ux.stopSpinner();
      } else {
        this.ux.log(`[${driver.name}] no action necessary`);
      }
    }
    return { success: true };
  }

  // tslint:disable-next-line:no-any
  public async finally(err: any) {
    this.ux.stopSpinner();
    if (this.bf) {
      this.ux.startSpinner('logging out');
      await this.bf.logout();
      this.ux.stopSpinner();
    }
  }
}
