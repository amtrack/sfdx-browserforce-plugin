import { BrowserforcePlugin } from '../../plugin.js';
import { Capacity, CapacityConfig } from './capacity/index.js';

type Config = {
  serviceChannelDeveloperName: string;
  capacity?: CapacityConfig;
};

export class ServiceChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {
      serviceChannelDeveloperName: definition!.serviceChannelDeveloperName
    };
    if (definition) {
      if (definition.capacity) {
        const pluginCapacity = new Capacity(this.browserforce);
        response.capacity = await pluginCapacity.retrieve(definition);
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const pluginCapacity = new Capacity(this.browserforce).diff(
      state.capacity,
      definition.capacity
    );
    const response: Config = {
      serviceChannelDeveloperName: definition!.serviceChannelDeveloperName
    };
    if (pluginCapacity !== undefined) {
      response.capacity = pluginCapacity;
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.capacity) {
      const pluginCapacity = new Capacity(this.browserforce);
      await pluginCapacity.apply(plan);
    }
  }
}
