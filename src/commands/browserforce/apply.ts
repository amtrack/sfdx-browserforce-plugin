import { Messages } from '@salesforce/core';
import { BrowserforceCommand } from '../../browserforce-command';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'browserforce'
);

export class BrowserforceApply extends BrowserforceCommand {
  public static description = messages.getMessage('applyCommandDescription');

  public static examples = [
    `$ sfdx <%= command.id %> -f ./config/setup-admin-login-as-any.json --targetusername myOrg@example.com
  logging in... done
  Applying definition file ./config/setup-admin-login-as-any.json to org myOrg@example.com
  [Security] retrieving state... done
  [Security] changing 'loginAccessPolicies' to '{"administratorsCanLogInAsAnyUser":true}'... done
  logging out... done
  `
  ];

  public async run(): Promise<unknown> {
    this.ux.log(
      `Applying definition file ${
        this.flags.definitionfile
      } to org ${this.org.getUsername()}`
    );
    for (const setting of this.settings) {
      const driver = setting.Driver;
      const instance = new driver(this.bf);
      this.ux.startSpinner(`[${driver.name}] retrieving state`);
      let state;
      try {
        state = await instance.retrieve(setting.value);
      } catch (err) {
        this.ux.stopSpinner('failed');
        throw err;
      }
      this.ux.stopSpinner();
      const action = instance.diff(state, setting.value);
      this.ux.stopSpinner();
      if (action && Object.keys(action).length) {
        this.ux.startSpinner(
          `[${driver.name}] ${Object.keys(action)
            .map((key) => {
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
