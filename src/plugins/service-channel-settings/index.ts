import { BrowserforcePlugin } from '../../plugin.js';
import { Capacity, CapacityConfig } from './capacity/index.js';

type Config = {
  serviceChannelConfigurations: ServiceChannelConfiguration[];
};

type ServiceChannelConfiguration = {
  serviceChannelDeveloperName: string;
  capacity: CapacityConfig;
};

export class ServiceChannelSettings extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const pluginCapacity = new Capacity(this.browserforce);

    const serviceChannelConfigurations: ServiceChannelConfiguration[] = [];

    for await (const serviceChannelConfiguration of definition.serviceChannelConfigurations) {
      serviceChannelConfigurations.push({
        serviceChannelDeveloperName: serviceChannelConfiguration.serviceChannelDeveloperName,
        capacity: await pluginCapacity.retrieve(serviceChannelConfiguration)
      });
    }

    return { serviceChannelConfigurations };
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const pluginCapacity = new Capacity(this.browserforce);

    const serviceChannelConfigurations: ServiceChannelConfiguration[] = [];

    for (const serviceChannelDefinition of definition.serviceChannelConfigurations) {
      const serviceChannelState = state.serviceChannelConfigurations.find(
        (serviceChannelConfiguration) => serviceChannelConfiguration.serviceChannelDeveloperName === serviceChannelDefinition.serviceChannelDeveloperName
      );
      
      const capacity = pluginCapacity.diff(serviceChannelState.capacity, serviceChannelDefinition.capacity);

      if (capacity !== undefined) {
        serviceChannelConfigurations.push({
          serviceChannelDeveloperName: serviceChannelDefinition.serviceChannelDeveloperName, 
          capacity
        });
      }
    }

    return { serviceChannelConfigurations };
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.serviceChannelConfigurations) {
      const pluginCapacity = new Capacity(this.browserforce);

      for await (const serviceChannelConfiguration of plan.serviceChannelConfigurations) {
        await pluginCapacity.apply(serviceChannelConfiguration);
      }
    }
  }
}
