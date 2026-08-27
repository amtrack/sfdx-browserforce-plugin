import { z } from 'zod';

export const schema = z
  .object({
    capacityModel: z
      .enum(['TabBased', 'StatusBased'])
      .meta({
        title: 'Capacity Model',
        description: 'Choose the service channel Capacity Model',
      })
      .optional(),
    statusField: z
      .string()
      .meta({ title: 'Status Field', description: 'API Name of the field used to track status' })
      .optional(),
    valuesForInProgress: z
      .array(z.string())
      .meta({ title: 'Values for In-Progress', description: 'Choose the field values for In-Progress work' })
      .optional(),
    checkAgentCapacityOnReopenedWorkItems: z
      .boolean()
      .meta({
        title: 'Check agent capacity on reopened work items',
        description: 'Check agent capacity on reopened work items',
      })
      .optional(),
    checkAgentCapacityOnReassignedWorkItems: z
      .boolean()
      .meta({
        title: 'Check agent capacity on reassigned work items',
        description: 'Check agent capacity on reassigned work items',
      })
      .optional(),
  })
  .meta({
    id: 'capacity',
    title: 'Capacity Settings',
    if: { properties: { capacityModel: { const: 'Status-based' } } },
    then: { required: ['statusField', 'valuesForInProgress'] },
    else: { not: { required: ['statusField', 'valuesForInProgress'] } },
  });
