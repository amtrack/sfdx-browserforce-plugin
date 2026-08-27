---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.ts
sh: "npx prettier --write 'src/plugins/<%= h.changeCase.paramCase(name) %>/*' 'src/plugins/index.ts' && npm run generate:schema"
---
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { schema } from './schema.js';

const BASE_PATH = '/partnerbt/loginAccessPolicies.apexp';

const ENABLED_SELECTOR = 'input[id$="adminsCanLogInAsAny"]';

export type Config = z.infer<typeof schema>;

export class <%= h.changeCase.pascalCase(name) %> extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: await page.locator(ENABLED_SELECTOR).isChecked()
    };
    return response;
  }

  public async apply(config: Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ENABLED_SELECTOR).setChecked(config.enabled ?? false);
    await Promise.all([
      page.locator('.message.confirmM3').waitFor(),
      page.locator('input[type="button"][id$=":bottom:save"]').click()
    ]);
  }
}
