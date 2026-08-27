import { z } from 'zod';

export const schema = z
  .object({
    setUpAndEnable: z.boolean().meta({ title: 'Set Up and Enable High Velocity Sales' }).optional(),
  })
  .meta({
    id: 'highVelocitySalesSettings',
    title: 'HighVelocitySalesSettings',
    description:
      'Due to a bug, High Velocity Sales needs to be set up and enabled initially using the UI.\nOnce set up, it can be configured using HighVelocitySalesSettings Metadata https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_highvelocitysalessettings.htm',
  });
