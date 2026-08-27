---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/schema.ts
---
import { z } from 'zod';

export const schema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable <%= h.changeCase.pascalCase(name) %>',
        description: 'The description you want to be displayed as toolip when the user is editing the configuration',
      })
      .optional(),
  })
  .meta({ id: '<%= h.changeCase.camelCase(name) %>', title: '<%= h.changeCase.pascalCase(name) %> Settings' });
