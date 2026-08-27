import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import {
  CustomerPortalAvailableCustomObjects,
  CustomerPortalAvailableCustomObjectsConfig,
} from './available-custom-objects/index.js';
import { CustomerPortalEnable, CustomerPortalEnableConfig } from './enabled/index.js';
import { CustomerPortalSetup, CustomerPortalSetupConfig } from './portals/index.js';

export const portalProfileMembershipSchema = z
  .object({
    name: z.string().optional(),
    active: z.boolean().optional(),
  })
  .meta({ id: 'portalProfileMembership' });

export const portalSchema = z
  .object({
    adminUser: z.string().optional(),
    description: z.string().optional(),
    isSelfRegistrationActivated: z.boolean().optional(),
    name: z.string(),
    oldName: z.string().optional(),
    selfRegUserDefaultLicense: z.string().optional(),
    selfRegUserDefaultProfile: z.string().optional(),
    selfRegUserDefaultRole: z.string().optional(),
    portalProfileMemberships: z.array(portalProfileMembershipSchema).default([]).meta({
      description: 'Profiles for which this portal should be activated or deactivated',
    }),
  })
  .meta({ id: 'portal' });

export const availableCustomObjectSchema = z
  .object({
    name: z.string(),
    namespacePrefix: z.string().optional(),
    available: z.boolean(),
  })
  .meta({ id: 'availableCustomObject' });

export const customerPortalSchema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable Customer Portal',
        description:
          "Although the Metadata API has a OrgSettings.enableCustomerSuccessPortal field, enabling this via the browser can be handy because it automatically creates a Portal named 'Customer Portal', where the admin and emailSenderAddress are set to the current user. Warning: cannot be disabled once enabled",
      })
      .optional(),
    portals: z.array(portalSchema).default([]).meta({ title: 'Portals' }),
    availableCustomObjects: z.array(availableCustomObjectSchema).default([]).meta({
      title: 'Custom Objects available for Customer Portal',
    }),
  })
  .meta({
    id: 'customerPortal',
    title: 'Customer Portal Settings',
    description: 'Only available in Salesforce Classic UI',
  });

// `portals`/`availableCustomObjects` use the sub-plugins' own `Config` types (decision C: they carry
// an internal `_id` that must not enter the schema), while `enabled` derives from the schema directly.
type CustomerPortalConfig = Omit<
  z.infer<typeof customerPortalSchema>,
  'portals' | 'availableCustomObjects' | 'enabled'
> & {
  enabled?: CustomerPortalEnableConfig;
  portals?: CustomerPortalSetupConfig;
  availableCustomObjects?: CustomerPortalAvailableCustomObjectsConfig;
};

export class CustomerPortal extends BrowserforcePlugin {
  public async retrieve(definition: CustomerPortalConfig): Promise<CustomerPortalConfig> {
    const pluginEnable = new CustomerPortalEnable(this.browserforce);
    const response: CustomerPortalConfig = {
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
        const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(this.browserforce);
        response.availableCustomObjects = await pluginAvailableCustomObjects.retrieve(
          definition.availableCustomObjects,
        );
      }
    }
    return response;
  }

  public diff(state: CustomerPortalConfig, definition: CustomerPortalConfig): CustomerPortalConfig | undefined {
    const enabled = new CustomerPortalEnable(this.browserforce).diff(state.enabled, definition.enabled) as
      boolean | undefined;
    const portals = new CustomerPortalSetup(this.browserforce).diff(state.portals, definition.portals);
    const availableCustomObjects = new CustomerPortalAvailableCustomObjects(this.browserforce).diff(
      state.availableCustomObjects,
      definition.availableCustomObjects,
    );
    const response: CustomerPortalConfig = {
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

  public async apply(config: CustomerPortalConfig): Promise<void> {
    if (config.enabled !== undefined) {
      const pluginEnable = new CustomerPortalEnable(this.browserforce);
      await pluginEnable.apply(config.enabled);
    }
    if (config.portals?.length) {
      const pluginSetup = new CustomerPortalSetup(this.browserforce);
      await pluginSetup.apply(config.portals);
    }
    if (config.availableCustomObjects) {
      const pluginAvailableCustomObjects = new CustomerPortalAvailableCustomObjects(this.browserforce);
      await pluginAvailableCustomObjects.apply(config.availableCustomObjects);
    }
  }
}
