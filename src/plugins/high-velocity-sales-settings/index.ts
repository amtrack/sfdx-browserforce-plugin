import { Connection } from '@salesforce/core';
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { HighVelocitySalesSetupPage } from './page.js';

export const highVelocitySalesSettingsSchema = z
  .object({
    setUpAndEnable: z.boolean().meta({ title: 'Set Up and Enable High Velocity Sales' }).optional(),
  })
  .describe(
    'Due to a bug, High Velocity Sales needs to be set up and enabled initially using the UI.\nOnce set up, it can be configured using HighVelocitySalesSettings Metadata https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_highvelocitysalessettings.htm',
  )
  .meta({
    id: 'highVelocitySalesSettings',
    title: 'HighVelocitySalesSettings',
  });

const MSG_NOT_AVAILABLE = `HighVelocitySales is not available in this organization.
Please add 'HighVelocitySales' to your Scratch Org Features or purchase a license.`;

export type HighVelocitySalesSettingsConfig = z.infer<typeof highVelocitySalesSettingsSchema>;

export class HighVelocitySalesSettings extends BrowserforcePlugin {
  public async retrieve(definition?: HighVelocitySalesSettingsConfig): Promise<HighVelocitySalesSettingsConfig> {
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

  public async apply(config: HighVelocitySalesSettingsConfig): Promise<void> {
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
