import { z } from 'zod';

export const schema = z
  .object({
    density: z
      .enum(['Comfy', 'Compact'])
      .meta({ title: 'Density', description: 'Choose the default display setting for your org' })
      .optional(),
  })
  .meta({ id: 'densitySettings', title: 'Density Settings' });
