---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.ts
sh: "npx prettier --write 'src/plugins/<%= h.changeCase.paramCase(name) %>/*' 'src/plugins/index.ts' && npm run generate:schema"
---
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const <%= h.changeCase.camelCase(name) %>Schema = z
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

const BASE_PATH = '/partnerbt/loginAccessPolicies.apexp';

const ENABLED_SELECTOR = 'input[id$="adminsCanLogInAsAny"]';

export type <%= h.changeCase.pascalCase(name) %>Config = z.infer<typeof <%= h.changeCase.camelCase(name) %>Schema>;

export class <%= h.changeCase.pascalCase(name) %> extends BrowserforcePlugin {
  public async retrieve(definition?: <%= h.changeCase.pascalCase(name) %>Config): Promise<<%= h.changeCase.pascalCase(name) %>Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: await page.locator(ENABLED_SELECTOR).isChecked()
    };
    return response;
  }

  public async apply(config: <%= h.changeCase.pascalCase(name) %>Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ENABLED_SELECTOR).setChecked(config.enabled ?? false);
    await Promise.all([
      page.locator('.message.confirmM3').waitFor(),
      page.locator('input[type="button"][id$=":bottom:save"]').click()
    ]);
  }
}
