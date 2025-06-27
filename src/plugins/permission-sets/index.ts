import { BrowserforcePlugin } from '../../plugin.js';
import { ServicePresenceStatus } from './service-presence-status/index.js';

type PermissionSet = {
  permissionSetName: string;
  servicePresenceStatuses: string[];
};

export class PermissionSets extends BrowserforcePlugin {
  public async retrieve(
    definition?: PermissionSet[]
  ): Promise<PermissionSet[]> {
    const pluginServicePresenceStatus = new ServicePresenceStatus(
      this.browserforce
    );

    const permissionSets: PermissionSet[] = [];

    for await (const permissionSet of definition) {
      permissionSets.push({
        permissionSetName: permissionSet.permissionSetName,
        servicePresenceStatuses: await pluginServicePresenceStatus.retrieve(
          permissionSet
        ),
      });
    }

    return permissionSets;
  }

  public async apply(plan: PermissionSet[]): Promise<void> {
    const pluginServicePresenceStatus = new ServicePresenceStatus(
      this.browserforce
    );

    for await (const permissionSet of plan) {
      await pluginServicePresenceStatus.apply(permissionSet);
    }
  }
}
