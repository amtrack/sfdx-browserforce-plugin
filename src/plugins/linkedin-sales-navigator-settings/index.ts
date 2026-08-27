import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { LinkedInSalesNavigatorPage } from './page.js';

export const linkedInSalesNavigatorSettingsSchema = z
  .object({
    enabled: z.boolean().meta({ title: 'Enable LinkedIn Sales Navigator Integration' }).optional(),
  })
  .meta({ id: 'linkedInSalesNavigatorSettings', title: 'LinkedIn Sales Navigator Settings' });

export type LinkedInSalesNavigatorSettingsConfig = z.infer<typeof linkedInSalesNavigatorSettingsSchema>;

export class LinkedInSalesNavigatorSettings extends BrowserforcePlugin {
  public async retrieve(
    definition?: LinkedInSalesNavigatorSettingsConfig,
  ): Promise<LinkedInSalesNavigatorSettingsConfig> {
    const result = { enabled: false };
    await using page = await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl());
    const linkedIn = new LinkedInSalesNavigatorPage(page);
    result.enabled = await linkedIn.getStatus();
    return result;
  }

  public async apply(config: LinkedInSalesNavigatorSettingsConfig): Promise<void> {
    await using page = await this.browserforce.openPage(LinkedInSalesNavigatorPage.getUrl());
    const linkedIn = new LinkedInSalesNavigatorPage(page);
    await linkedIn.setStatus(config.enabled);
  }
}
