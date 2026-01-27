import { BrowserforcePlugin } from '../../plugin.js';
import { Capacity, CapacityConfig } from './capacity/index.js';

type ServiceChannel = {
  serviceChannelDeveloperName: string;
  capacity: CapacityConfig;
};

export class ServiceChannels extends BrowserforcePlugin {
  public async retrieve(definition?: ServiceChannel[]): Promise<ServiceChannel[]> {
    const pluginCapacity = new Capacity(this.browserforce);

    const serviceChannels: ServiceChannel[] = [];

    for (const serviceChannel of definition) {
      serviceChannels.push({
        serviceChannelDeveloperName: serviceChannel.serviceChannelDeveloperName,
        capacity: await pluginCapacity.retrieve(serviceChannel),
      });
    }

    return serviceChannels;
  }

  public diff(state: ServiceChannel[], definition: ServiceChannel[]): ServiceChannel[] | undefined {
    const pluginCapacity = new Capacity(this.browserforce);

    const serviceChannels: ServiceChannel[] = [];

    for (const serviceChannelDefinition of definition) {
      const serviceChannelState = state.find(
        (serviceChannelState) =>
          serviceChannelState.serviceChannelDeveloperName === serviceChannelDefinition.serviceChannelDeveloperName,
      );

      const capacity = pluginCapacity.diff(serviceChannelState.capacity, serviceChannelDefinition.capacity);

      if (capacity !== undefined) {
        serviceChannels.push({
          serviceChannelDeveloperName: serviceChannelDefinition.serviceChannelDeveloperName,
          capacity,
        });
      }
    }

    return serviceChannels.length ? serviceChannels : undefined;
  }

  public async apply(plan: ServiceChannel[]): Promise<void> {
    const pluginCapacity = new Capacity(this.browserforce);

    for (const serviceChannel of plan) {
      await pluginCapacity.apply(serviceChannel);
    }
  }
}
