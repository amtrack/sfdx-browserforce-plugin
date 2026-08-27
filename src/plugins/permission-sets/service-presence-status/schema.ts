import { z } from 'zod';

export const schema = z
  .array(z.string())
  .default([])
  .meta({ id: 'servicePresenceStatuses', title: 'Service Presence Statuses' });
