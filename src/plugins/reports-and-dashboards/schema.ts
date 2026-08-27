import { z } from 'zod';
import { schema as folderSharingSchema } from './folder-sharing/schema.js';

export const schema = z
  .object({
    folderSharing: folderSharingSchema.optional(),
  })
  .meta({ id: 'reportsAndDashboards', title: 'Reports & Dashboards' });
