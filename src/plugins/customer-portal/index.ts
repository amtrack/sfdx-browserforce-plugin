import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import CustomerPortalAvailableCustomObjects from './available-custom-objects';
import CustomerPortalEnable from './enabled';
import CustomerPortalSetup from './portals';

export default class CustomerPortal extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const pluginEnable = new CustomerPortalEnable(this.browserforce, this.org);
    const response = {
      enabled: false,
      portals: [],
      availableCustomObjects: []
    };
    response.enabled = await pluginEnable.retrieve(definition.enabled);
    if (response.enabled) {
      if (definition.portals) {
        const pluginSetup = new CustomerPortalSetup(
          this.browserforce,
          this.org
        );
        response.portals = await pluginSetup.retrieve(definition.portals);
      }
      if (definition.availableCustomObjects) {
        const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(
          this.browserforce,
          this.org
        );
        response.availableCustomObjects = await pluginAvailableCustomObjects.retrieve(
          definition.availableCustomObjects
        );
      }
    }
    return response;
  }

  public diff(state, definition) {
    const pluginEnable = new CustomerPortalEnable(null, null);
    const pluginSetup = new CustomerPortalSetup(null, null);
    const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(
      null,
      null
    );
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

  public async apply(config) {
    if (config.enabled !== undefined) {
      const pluginEnable = new CustomerPortalEnable(
        this.browserforce,
        this.org
      );
      await pluginEnable.apply(config.enabled);
    }
    if (config.portals && config.portals.length) {
      const pluginSetup = new CustomerPortalSetup(this.browserforce, this.org);
      await pluginSetup.apply(config.portals);
    }
    if (config.availableCustomObjects) {
      const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(
        this.browserforce,
        this.org
      );
      await pluginAvailableCustomObjects.apply(config.availableCustomObjects);
    }
  }
}
