import { z } from 'zod';
import { password } from '../../utils.js';

const certificateSchema = z
  .object({
    name: z.string(),
    label: z.string(),
    exportable: z.boolean().optional(),
    keysize: z.number().int().optional(),
  })
  .meta({ id: 'certificate' });

const keystoreSchema = z
  .object({
    name: z.string().meta({
      description:
        'Optional new name of the certificate. WARNING: Only use this to change the case of the certificate name as the imported name is lowercase by default.',
    }),
    filePath: z.string().meta({ description: 'Relative path from current working directory' }),
    password: password(z.string()).optional(),
  })
  .meta({ id: 'keystore' });

export const schema = z
  .object({
    certificates: z.array(certificateSchema).default([]).meta({ title: 'Self-Signed Certificates' }),
    importFromKeystore: z.array(keystoreSchema).default([]).meta({ title: 'Import Certificate from Keystore' }),
  })
  .meta({ id: 'certificateAndKeyManagement', title: 'Certificate and Key Management' });
