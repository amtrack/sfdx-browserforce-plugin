import { SalesforceId } from 'jsforce';
import * as jsonMergePatch from 'json-merge-patch';
import { BrowserforcePlugin } from '../../../plugin';

const SELECTORS = {
  ENABLED: '#penabled',
  SAVE_BUTTON: 'input[name="save"]',
  ERROR_DIV: '#errorTitle',
  ERROR_DIVS: 'div.errorMsg',
  LIST_VIEW_PORTAL_LINKS_XPATH:
    '//div[contains(@class,"pbBody")]//th[contains(@class,"dataCell")]//a[starts-with(@href, "/060")]',
  PORTAL_DESCRIPTION: '#Description',
  PORTAL_ADMIN: '#Admin',
  PORTAL_PROFILE_MEMBERSHIP_PROFILES: 'th.dataCell',
  PORTAL_PROFILE_MEMBERSHIP_CHECKBOXES: 'td.dataCell input',
  CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL: '#options_9'
};

interface CustomObjectRecord {
  Id: SalesforceId;
  DeveloperName: string;
  NamespacePrefix: string;
}

export default class CustomerPortalAvailableCustomObjects extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = this.browserforce.page;
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
      await page.goto(this.browserforce.getInstanceUrl());
      await page.waitForNavigation();
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
          const availableForCustomerPortalUrl = `${this.browserforce.getInstanceUrl()}/lightning/setup/ObjectManager/${
            customObject.Id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
          await page.goto(availableForCustomerPortalUrl);
          // maybe use waitForFrame https://github.com/GoogleChrome/puppeteer/issues/1361
          await page.waitFor('iframe[name^=vfFrameId]');
          const frame = await page
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
          const availableForCustomerPortalUrl = `${this.browserforce.getInstanceUrl()}/${classicUiPath}`;
          await page.goto(availableForCustomerPortalUrl);
          await page.waitFor(
            SELECTORS.CUSTOM_OBJECT_AVAILABLE_FOR_CUSTOMER_PORTAL
          );
          response.push({
            id: customObject.Id,
            name: customObject.DeveloperName,
            namespacePrefix: customObject.NamespacePrefix,
            available: await page.$eval(
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
        response.push(
          jsonMergePatch.generate(oldCustomObject, availableCustomObject)
        );
      }
    }
    return response;
  }

  public async apply(plan) {
    const page = this.browserforce.page;
    if (plan && plan.length) {
      await page.goto(this.browserforce.getInstanceUrl());
      await page.waitForNavigation();
      // new URLs for LEX: https://help.salesforce.com/articleView?id=FAQ-for-the-New-URL-Format-for-Lightning-Experience-and-the-Salesforce-Mobile-App&type=1
      const isLEX =
        page.url().indexOf('/one/one.app') >= 0 ||
        page.url().indexOf('/lightning/') >= 0;
      for (const customObject of plan) {
        const classicUiPath = `${customObject.id}/e?options_9=${
          customObject.available ? 1 : 0
        }&retURL=/${customObject.id}`;
        if (isLEX) {
          const availableForCustomerPortalUrl = `${this.browserforce.getInstanceUrl()}/lightning/setup/ObjectManager/${
            customObject.id
          }/edit?nodeId=ObjectManager&address=${encodeURIComponent(
            `/${classicUiPath}`
          )}`;
          await page.goto(availableForCustomerPortalUrl);
          // maybe use waitForFrame https://github.com/GoogleChrome/puppeteer/issues/1361
          await page.waitFor('iframe[name^=vfFrameId]');
          const frame = await page
            .frames()
            .find(f => f.name().startsWith('vfFrameId'));
          await frame.waitFor(SELECTORS.SAVE_BUTTON);
          // framenavigated https://github.com/GoogleChrome/puppeteer/issues/2918
          await Promise.all([
            frame.waitForNavigation(),
            frame.click(SELECTORS.SAVE_BUTTON)
          ]);
        } else {
          const availableForCustomerPortalUrl = `${this.browserforce.getInstanceUrl()}/${classicUiPath}`;
          await page.goto(availableForCustomerPortalUrl);
          await page.waitFor(SELECTORS.SAVE_BUTTON);
          await Promise.all([
            page.waitForNavigation(),
            page.click(SELECTORS.SAVE_BUTTON)
          ]);
        }
      }
    }
  }
}
