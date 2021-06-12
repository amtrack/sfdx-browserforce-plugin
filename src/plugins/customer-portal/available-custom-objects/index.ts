import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import { BrowserforcePlugin } from '../../../plugin';

const SELECTORS = {
  SAVE_BUTTON: 'input[name="save"]',
  CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL: '#options_9'
};

interface CustomObjectRecord {
  Id: SalesforceId;
  DeveloperName: string;
  NamespacePrefix: string;
}

export class CustomerPortalAvailableCustomObjects extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const response = [];
    if (definition) {
      const availableCustomObjectList = definition
        .map(customObject => {
          return `'${customObject.name}'`;
        })
        .join(',');
      const customObjects = await this.org
        .getConnection()
        .tooling.query<CustomObjectRecord>(
          `SELECT Id, DeveloperName, NamespacePrefix FROM CustomObject WHERE DeveloperName IN (${availableCustomObjectList})`,
          { scanAll: false }
        );
      // BUG in jsforce: query acts with scanAll:true and returns deleted CustomObjects.
      // It cannot be disabled.
      // This will throw a timeout error waitingFor('#options_9')
      const page = await this.browserforce.openPage('', {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      // new URLs for LEX: https://help.salesforce.com/articleView?id=FAQ-for-the-New-URL-Format-for-Lightning-Experience-and-the-Salesforce-Mobile-App&type=1
      const isLEX =
        page.url().indexOf('/one/one.app') >= 0 ||
        page.url().indexOf('/lightning/') >= 0;
      const getObjectPageUrl = function(customObject, isLexUi = true) {
        const classicUiPath = `${customObject.id}/e`;
        if (isLexUi) {
          return `lightning/setup/ObjectManager/${
            customObject.id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
        } else {
          return classicUiPath;
        }
      };

      for (const availableCustomObject of definition) {
        const customObject = customObjects.records.find(co => {
          if (availableCustomObject.namespacePrefix === undefined) {
            availableCustomObject.namespacePrefix = null;
          }
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
          id: customObject.Id,
          name: customObject.DeveloperName,
          namespacePrefix: customObject.NamespacePrefix
        };
        const pageUrl = getObjectPageUrl(result, isLEX);
        const editPage = await this.browserforce.openPage(pageUrl, {
          waitUntil: ['load', 'domcontentloaded', 'networkidle0']
        });
        const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
          editPage,
          SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL
        );
        response.push({
          ...result,
          available: await frameOrPage.$eval(
            SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL,
            (el: HTMLInputElement) => el.checked
          )
        });
      }
    }
    return response;
  }

  public diff(state, definition) {
    const response = [];
    if (state && definition) {
      for (const availableCustomObject of definition) {
        const oldCustomObject = state.find(customObject => {
          if (availableCustomObject.namespacePrefix === undefined) {
            availableCustomObject.namespacePrefix = null;
          }
          return (
            customObject.name === availableCustomObject.name &&
            customObject.namespacePrefix ===
              availableCustomObject.namespacePrefix
          );
        });
        // move id of existing object to new object to be retained and used
        availableCustomObject.id = oldCustomObject.id;
        delete oldCustomObject.id;
        const diff = jsonMergePatch.generate(
          oldCustomObject,
          availableCustomObject
        );
        if (diff.available !== undefined) {
          response.push(diff);
        }
      }
    }
    return response;
  }

  public async apply(plan) {
    if (plan && plan.length) {
      const page = await this.browserforce.openPage('', {
        waitUntil: ['load', 'domcontentloaded', 'networkidle0']
      });
      // new URLs for LEX: https://help.salesforce.com/articleView?id=FAQ-for-the-New-URL-Format-for-Lightning-Experience-and-the-Salesforce-Mobile-App&type=1
      const isLEX =
        page.url().indexOf('/one/one.app') >= 0 ||
        page.url().indexOf('/lightning/') >= 0;
      const getObjectPageUrl = function(customObject, isLexUi = true) {
        const classicUiPath = `${customObject.id}/e?options_9=${
          customObject.available ? 1 : 0
        }&retURL=/${customObject.id}`;
        if (isLexUi) {
          return `lightning/setup/ObjectManager/${
            customObject.id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
        } else {
          return classicUiPath;
        }
      };

      for (const customObject of plan) {
        const pageUrl = getObjectPageUrl(customObject, isLEX);
        const editPage = await this.browserforce.openPage(pageUrl, {
          waitUntil: ['load', 'domcontentloaded', 'networkidle0']
        });
        const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
          editPage,
          SELECTORS.SAVE_BUTTON
        );
        await Promise.all([
          frameOrPage.waitForNavigation(),
          frameOrPage.click(SELECTORS.SAVE_BUTTON)
        ]);
      }
    }
  }
}
