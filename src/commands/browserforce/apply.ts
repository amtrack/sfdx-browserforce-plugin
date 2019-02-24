import { core } from '@salesforce/command';
import BrowserforceCommand from '../../browserforceCommand';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export default class BrowserforceApply extends BrowserforceCommand {
  public static description = messages.getMessage('applyCommandDescription');

  public static examples = [
    `$ sfdx browserforce:apply -f ./config/setup-admin-login-as-any.json --targetusername myOrg@example.com
  Applying plan file ./config/setup-admin-login-as-any.json to org myOrg@example.com
  logging in... done
  [Security] retrieving state... done
  [Security] changing 'loginAccessPolicies' to '{"administratorsCanLogInAsAnyUser":true}'... done
  logging out... done
  `
  ];

  // tslint:disable-next-line:no-any
  public async run(): Promise<any> {
    const logger = await core.Logger.root();
    this.ux.log(
      `Applying plan file ${
        this.flags.definitionfile
      } to org ${this.org.getUsername()}`
    );
    for (const setting of this.settings) {
      const driver = setting.Driver.default;
      const instance = new driver(this.bf, this.org);
      this.ux.startSpinner(`[${driver.name}] retrieving state`);
      let state;
      try {
        state = await instance.retrieve(setting.value);
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
}
