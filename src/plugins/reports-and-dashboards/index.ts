import { BrowserforcePlugin } from '../../plugin.js';
import {
  FolderSharing,
  Config as FolderSharingConfig,
} from './folder-sharing/index.js';

type Config = {
  folderSharing?: FolderSharingConfig;
};

export class ReportsAndDashboards extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {};
    if (definition) {
      if (definition.folderSharing) {
        const pluginFolderSharing = new FolderSharing(this.browserforce);
        response.folderSharing = await pluginFolderSharing.retrieve(
          definition.folderSharing
        );
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const response: Config = {};
    const folderSharing = new FolderSharing(this.browserforce).diff(
      state.folderSharing,
      definition.folderSharing
    ) as FolderSharingConfig | undefined;
    if (folderSharing !== undefined) {
      response.folderSharing = folderSharing;
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.folderSharing) {
      const pluginFolderSharing = new FolderSharing(this.browserforce);
      await pluginFolderSharing.apply(plan.folderSharing);
    }
  }
}
