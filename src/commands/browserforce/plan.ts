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

export default class BrowserforcePlanCommand extends SfdxCommand {
  public static description = messages.getMessage(
    'planCommandDescription'
  );

  public static examples = [
    `$ sfdx browserforce:plan -f ./config/setup-admin-login-as-any.json -o /tmp/state.json --targetusername myOrg@example.com
  Generating plan with definition file ./config/setup-admin-login-as-any.json from org myOrg@example.com
  logging in... done
  [LoginAccessPolicies] retrieving state... done
  [LoginAccessPolicies] generating plan... done
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
    this.ux.log(
      `Generating plan with definition file ${
        this.flags.definitionfile
      } from org ${this.org.getUsername()}`
    );
    this.bf = new Browserforce(this.org);

    this.ux.startSpinner('logging in');
    await this.bf.login();
    this.ux.stopSpinner();

    const state = {
      settings: {}
    };
    const plan = {
      settings: {}
    };
    for (const setting of settings) {
      const driver = setting.Driver.default;
      const instance = new driver(this.bf, this.org);
      this.ux.startSpinner(`[${driver.name}] retrieving state`);
      let driverState;
      try {
        driverState = await instance.retrieve();
        state.settings[setting.key] = driverState;
      } catch (err) {
        this.ux.stopSpinner('failed');
        throw err;
      }
      this.ux.stopSpinner();
      this.ux.startSpinner(`[${driver.name}] generating plan`);
      const driverPlan = instance.diff(driverState, setting.value);
      plan.settings[setting.key] = driverPlan;
      this.ux.stopSpinner();
    }
    if (this.flags.statefile) {
      this.ux.startSpinner('writing state file');
      await fs.writeJson(path.resolve(this.flags.statefile), state);
      this.ux.stopSpinner();
    }
    if (this.flags.planfile) {
      this.ux.startSpinner('writing plan file');
      await fs.writeJson(path.resolve(this.flags.planfile), plan);
      this.ux.stopSpinner();
    }
    return { success: true, plan };
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
