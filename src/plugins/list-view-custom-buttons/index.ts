import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const AVAILABLE_LISTBOX_NAME = 'Available Buttons';
const SELECTED_LISTBOX_NAME = 'Selected Buttons';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';
const NONE_PLACEHOLDER = '--None--';

type ListViewCustomButtonsConfig = {
  objectApiName: string;
  buttons: string[];
};

function buildPagePath(objectApiName: string): SalesforceUrlPath {
  const retURL = encodeURIComponent(`/setup/ObjectManager/${objectApiName}/AlohaSearchLayouts/view`);
  return `/p/setup/layout/ListButtonsEdit?LayoutEntity=${objectApiName}&retURL=${retURL}`;
}

export class ListViewCustomButtons extends BrowserforcePlugin {
  public async retrieve(definition?: ListViewCustomButtonsConfig[]): Promise<ListViewCustomButtonsConfig[]> {
    const results: ListViewCustomButtonsConfig[] = [];

    for (const entry of definition) {
      const page = await this.browserforce.openPage(buildPagePath(entry.objectApiName));
      const selectedListbox = page.getByRole('listbox', { name: SELECTED_LISTBOX_NAME });
      await selectedListbox.waitFor();

      const buttons = (
        await Promise.all((await selectedListbox.locator('option').all()).map((opt) => opt.textContent()))
      )
        .map((b) => b?.trim() ?? '')
        .filter((b) => Boolean(b) && b !== NONE_PLACEHOLDER);

      results.push({ objectApiName: entry.objectApiName, buttons });
    }

    return results;
  }

  public diff(
    source: ListViewCustomButtonsConfig[],
    target: ListViewCustomButtonsConfig[],
  ): ListViewCustomButtonsConfig[] | undefined {
    const changes: ListViewCustomButtonsConfig[] = [];

    for (const targetEntry of target) {
      const sourceEntry = source.find((s) => s.objectApiName === targetEntry.objectApiName);
      const sourceSet = new Set(sourceEntry?.buttons ?? []);
      const targetSet = new Set(targetEntry.buttons);
      const hasDiff =
        targetEntry.buttons.some((b) => !sourceSet.has(b)) ||
        (sourceEntry?.buttons ?? []).some((b) => !targetSet.has(b));
      if (hasDiff) {
        changes.push(targetEntry);
      }
    }

    return changes.length > 0 ? changes : undefined;
  }

  public async apply(plan: ListViewCustomButtonsConfig[]): Promise<void> {
    for (const entry of plan) {
      const page = await this.browserforce.openPage(buildPagePath(entry.objectApiName));
      const availableListbox = page.getByRole('listbox', { name: AVAILABLE_LISTBOX_NAME });
      const selectedListbox = page.getByRole('listbox', { name: SELECTED_LISTBOX_NAME });
      await availableListbox.waitFor();

      const availableLabels = (
        await Promise.all((await availableListbox.locator('option').all()).map((opt) => opt.textContent()))
      ).map((l) => l?.trim() ?? '');

      const selectedLabels = (
        await Promise.all((await selectedListbox.locator('option').all()).map((opt) => opt.textContent()))
      )
        .map((l) => l?.trim() ?? '')
        .filter((l) => l !== NONE_PLACEHOLDER);

      const allKnownButtons = new Set([...availableLabels, ...selectedLabels]);
      const missingButtons = entry.buttons.filter((b) => !allKnownButtons.has(b));
      if (missingButtons.length > 0) {
        this.browserforce.logger?.warn(
          `[${entry.objectApiName}] Button(s) with provided label not found: ${missingButtons.map((b) => `"${b}"`).join(', ')}. ` +
            `Available: [${availableLabels.filter(Boolean).join(', ')}]. ` +
            `Selected: [${selectedLabels.join(', ')}]. Skipping missing buttons.`,
        );
      }

      // <a href="javascript:..."><img class="rightArrowIcon" alt="Add" title="Add"></a>
      const addButton = page.locator('img.rightArrowIcon');
      const removeButton = page.locator('img.leftArrowIcon');

      for (const button of entry.buttons) {
        if (availableLabels.includes(button) && !selectedLabels.includes(button)) {
          await availableListbox.selectOption({ label: button });
          await addButton.click();
          await selectedListbox.locator('option', { hasText: button }).waitFor();
        }
      }

      for (const button of selectedLabels) {
        if (!entry.buttons.includes(button)) {
          await selectedListbox.selectOption({ label: button });
          await removeButton.click();
          await availableListbox.locator('option', { hasText: button }).waitFor();
        }
      }

      await page.locator(SAVE_BUTTON_SELECTOR).click();
      await Promise.race([
        page.waitForURL((url) => !url.pathname.includes('ListButtonsEdit')),
        waitForPageErrors(page),
      ]);
    }
  }
}
