import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { OverviewPage } from './pages/overview.js';
import { SetupPage } from './pages/setup.js';

export const opportunitySplitsSchema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable Opportunity Splits',
      })
      .describe(
        "Prerequisite: Opportunity Teams must be enabled e.g. by deploying 'Settings:Opportunity' containing `<enableOpportunityTeam>true</enableOpportunityTeam>`.",
      )
      .optional(),
  })
  .meta({ id: 'opportunitySplits', title: 'OpportunitySplits Settings' });

export type OpportunitySplitsConfig = z.infer<typeof opportunitySplitsSchema>;

export class OpportunitySplits extends BrowserforcePlugin {
  public async retrieve(definition?: OpportunitySplitsConfig): Promise<OpportunitySplitsConfig> {
    await using page = await this.browserforce.openPage(OverviewPage.PATH);
    const overviewPage = new OverviewPage(page);
    const response = {
      enabled: await overviewPage.isEnabled(),
    };
    return response;
  }

  public async apply(config: OpportunitySplitsConfig): Promise<void> {
    if (config.enabled) {
      await using page = await this.browserforce.openPage(SetupPage.PATH);
      const setupPage = new SetupPage(page);
      const layoutSelectionPage = await setupPage.enable();
      const overviewPage = await layoutSelectionPage.choose();
      await overviewPage.waitUntilCompleted();
    } else {
      await using page = await this.browserforce.openPage(OverviewPage.PATH);
      const overviewPage = new OverviewPage(page);
      await overviewPage.disable();
      await overviewPage.waitUntilCompleted();
    }
  }
}
