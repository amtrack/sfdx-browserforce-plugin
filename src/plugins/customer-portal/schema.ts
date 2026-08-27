import { z } from 'zod';

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

export const schema = z
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
