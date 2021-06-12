import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import { Config as FolderSharingConfig, FolderSharing } from './folder-sharing';

type Config = {
  folderSharing?: FolderSharingConfig;
};

export class ReportsAndDashboards extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {};
    if (definition) {
      if (definition.folderSharing) {
        const pluginFolderSharing = new FolderSharing(
          this.browserforce,
          this.org
        );
        response.folderSharing = await pluginFolderSharing.retrieve(
          definition.folderSharing
        );
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config {
    const pluginFolderSharing = new FolderSharing(null, null);
    const response = {
      folderSharing: pluginFolderSharing.diff(
        state.folderSharing,
        definition.folderSharing
      )
    };
    return removeEmptyValues(response);
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.folderSharing) {
      const pluginFolderSharing = new FolderSharing(
        this.browserforce,
        this.org
      );
      await pluginFolderSharing.apply(plan.folderSharing);
    }
  }
}
