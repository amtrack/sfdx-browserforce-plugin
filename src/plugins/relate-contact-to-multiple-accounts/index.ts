import type { Page } from 'playwright';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/accounts/accountSetup.apexp';

type Config = {
  enabled: boolean;
};

export class RelateContactToMultipleAccounts extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: await page.locator('input[id$=":sharedContactsCheckBox"]').isChecked(),
    };
    return response;
  }

  public async apply(config: Config): Promise<void> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    await this.waitForProcessFinished(page);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await Promise.all([page.waitForEvent('load'), page.locator('input[id$=":edit"]').first().click()]);
    // Change the value of the checkbox
    await page.locator('input[id$=":sharedContactsCheckBox"]').setChecked(config.enabled);

    const saveButton = page.locator('input[id$=":save"]').first();
    if (config.enabled) {
      await Promise.all([page.waitForEvent('load'), saveButton.click()]);
    } else {
      await saveButton.click();
      await page.locator('input#disable_confirm').click();
      await Promise.all([page.waitForEvent('load'), page.locator('input#sharedContactsDisableConfirmButton').click()]);
    }
  }

  async waitForProcessFinished(page: Page): Promise<void> {
    await this.browserforce.retry(async () => {
      const enabling = page.locator('#enablingInProgress');
      if ((await enabling.count()) > 0) {
        // Error: In progress: We're enabling Contacts to Multiple Accounts for your organization. This process can take several hours. We'll send you an email when it's done.
        const message = await enabling.innerText();
        throw new Error(message);
      }
      const disabling = page.locator('#disablingInProgress');
      if ((await disabling.count()) > 0) {
        const message = await disabling.innerText();
        throw new Error(message);
      }
    });
  }
}
