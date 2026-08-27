import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { FolderSharing, FolderSharingConfig, folderSharingSchema } from './folder-sharing/index.js';

export const reportsAndDashboardsSchema = z
  .object({
    folderSharing: folderSharingSchema.optional(),
  })
  .meta({ id: 'reportsAndDashboards', title: 'Reports & Dashboards' });

type ReportsAndDashboardsConfig = {
  folderSharing?: FolderSharingConfig;
};

export class ReportsAndDashboards extends BrowserforcePlugin {
  public async retrieve(definition?: ReportsAndDashboardsConfig): Promise<ReportsAndDashboardsConfig> {
    const response: ReportsAndDashboardsConfig = {};
    if (definition) {
      if (definition.folderSharing) {
        const pluginFolderSharing = new FolderSharing(this.browserforce);
        response.folderSharing = await pluginFolderSharing.retrieve(definition.folderSharing);
      }
    }
    return response;
  }

  public diff(
    state: ReportsAndDashboardsConfig,
    definition: ReportsAndDashboardsConfig,
  ): ReportsAndDashboardsConfig | undefined {
    const response: ReportsAndDashboardsConfig = {};
    const folderSharing = new FolderSharing(this.browserforce).diff(state.folderSharing, definition.folderSharing) as
      FolderSharingConfig | undefined;
    if (folderSharing !== undefined) {
      response.folderSharing = folderSharing;
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: ReportsAndDashboardsConfig): Promise<void> {
    if (plan.folderSharing) {
      const pluginFolderSharing = new FolderSharing(this.browserforce);
      await pluginFolderSharing.apply(plan.folderSharing);
    }
  }
}
