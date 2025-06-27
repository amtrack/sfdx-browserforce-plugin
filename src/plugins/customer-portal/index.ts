import { BrowserforcePlugin } from '../../plugin.js';
import {
  CustomerPortalAvailableCustomObjects,
  Config as CustomerPortalAvailableCustomObjectsConfig,
} from './available-custom-objects/index.js';
import {
  CustomerPortalEnable,
  Config as CustomerPortalEnableConfig,
} from './enabled/index.js';
import {
  CustomerPortalSetup,
  Config as CustomerPortalSetupConfig,
} from './portals/index.js';

type Config = {
  enabled?: CustomerPortalEnableConfig;
  portals?: CustomerPortalSetupConfig;
  availableCustomObjects?: CustomerPortalAvailableCustomObjectsConfig;
};

export class CustomerPortal extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const pluginEnable = new CustomerPortalEnable(this.browserforce);
    const response: Config = {
      enabled: false,
      portals: [],
      availableCustomObjects: [],
    };
    response.enabled = await pluginEnable.retrieve();
    if (response.enabled) {
      if (definition.portals) {
        const pluginSetup = new CustomerPortalSetup(this.browserforce);
        response.portals = await pluginSetup.retrieve();
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

  public diff(state: Config, definition: Config): Config | undefined {
    const enabled = new CustomerPortalEnable(this.browserforce).diff(
      state.enabled,
      definition.enabled
    ) as boolean | undefined;
    const portals = new CustomerPortalSetup(this.browserforce).diff(
      state.portals,
      definition.portals
    );
    const availableCustomObjects = new CustomerPortalAvailableCustomObjects(
      this.browserforce
    ).diff(state.availableCustomObjects, definition.availableCustomObjects);
    const response: Config = {
      ...(enabled !== undefined && {
        enabled,
      }),
      ...(portals !== undefined && {
        portals,
      }),
      ...(availableCustomObjects !== undefined && {
        availableCustomObjects,
      }),
    };
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(config: Config): Promise<void> {
    if (config.enabled !== undefined) {
      const pluginEnable = new CustomerPortalEnable(this.browserforce);
      await pluginEnable.apply(config.enabled);
    }
    if (config.portals?.length) {
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
