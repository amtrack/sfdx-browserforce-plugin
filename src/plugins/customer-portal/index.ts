import { BrowserforcePlugin } from '../../plugin';
import CustomerPortalAvailableCustomObjects from './availableCustomObjects';
import CustomerPortalEnable from './enableCustomerPortal';
import CustomerPortalSetup from './portals';

const removeNullValues = obj => {
  if (!obj) {
    obj = {};
  }
  Object.entries(obj).forEach(
    ([key, val]) =>
      (val && typeof val === 'object' && removeNullValues(val)) ||
      ((val === null || val === undefined) && delete obj[key])
  );
  return obj;
};

export default class CustomerPortal extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const pluginEnable = new CustomerPortalEnable(this.browserforce, this.org);
    const response = {
      enableCustomerPortal: false,
      portals: [],
      availableCustomObjects: []
    };
    response.enableCustomerPortal = await pluginEnable.retrieve();
    if (definition.portals) {
      const pluginSetup = new CustomerPortalSetup(this.browserforce, this.org);
      response.portals = await pluginSetup.retrieve(definition);
    }
    if (definition.availableCustomObjects) {
      const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(
        this.browserforce,
        this.org
      );
      response.availableCustomObjects = await pluginAvailableCustomObjects.retrieve(
        definition
      );
    }
    return removeNullValues(response);
  }

  public diff(state, definition) {
    const pluginEnable = new CustomerPortalEnable(null, null);
    const pluginSetup = new CustomerPortalSetup(null, null);
    const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(
      null,
      null
    );
    const response = {
      enableCustomerPortal: pluginEnable.diff(
        state.enableCustomerPortal,
        definition.enableCustomerPortal
      ),
      portals: pluginSetup.diff(state.portals, definition.portals),
      availableCustomObjects: pluginAvailableCustomObjects.diff(
        state.availableCustomObjects,
        definition.availableCustomObjects
      )
    };
    return response;
  }

  public async apply(config) {
    if (config.enableCustomerPortal !== undefined) {
      const pluginEnable = new CustomerPortalEnable(
        this.browserforce,
        this.org
      );
      await pluginEnable.apply(config.enableCustomerPortal);
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
