---
to: src/plugins/<%= h.changeCase.paramCase(name) %>/index.ts
sh: "npx prettier --write 'src/plugins/<%= h.changeCase.paramCase(name) %>/*' 'src/plugins/index.ts'"
---
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/partnerbt/loginAccessPolicies.apexp';

const ENABLED_SELECTOR = 'input[id$="adminsCanLogInAsAny"]';
const CONFIRM_MESSAGE_SELECTOR = '.message.confirmM3';
const SAVE_BUTTON_SELECTOR = 'input[id$=":save"]';

export type Config = {
  enabled: boolean;
};

export class <%= h.changeCase.pascalCase(name) %> extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLED_SELECTOR);
    const response = {
      enabled: await page.$eval(
        ENABLED_SELECTOR,
        (el: HTMLInputElement) => el.checked
      )
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.waitForSelector(ENABLED_SELECTOR);
    await page.$eval(
      ENABLED_SELECTOR,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enabled
    );
    await Promise.all([
      page.waitForSelector(CONFIRM_MESSAGE_SELECTOR),
      page.click(SAVE_BUTTON_SELECTOR)
    ]);
    await page.close();
  }
}
