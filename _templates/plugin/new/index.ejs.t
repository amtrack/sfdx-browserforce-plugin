---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.ts
sh: "npx prettier --write 'src/plugins/<%= h.changeCase.paramCase(name) %>/*' 'src/plugins/index.ts' && npm run generate:schema"
---
<%
  const camelCase = h.changeCase.camelCase(name);
  const pascalCase = h.changeCase.pascalCase(name);
_%>
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const <%= camelCase %>Schema = z
  .object({
    enabled: z
      .boolean()
      .meta({
        title: 'Enable <%= pascalCase %>',
        description: 'The description you want to be displayed as toolip when the user is editing the configuration',
      })
      .optional(),
  })
  .meta({ id: '<%= camelCase %>', title: '<%= pascalCase %> Settings' });

const BASE_PATH = '/partnerbt/loginAccessPolicies.apexp';

const ENABLED_SELECTOR = 'input[id$="adminsCanLogInAsAny"]';

export type <%= pascalCase %>Config = z.infer<typeof <%= camelCase %>Schema>;

export class <%= pascalCase %> extends BrowserforcePlugin {
  public async retrieve(definition?: <%= pascalCase %>Config): Promise<<%= pascalCase %>Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: await page.locator(ENABLED_SELECTOR).isChecked()
    };
    return response;
  }

  public async apply(config: <%= pascalCase %>Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ENABLED_SELECTOR).setChecked(config.enabled ?? false);
    await Promise.all([
      page.locator('.message.confirmM3').waitFor(),
      page.locator('input[type="button"][id$=":bottom:save"]').click()
    ]);
  }
}
