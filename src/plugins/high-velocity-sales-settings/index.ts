import { Connection } from '@salesforce/core';
import { BrowserforcePlugin } from '../../plugin.js';
import { HighVelocitySalesSetupPage } from './page.js';

const MSG_NOT_AVAILABLE = `HighVelocitySales is not available in this organization.
Please add 'HighVelocitySales' to your Scratch Org Features or purchase a license.`;

export type Config = {
  setUpAndEnable: boolean;
};

export class HighVelocitySalesSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const result = { setUpAndEnable: false };
    try {
      const settings = await this.browserforce.connection.metadata.read(
        'HighVelocitySalesSettings',
        'HighVelocitySales',
      );
      result.setUpAndEnable = settings['enableHighVelocitySalesSetup'] === true;
    } catch (e) {
      if (/INVALID_TYPE: This type of metadata is not available for this organization/.test(e)) {
        throw new Error(MSG_NOT_AVAILABLE);
      } else {
        throw e;
      }
    }
    return result;
  }

  public async apply(config: Config): Promise<void> {
    if (config.setUpAndEnable) {
      await using page = await this.browserforce.openPage(HighVelocitySalesSetupPage.getUrl());
      const hvs = new HighVelocitySalesSetupPage(page);
      await hvs.setUpAndEnable();
    } else {
      await disableHighVelocitySalesUsingMetadata(this.browserforce.connection);
    }
  }
}

export async function disableHighVelocitySalesUsingMetadata(connection: Connection): Promise<void> {
  const settings = {
    fullName: 'HighVelocitySales',
    enableHighVelocitySalesSetup: false,
    enableHighVelocitySales: false,
  };
  await connection.metadata.update('HighVelocitySalesSettings', settings);
}
