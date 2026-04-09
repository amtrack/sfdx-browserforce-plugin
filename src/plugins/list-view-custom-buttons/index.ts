import type { Record } from '@jsforce/jsforce-node';
import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const AVAILABLE_LISTBOX_NAME = 'Available Buttons';
const SELECTED_LISTBOX_NAME = 'Selected Buttons';
const SAVE_BUTTON_SELECTOR = 'input[name="save"]';
const NONE_PLACEHOLDER = '--None--';

interface WebLinkRecord extends Record {
  Id: string;
  Name: string;
  MasterLabel: string;
  NamespacePrefix: string | null;
}

type WebLinkMappings = {
  apiNameToLabel: Map<string, string>;
  labelToApiName: Map<string, string>;
};

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

      const labels = (
        await Promise.all((await selectedListbox.locator('option').all()).map((opt) => opt.textContent()))
      )
        .map((b) => b?.trim() ?? '')
        .filter((b) => Boolean(b) && b !== NONE_PLACEHOLDER);

      const { labelToApiName } = await this.queryWebLinks({ labels });
      const apiNames = labels.map((label) => labelToApiName.get(label) ?? label);

      results.push({ objectApiName: entry.objectApiName, buttons: apiNames });
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
      const { apiNameToLabel } = await this.queryWebLinks({ apiNames: entry.buttons });

      const missingButtons = entry.buttons.filter((b) => !apiNameToLabel.has(b));
      if (missingButtons.length > 0) {
        this.browserforce.logger?.warn(
          `[${entry.objectApiName}] WebLink(s) not found for button API name(s): ${missingButtons.map((b) => `"${b}"`).join(', ')}. Skipping missing buttons.`,
        );
      }

      const targetLabels = entry.buttons.filter((b) => apiNameToLabel.has(b)).map((b) => apiNameToLabel.get(b)!);

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

      const addButton = page.locator('img.rightArrowIcon');
      const removeButton = page.locator('img.leftArrowIcon');

      for (const label of targetLabels) {
        if (availableLabels.includes(label) && !selectedLabels.includes(label)) {
          await availableListbox.selectOption({ label });
          await addButton.click();
          await selectedListbox.locator('option', { hasText: new RegExp(`^${label}$`) }).waitFor();
        }
      }

      for (const label of selectedLabels) {
        if (!targetLabels.includes(label)) {
          await selectedListbox.selectOption({ label });
          await removeButton.click();
          await availableListbox.locator('option', { hasText: new RegExp(`^${label}$`) }).waitFor();
        }
      }

      await page.locator(SAVE_BUTTON_SELECTOR).click();
      await Promise.race([
        page.waitForURL((url) => !url.pathname.includes('ListButtonsEdit')),
        waitForPageErrors(page),
      ]);
    }
  }

  private async queryWebLinks(params: { apiNames?: string[]; labels?: string[] }): Promise<WebLinkMappings> {
    const apiNameToLabel = new Map<string, string>();
    const labelToApiName = new Map<string, string>();

    const conditions: string[] = [];

    if (params.apiNames?.length) {
      for (const name of params.apiNames) {
        const parts = name.split('__');
        if (parts.length > 1) {
          const namespace = parts[0];
          const devName = parts.slice(1).join('__');
          conditions.push(`(Name = '${devName}' AND NamespacePrefix = '${namespace}')`);
        } else {
          conditions.push(`(Name = '${name}' AND NamespacePrefix = '')`);
        }
      }
    }

    if (params.labels?.length) {
      const labelsList = params.labels.map((l) => `'${l}'`).join(',');
      conditions.push(`MasterLabel IN (${labelsList})`);
    }

    if (conditions.length === 0) return { apiNameToLabel, labelToApiName };

    const result = await this.browserforce.connection.tooling.query<WebLinkRecord>(
      `SELECT Id, Name, MasterLabel, NamespacePrefix FROM WebLink WHERE ${conditions.join(' OR ')}`,
    );

    for (const record of result.records) {
      const fullApiName = record.NamespacePrefix ? `${record.NamespacePrefix}__${record.Name}` : record.Name;
      apiNameToLabel.set(fullApiName, record.MasterLabel);
      labelToApiName.set(record.MasterLabel, fullApiName);
    }

    return { apiNameToLabel, labelToApiName };
  }
}
