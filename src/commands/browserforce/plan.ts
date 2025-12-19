import { writeFile } from 'fs/promises';
import * as path from 'path';
import { BrowserforceCommand } from '../../browserforce-command.js';

type BrowserforceApplyResponse = {
  success: boolean;
};

export class BrowserforcePlanCommand extends BrowserforceCommand<BrowserforceApplyResponse> {
  public static description = 'retrieve state and generate plan file';
  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -f ./config/currency.json --target-org myOrg@example.com
  logging in... done
  Generating plan with definition file ./config/currency.json from org myOrg@example.com
  [CompanyInformation] retrieving state... done
  [CompanyInformation] generating plan... done
  logging out... done
  `,
  ];

  public async run(): Promise<BrowserforceApplyResponse> {
    const { flags } = await this.parse(BrowserforcePlanCommand);
    this.log(
      `Generating plan with definition file ${flags.definitionfile} from org ${flags['target-org'].getUsername()}`,
    );
    const state = {
      settings: {},
    };
    const plan = {
      settings: {},
    };
    for (const setting of this.settings) {
      const driver = setting.Driver;
      const instance = new driver(this.bf);
      this.spinner.start(`[${driver.name}] retrieving state`);
      let driverState;
      try {
        driverState = await instance.retrieve(setting.value);
        state.settings[setting.key] = driverState;
      } catch (err) {
        this.spinner.stop('failed');
        throw err;
      }
      this.spinner.stop();
      this.spinner.start(`[${driver.name}] generating plan`);
      const driverPlan = instance.diff(driverState, setting.value);
      plan.settings[setting.key] = driverPlan;
      this.spinner.stop();
    }
    if (flags.statefile) {
      this.spinner.start('writing state file');
      await writeFile(path.resolve(flags.statefile), JSON.stringify(state, null, 2));
      this.spinner.stop();
    }
    if (flags.planfile) {
      this.spinner.start('writing plan file');
      await writeFile(path.resolve(flags.planfile), JSON.stringify(plan, null, 2));
      this.spinner.stop();
    }
    return { success: true };
  }
}
