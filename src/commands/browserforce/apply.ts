import { Messages } from '@salesforce/core';
import { BrowserforceCommand } from '../../browserforce-command';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-browserforce-plugin', 'browserforce');

export class BrowserforceApply extends BrowserforceCommand {
  public static description = messages.getMessage('applyCommandDescription');

  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -f ./config/setup-admin-login-as-any.json --target-org myOrg@example.com
  logging in... done
  Applying definition file ./config/setup-admin-login-as-any.json to org myOrg@example.com
  [Security] retrieving state... done
  [Security] changing 'loginAccessPolicies' to '{"administratorsCanLogInAsAnyUser":true}'... done
  logging out... done
  `
  ];

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(BrowserforceApply);
    this.log(`Applying definition file ${flags.definitionfile} to org ${flags['target-org'].getUsername()}`);
    for (const setting of this.settings) {
      const driver = setting.Driver;
      const instance = new driver(this.bf);
      this.spinner.start(`[${driver.name}] retrieving state`);
      let state;
      try {
        state = await instance.retrieve(setting.value);
      } catch (err) {
        this.spinner.stop('failed');
        throw err;
      }
      this.spinner.stop();
      const diff = instance.diff(state, setting.value);
      if (diff !== undefined) {
        this.spinner.start(
          `[${driver.name}] ${Object.keys(diff)
            .map((key) => {
              return `changing '${key}' to '${JSON.stringify(diff[key])}'`;
            })
            .join('\n')}`
        );
        try {
          await instance.apply(diff);
        } catch (err) {
          this.spinner.stop('failed');
          throw err;
        }
        this.spinner.stop();
      } else {
        this.log(`[${driver.name}] no action necessary`);
      }
    }
    return { success: true };
  }
}
