import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import {
  Config as CustomerPortalAvailableCustomObjectsConfig,
  CustomerPortalAvailableCustomObjects
} from './available-custom-objects';
import {
  Config as CustomerPortalEnableConfig,
  CustomerPortalEnable
} from './enabled';
import {
  Config as CustomerPortalSetupConfig,
  CustomerPortalSetup
} from './portals';

type Config = {
  enabled?: CustomerPortalEnableConfig;
  portals?: CustomerPortalSetupConfig;
  availableCustomObjects?: CustomerPortalAvailableCustomObjectsConfig;
};

export class CustomerPortal extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const pluginEnable = new CustomerPortalEnable(this.browserforce);
    const response = {
      enabled: false,
      portals: [],
      availableCustomObjects: []
    };
    response.enabled = await pluginEnable.retrieve(definition.enabled);
    if (response.enabled) {
      if (definition.portals) {
        const pluginSetup = new CustomerPortalSetup(this.browserforce);
        response.portals = await pluginSetup.retrieve(definition.portals);
      }
      if (definition.availableCustomObjects) {
        const pluginAvailableCustomObjects =
          new CustomerPortalAvailableCustomObjects(this.browserforce);
        response.availableCustomObjects =
          await pluginAvailableCustomObjects.retrieve(
            definition.availableCustomObjects
          );
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config {
    const pluginEnable = new CustomerPortalEnable(null);
    const pluginSetup = new CustomerPortalSetup(null);
    const pluginAvailableCustomObjects =
      new CustomerPortalAvailableCustomObjects(null);
    const response = {
      enabled: pluginEnable.diff(state.enabled, definition.enabled),
      portals: pluginSetup.diff(state.portals, definition.portals),
      availableCustomObjects: pluginAvailableCustomObjects.diff(
        state.availableCustomObjects,
        definition.availableCustomObjects
      )
    };
    return removeEmptyValues(response);
  }

  public async apply(config: Config): Promise<void> {
    if (config.enabled !== undefined) {
      const pluginEnable = new CustomerPortalEnable(this.browserforce);
      await pluginEnable.apply(config.enabled);
    }
    if (config.portals && config.portals.length) {
      const pluginSetup = new CustomerPortalSetup(this.browserforce);
      await pluginSetup.apply(config.portals);
    }
    if (config.availableCustomObjects) {
      const pluginAvailableCustomObjects =
        new CustomerPortalAvailableCustomObjects(this.browserforce);
      await pluginAvailableCustomObjects.apply(config.availableCustomObjects);
    }
  }
}
