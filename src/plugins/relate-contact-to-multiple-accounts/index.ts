import { Page } from 'playwright';
import { retry, throwPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = 'accounts/accountSetup.apexp';

type Config = {
  enabled: boolean;
};

export class RelateContactToMultipleAccounts extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      enabled: await page.getByRole('checkbox', { name: 'Allow users to relate a' }).isChecked(),
    };
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await this.waitForProcessFinished(page);
    // First we have to click the 'Edit' button, to make the checkbox editable
    await page.getByRole('button', {name: 'edit'}).first().click();
    // Change the value of the checkbox
    await page.getByRole('checkbox', { name: 'Allow users to relate a' }).click();
    await page.getByRole('button', {name: 'save'}).first().click();

    if (await page.getByRole('heading', { name: 'Disable Contacts to Multiple' }).isVisible()) {
      await page.getByRole('checkbox', { name: 'Yes, I understand that this' }).click();
      await page.getByRole('button', { name: 'Disable' }).click();
    }

    await throwPageErrors(page);
    await page.close();
  }

  async waitForProcessFinished(page: Page): Promise<void> {
    await retry(async () => {
      const enablingCount = await page.getByText('In progress: We\'re enabling').count();
      if (enablingCount > 0) {
        const message = await page.getByText('In progress: We\'re enabling').innerText();
        throw new Error(message);
      }
      const disablingCount = await page.getByText('In progress: We\'re disabling').count();
      if (disablingCount > 0) {
        const message = await page.getByText('In progress: We\'re disabling').innerText();
        throw new Error(message);
      }
    });
  }
}
