import { BrowserforceCommand } from '../../browserforce-command.js';

type BrowserforceApplyResponse = {
  success: boolean;
};

export class BrowserforceApply extends BrowserforceCommand<BrowserforceApplyResponse> {
  public static description = 'apply a plan from a definition file';
  public static examples = [
    `$ <%= config.bin %> <%= command.id %> -f ./config/currency.json --target-org myOrg@example.com
  logging in... done
  Applying definition file ./config/currency.json to org myOrg@example.com
  [CompanyInformation] retrieving state... done
  [CompanyInformation] changing 'defaultCurrencyIsoCode' to '"English (South Africa) - ZAR"'... done
  logging out... done
  `,
  ];

  public async run(): Promise<BrowserforceApplyResponse> {
    const { flags } = await this.parse(BrowserforceApply);
    this.log(
      `Applying definition file ${flags.definitionfile} to org ${flags[
        'target-org'
      ].getUsername()}`
    );
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
    return {
      success: true,
    };
  }
}
