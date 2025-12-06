import type { Record } from '@jsforce/jsforce-node';
import { BrowserforcePlugin } from '../../../plugin.js';
import { semanticallyCleanObject } from '../../utils.js';

const SAVE_BUTTON_SELECTOR = 'input[name="save"]';
const CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR = '#options_9';

interface CustomObjectRecord extends Record {
  DeveloperName: string;
  NamespacePrefix?: string;
}

export type Config = AvailableCustomObjectConfig[];

type AvailableCustomObjectConfig = {
  name: string;
  namespacePrefix?: string;
  available: boolean;
  _id?: string;
};

export class CustomerPortalAvailableCustomObjects extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const response: Config = [];
    if (definition) {
      const availableCustomObjectList = definition
        .map((customObject) => {
          return `'${customObject.name}'`;
        })
        .join(',');
      const customObjects = await this.org
        .getConnection()
        .tooling.query<CustomObjectRecord>(
          `SELECT Id, DeveloperName, NamespacePrefix FROM CustomObject WHERE DeveloperName IN (${availableCustomObjectList}) ORDER BY CreatedDate DESC`,
          { scanAll: false }
        );
      // Note: Unfortunately scanAll=false has no impact and returns deleted CustomObjects.
      // Workaround: Order by CreatedDate DESC to get the latest CustomObject first.
      for (const record of customObjects?.records) {
        if (record.NamespacePrefix === null) {
          record.NamespacePrefix = undefined;
        }
      }
      await using page = await this.browserforce.openPage('');
      // new URLs for LEX: https://help.salesforce.com/articleView?id=FAQ-for-the-New-URL-Format-for-Lightning-Experience-and-the-Salesforce-Mobile-App&type=1
      const isLEX =
        page.url().includes('/one/one.app') ||
        page.url().includes('/lightning/');
      const getObjectPageUrl = function (
        customObject: { _id: string },
        isLexUi = true
      ) {
        const classicUiPath = `${customObject._id}/e`;
        if (isLexUi) {
          return `lightning/setup/ObjectManager/${
            customObject._id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
        } else {
          return classicUiPath;
        }
      };

      for (const availableCustomObject of definition) {
        const customObject = customObjects.records.find((co) => {
          return (
            co.DeveloperName === availableCustomObject.name &&
            co.NamespacePrefix === availableCustomObject.namespacePrefix
          );
        });
        if (!customObject) {
          throw new Error(
            `Could not find CustomObject: {DeveloperName: ${availableCustomObject.name}, NamespacePrefix: ${availableCustomObject.namespacePrefix}`
          );
        }
        const result = {
          _id: customObject.Id!,
          name: customObject.DeveloperName,
          namespacePrefix: customObject.NamespacePrefix,
        };
        const pageUrl = getObjectPageUrl(result, isLEX);
        await using editPage = await this.browserforce.openPage(pageUrl);
        const frameOrPage =
          await this.browserforce.waitForSelectorInFrameOrPage(
            editPage,
            CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR
          );
        response.push({
          ...result,
          available: await frameOrPage
            .locator(CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL_SELECTOR)
            .isChecked(),
        });
      }
    }
    return response;
  }

  public diff(state?: Config, definition?: Config): Config | undefined {
    const response: Config = [];
    if (state && definition) {
      for (const availableCustomObject of definition) {
        const oldCustomObject = state.find((customObject) => {
          return (
            customObject.name === availableCustomObject.name &&
            customObject.namespacePrefix ===
              availableCustomObject.namespacePrefix
          );
        });
        if (!oldCustomObject) {
          throw new Error(
            `Could not find CustomObject "${availableCustomObject.name}"`
          );
        }
        // copy id of existing object to new object to be retained and used
        availableCustomObject._id = oldCustomObject._id;
        const diff = semanticallyCleanObject(
          super.diff(oldCustomObject, availableCustomObject),
          '_id'
        ) as AvailableCustomObjectConfig | undefined;
        if (diff?.available !== undefined) {
          response.push(diff);
        }
      }
    }
    return response.length ? response : undefined;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan && plan.length) {
      await using page = await this.browserforce.openPage('');
      // new URLs for LEX: https://help.salesforce.com/articleView?id=FAQ-for-the-New-URL-Format-for-Lightning-Experience-and-the-Salesforce-Mobile-App&type=1
      const isLEX =
        page.url().includes('/one/one.app') ||
        page.url().includes('/lightning/');
      const getObjectPageUrl = function (
        customObject: { _id?: string; available: boolean },
        isLexUi = true
      ) {
        const classicUiPath = `${customObject._id}/e?options_9=${
          customObject.available ? 1 : 0
        }&retURL=/${customObject._id}`;
        if (isLexUi) {
          return `lightning/setup/ObjectManager/${
            customObject._id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
        } else {
          return classicUiPath;
        }
      };

      for (const customObject of plan) {
        const pageUrl = getObjectPageUrl(customObject, isLEX);
        await using editPage = await this.browserforce.openPage(pageUrl);
        const frameOrPage =
          await this.browserforce.waitForSelectorInFrameOrPage(
            editPage,
            SAVE_BUTTON_SELECTOR
          );
        await frameOrPage.locator(SAVE_BUTTON_SELECTOR).first().click();
        await editPage.getByRole('heading', { name: 'Details' }).waitFor();
      }
    }
  }
}
