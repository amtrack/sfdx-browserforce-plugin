import { z } from 'zod';

export const schema = z
  .object({
    activeThemeName: z
      .string()
      .meta({
        title: 'The active Lightning Experience Theme',
        description: 'The API Name of the Lightning Experience Theme to be activated',
      })
      .optional(),
  })
  .meta({
    id: 'lightningExperienceSettings',
    title: 'LightningExperienceSettings',
    description:
      "Although the Metadata API has a field activeThemeName in LightningExperienceSettings it's not possible to activate any of the standard themes like Lightning and LightningLite or SalesforceCosmos.",
  });
