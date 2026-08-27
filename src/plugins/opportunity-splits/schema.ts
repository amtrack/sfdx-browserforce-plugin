import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable Opportunity Splits',
        description:
          "Prerequisite: Opportunity Teams must be enabled e.g. by deploying 'Settings:Opportunity' containing `<enableOpportunityTeam>true</enableOpportunityTeam>`.",
      })
      .optional(),
  })
  .meta({ id: 'opportunitySplits', title: 'OpportunitySplits Settings' });
