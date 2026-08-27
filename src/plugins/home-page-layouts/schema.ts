import { z } from 'zod';

export const homePageLayoutAssignmentSchema = z
  .object({
    profile: z.string().meta({ description: 'Developer Name of Profile' }),
    layout: z.string().meta({ description: 'Developer Name of the HomePageLayout or empty string for default layout' }),
  })
  .meta({ id: 'homePageLayoutAssignment' });

export const schema = z
  .object({
    homePageLayoutAssignments: z.array(homePageLayoutAssignmentSchema).default([]).meta({
      title: 'Home Page Layout Assignment',
    }),
  })
  .meta({
    id: 'homePageLayouts',
    title: 'Home Page Layouts',
    description: 'Assign Home Page Layouts for Profiles. Only available in Salesforce Classic UI',
  });
