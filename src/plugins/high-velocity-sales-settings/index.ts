import { Connection } from '@salesforce/core';
import { BrowserforcePlugin } from '../../plugin';
import { HighVelocitySalesSetupPage } from './page';

const MSG_NOT_AVAILABLE = `HighVelocitySales is not available in this organization.
Please add 'HighVelocitySales' to your Scratch Org Features or purchase a license.`;

type Config = {
  setUpAndEnable: boolean;
};

export class HighVelocitySalesSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const conn = this.org.getConnection();
    const result = { setUpAndEnable: false };
    try {
      const settings = await conn.metadata.read(
        'HighVelocitySalesSettings',
        'HighVelocitySales'
      );
      result.setUpAndEnable =
        settings['enableHighVelocitySalesSetup'] === true;
    } catch (e) {
      if (
        /INVALID_TYPE: This type of metadata is not available for this organization/.test(
          e
        )
      ) {
        throw new Error(MSG_NOT_AVAILABLE);
      } else {
        throw e;
      }
    }
    return result;
  }

  public async apply(config: Config): Promise<void> {
    if (config.setUpAndEnable) {
      const page = new HighVelocitySalesSetupPage(
        await this.browserforce.openPage(HighVelocitySalesSetupPage.getUrl())
      );
      await page.setUpAndEnable();
    } else {
      const conn = this.org.getConnection();
      await disableHighVelocitySalesUsingMetadata(conn);
    }
  }
}

export async function disableHighVelocitySalesUsingMetadata(
  conn: Connection
): Promise<void> {
  const settings = {
    fullName: 'HighVelocitySales',
    enableHighVelocitySalesSetup: false,
    enableHighVelocitySales: false
  };
  await conn.metadata.update('HighVelocitySalesSettings', settings);
}
