import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import { BrowserforcePlugin } from '../../../plugin';

const SELECTORS = {
  SAVE_BUTTON: 'input[name="save"]',
  CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL: '#options_9',
  IFRAME: 'iframe[name^=vfFrameId]'
};

interface CustomObjectRecord {
  Id: SalesforceId;
  DeveloperName: string;
  NamespacePrefix: string;
}

export default class CustomerPortalAvailableCustomObjects extends BrowserforcePlugin {
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
            `Could not find CustomObject: {DeveloperName: ${
              availableCustomObject.name
            }, NamespacePrefix: ${availableCustomObject.namespacePrefix}`
          );
        }
        const classicUiPath = `${customObject.Id}/e`;
        if (isLEX) {
          const availableForCustomerPortalPath = `lightning/setup/ObjectManager/${
            customObject.Id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
          const lexPage = await this.browserforce.openPage(
            availableForCustomerPortalPath,
            {
              waitUntil: ['load', 'domcontentloaded', 'networkidle0']
            }
          );
          // maybe use waitForFrame https://github.com/GoogleChrome/puppeteer/issues/1361
          await lexPage.waitFor(SELECTORS.IFRAME);
          const frame = await lexPage
            .frames()
            .find(f => f.name().startsWith('vfFrameId'));
          await frame.waitFor(
            SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL
          );
          response.push({
            id: customObject.Id,
            name: customObject.DeveloperName,
            namespacePrefix: customObject.NamespacePrefix,
            available: await frame.$eval(
              SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL,
              (el: HTMLInputElement) => el.checked
            )
          });
        } else {
          const classicPage = await this.browserforce.openPage(classicUiPath);
          await classicPage.waitFor(
            SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL
          );
          response.push({
            id: customObject.Id,
            name: customObject.DeveloperName,
            namespacePrefix: customObject.NamespacePrefix,
            available: await classicPage.$eval(
              SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL,
              (el: HTMLInputElement) => el.checked
            )
          });
        }
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
      for (const customObject of plan) {
        const classicUiPath = `${customObject.id}/e?options_9=${
          customObject.available ? 1 : 0
        }&retURL=/${customObject.id}`;
        if (isLEX) {
          const availableForCustomerPortalPath = `lightning/setup/ObjectManager/${
            customObject.id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
          const lexPage = await this.browserforce.openPage(
            availableForCustomerPortalPath,
            {
              waitUntil: ['load', 'domcontentloaded', 'networkidle0']
            }
          );
          // maybe use waitForFrame https://github.com/GoogleChrome/puppeteer/issues/1361
          await lexPage.waitFor(SELECTORS.IFRAME);
          const frame = await lexPage
            .frames()
            .find(f => f.name().startsWith('vfFrameId'));
          await frame.waitFor(SELECTORS.SAVE_BUTTON);
          // framenavigated https://github.com/GoogleChrome/puppeteer/issues/2918
          await Promise.all([
            frame.waitForNavigation(),
            frame.click(SELECTORS.SAVE_BUTTON)
          ]);
        } else {
          const classicPage = await this.browserforce.openPage(classicUiPath);
          await classicPage.waitFor(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            classicPage.waitForNavigation(),
            classicPage.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
  }
}
