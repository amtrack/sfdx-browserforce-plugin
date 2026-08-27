import { z } from 'zod';

export const schema = z
  .object({
    enableEnhancedFolderSharing: z
      .boolean()
      .meta({
        title: 'Enable access levels for sharing report and dashboard folders',
        $comment:
          'If your organization was created after the Summer ’13 Salesforce release, you already have enhanced folder sharing',
      })
      .optional(),
  })
  .meta({ id: 'folderSharing', title: 'Folder Sharing' });
