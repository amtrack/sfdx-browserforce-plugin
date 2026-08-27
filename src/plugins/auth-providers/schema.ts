import { z } from 'zod';
import { password } from '../utils.js';

const authProviderSchema = z.object({
  consumerSecret: password(
    z.string().meta({ title: 'Consumer Secret', description: 'The Consumer Secret value for the Auth Provider' }),
  ).optional(),
  consumerKey: z
    .string()
    .meta({ title: 'Consumer Key', description: 'The Consumer Key value for the Auth Provider' })
    .optional(),
});

export const schema = z.record(z.string().regex(/^[a-zA-Z0-9_]+$/), authProviderSchema).meta({
  id: 'authProviders',
  title: 'Auth Providers',
  description: 'Configuration for updating Auth Provider Consumer Key and Consumer Secret',
});
