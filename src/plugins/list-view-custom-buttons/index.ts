import type { Record } from '@jsforce/jsforce-node';
import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const AVAILABLE_LISTBOX_NAME = 'Available Buttons';
const SELECTED_LISTBOX_NAME = 'Selected Buttons';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';

interface WebLinkRecord extends Record {
  Id: string;
  Name: string;
  NamespacePrefix: string | null;
}

type ListViewCustomButtonsConfig = {
  objectApiName: string;
  buttons: string[];
  removeOtherButtons?: boolean | false;
};

function buildPagePath(objectApiName: string): SalesforceUrlPath {
  let pageObjApiName = objectApiName;
  if (objectApiName === 'Task' || objectApiName === 'Event') {
    pageObjApiName = 'Activity';
  }

  return `/p/setup/layout/ListButtonsEdit?LayoutEntity=${pageObjApiName}&retURL=${encodeURIComponent('/setup/forcecomHomepage.apexp')}`;
}

export class ListViewCustomButtons extends BrowserforcePlugin {
  public async retrieve(definition?: ListViewCustomButtonsConfig[]): Promise<ListViewCustomButtonsConfig[]> {
    const results: ListViewCustomButtonsConfig[] = [];

    for (const entry of definition) {
      const page = await this.browserforce.openPage(buildPagePath(entry.objectApiName));
      const selectedListbox = page.getByRole('listbox', { name: SELECTED_LISTBOX_NAME });
      await selectedListbox.waitFor();

      const buttonIds = (
        await Promise.all((await selectedListbox.locator('option').all()).map((opt) => opt.getAttribute('value')))
      )
        .filter((b) => b?.trim() !== '')
        .map((b) => `'${b?.trim()}'`);

      const result =
        buttonIds.length > 0
          ? await this.browserforce.connection.query<WebLinkRecord>(
              `SELECT Id, Name, NamespacePrefix FROM WebLink WHERE Id IN (${buttonIds.join(',')}) AND PageOrSobjectType = '${entry.objectApiName}'`,
            )
          : { records: [] };

      const buttons = [];

      for (const record of result.records) {
        const fullApiName = record.NamespacePrefix ? `${record.NamespacePrefix}__${record.Name}` : record.Name;
        buttons.push(fullApiName);
      }

      results.push({
        objectApiName: entry.objectApiName,
        buttons: buttons.sort(),
        removeOtherButtons: entry.removeOtherButtons,
      });
    }

    return results;
  }

  public async apply(plan: ListViewCustomButtonsConfig[]): Promise<void> {
    for (const entry of plan) {
      const buttons = await this.queryWebLinks(entry.buttons, entry.objectApiName);

      const buttonApiNames = new Set(
        buttons.map((b) => (b.NamespacePrefix ? `${b.NamespacePrefix}__${b.Name}` : b.Name)),
      );
      const missingButtons = entry.buttons.filter((b) => !buttonApiNames.has(b));

      if (missingButtons.length > 0) {
        this.browserforce.logger?.warn(
          `[${entry.objectApiName}] WebLink(s) not found for button API name(s): ${missingButtons.map((b) => `"${b}"`).join(', ')}. Skipping missing buttons.`,
        );
      }

      const targetButtonIds = buttons.map((b) => b.Id.slice(0, 15)!);

      const page = await this.browserforce.openPage(buildPagePath(entry.objectApiName));
      const availableListbox = page.getByRole('listbox', { name: AVAILABLE_LISTBOX_NAME });
      const selectedListbox = page.getByRole('listbox', { name: SELECTED_LISTBOX_NAME });
      await availableListbox.waitFor();

      const availableButtonIds = (
        await Promise.all((await availableListbox.locator('option').all()).map((opt) => opt.getAttribute('value')))
      ).map((b) => b?.trim() ?? '');

      const selectedButtonIds = (
        await Promise.all((await selectedListbox.locator('option').all()).map((opt) => opt.getAttribute('value')))
      )
        .map((b) => b?.trim() ?? '')
        .filter((b) => b !== '');

      const addButton = page.locator('img.rightArrowIcon');
      const removeButton = page.locator('img.leftArrowIcon');

      for (const buttonId of targetButtonIds) {
        if (availableButtonIds.includes(buttonId) && !selectedButtonIds.includes(buttonId)) {
          await availableListbox.selectOption({ value: buttonId });
          await addButton.click();
          await selectedListbox.locator(`option[value="${buttonId}"]`).waitFor();
        }
      }

      if (entry.removeOtherButtons) {
        for (const buttonId of selectedButtonIds) {
          if (!targetButtonIds.includes(buttonId)) {
            await selectedListbox.selectOption({ value: buttonId });
            await removeButton.click();
            await availableListbox.locator(`option[value="${buttonId}"]`).waitFor();
          }
        }
      }

      await page.locator(SAVE_BUTTON_SELECTOR).click();
      await Promise.race([
        page.waitForURL((url) => url.pathname === '/setup/forcecomHomepage.apexp'),
        waitForPageErrors(page),
      ]);
    }
  }

  private async queryWebLinks(apiNames: string[], objectApiName: string): Promise<WebLinkRecord[]> {
    if (!apiNames?.length) {
      return [];
    }

    const conditions: string[] = [];

    for (const name of apiNames) {
      const parts = name.split('__');
      if (parts.length > 1) {
        const namespace = parts[0];
        const devName = parts.slice(1).join('__');
        conditions.push(`(Name = '${devName}' AND NamespacePrefix = '${namespace}')`);
      } else {
        conditions.push(`(Name = '${name}' AND NamespacePrefix = NULL)`);
      }
    }

    const result = await this.browserforce.connection.query<WebLinkRecord>(
      `SELECT Id, Name, NamespacePrefix FROM WebLink WHERE (${conditions.join(' OR ')}) AND PageOrSobjectType = '${objectApiName}'`,
    );

    return result.records;
  }
}
