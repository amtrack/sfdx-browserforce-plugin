import { z } from 'zod';

export const schema = z
  .object({
    defaultCurrencyIsoCode: z.string().meta({ title: 'Default Currency' }).optional(),
  })
  .meta({ id: 'companyInformation', title: 'Company Information', description: '' });
