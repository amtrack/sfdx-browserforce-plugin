import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { AccountIntelligenceViewPage } from './page.js';

export const accountIntelligenceViewSchema = z
  .object({
    enable: z.boolean().meta({ title: 'Enable Account Intelligence View' }).optional(),
  })
  .meta({ id: 'accountIntelligenceView', title: 'Account Intelligence View' });

export type AccountIntelligenceViewConfig = z.infer<typeof accountIntelligenceViewSchema>;

export class AccountIntelligenceView extends BrowserforcePlugin {
  public async retrieve(): Promise<AccountIntelligenceViewConfig> {
    await using page = await this.browserforce.openPage(AccountIntelligenceViewPage.getUrl());
    const accountIntelligenceView = new AccountIntelligenceViewPage(page);
    return { enable: await accountIntelligenceView.getStatus() };
  }

  public async apply(config: AccountIntelligenceViewConfig): Promise<void> {
    if (config.enable === undefined) {
      return;
    }
    await using page = await this.browserforce.openPage(AccountIntelligenceViewPage.getUrl());
    const accountIntelligenceView = new AccountIntelligenceViewPage(page);
    await accountIntelligenceView.setStatus(config.enable);
  }
}
