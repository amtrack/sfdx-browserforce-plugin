import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import FolderSharing from './folderSharing';

export default class ReportsAndDashboards extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const response = {
      folderSharing: {}
    };
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

  public diff(state, definition) {
    const pluginFolderSharing = new FolderSharing(null, null);
    const response = {
      folderSharing: pluginFolderSharing.diff(
        state.folderSharing,
        definition.folderSharing
      )
    };
    return removeEmptyValues(response);
  }

  public async apply(plan) {
    if (plan.folderSharing) {
      const pluginFolderSharing = new FolderSharing(
        this.browserforce,
        this.org
      );
      await pluginFolderSharing.apply(plan.folderSharing);
    }
  }
}
