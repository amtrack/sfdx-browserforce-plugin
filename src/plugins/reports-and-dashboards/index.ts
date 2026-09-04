import { z } from 'zod';
import { composePlugin } from '../../plugin.js';
import { FolderSharing, FolderSharingConfig, folderSharingSchema } from './folder-sharing/index.js';

export const reportsAndDashboardsSchema = z
  .object({
    folderSharing: folderSharingSchema.optional(),
  })
  .meta({ id: 'reportsAndDashboards', title: 'Reports & Dashboards' });

type ReportsAndDashboardsConfig = {
  folderSharing?: FolderSharingConfig;
};

export const ReportsAndDashboards = composePlugin<ReportsAndDashboardsConfig>('ReportsAndDashboards', {
  folderSharing: FolderSharing,
});
