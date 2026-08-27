import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { ServicePresenceStatus, servicePresenceStatusesSchema } from './service-presence-status/index.js';

const permissionSetSchema = z
  .object({
    permissionSetName: z
      .string()
      .meta({
        title: 'Permission Set',
      })
      .describe('The name of the Permission Set to modify'),
    servicePresenceStatuses: servicePresenceStatusesSchema.optional(),
  })
  .meta({ id: 'permissionSet' });

export const permissionSetsSchema = z.array(permissionSetSchema).default([]).meta({ title: 'Permission Sets' });

type PermissionSet = {
  permissionSetName: string;
  servicePresenceStatuses: string[];
};

export class PermissionSets extends BrowserforcePlugin {
  public async retrieve(definition?: PermissionSet[]): Promise<PermissionSet[]> {
    const pluginServicePresenceStatus = new ServicePresenceStatus(this.browserforce);

    const permissionSets: PermissionSet[] = [];

    for (const permissionSet of definition) {
      permissionSets.push({
        permissionSetName: permissionSet.permissionSetName,
        servicePresenceStatuses: await pluginServicePresenceStatus.retrieve(permissionSet),
      });
    }

    return permissionSets;
  }

  public async apply(plan: PermissionSet[]): Promise<void> {
    const pluginServicePresenceStatus = new ServicePresenceStatus(this.browserforce);

    for (const permissionSet of plan) {
      await pluginServicePresenceStatus.apply(permissionSet);
    }
  }
}
