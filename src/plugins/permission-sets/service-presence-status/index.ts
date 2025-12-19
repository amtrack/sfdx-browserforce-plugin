import { BrowserforcePlugin } from '../../../plugin.js';

const ADD_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_add"]';
const REMOVE_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_remove"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":button_pc_save"]';
const VALUES_AVAILABLE_SELECTOR = 'select[id$=":duelingListBox:backingList_a"]:not([disabled="disabled"])';
const VALUES_ENABLED_SELECTOR = 'select[id$=":duelingListBox:backingList_s"]:not([disabled="disabled"])';

type PermissionSet = {
  permissionSetName: string;
  servicePresenceStatuses: string[];
};

export class ServicePresenceStatus extends BrowserforcePlugin {
  public async retrieve(definition: PermissionSet): Promise<string[]> {
    // Query for the permission set
    const permissionSetName = definition.permissionSetName;
    const permissionSet = await this.org
      .getConnection()
      .singleRecordQuery(`SELECT Id FROM PermissionSet WHERE Name='${permissionSetName}'`);

    // Open the permission set setup page
    const page = await this.browserforce.openPage(`${permissionSet.Id}/e?s=ServicePresenceStatusAccess`);

    const enabledServicePresenceStatuses = await page.$$eval(`${VALUES_ENABLED_SELECTOR} > option`, (options) => {
      return options.map((option) => option.title ?? '');
    });

    return enabledServicePresenceStatuses;
  }

  public async apply(config: PermissionSet): Promise<void> {
    // Query for the permission set
    const permissionSetName = config.permissionSetName;
    const permissionSet = await this.org
      .getConnection()
      .singleRecordQuery(`SELECT Id FROM PermissionSet WHERE Name='${permissionSetName}'`);

    // Open the permission set setup page
    const page = await this.browserforce.openPage(`${permissionSet.Id}/e?s=ServicePresenceStatusAccess`);

    if (config?.servicePresenceStatuses) {
      await page.waitForSelector(`${VALUES_AVAILABLE_SELECTOR} > option`);

      const availableElements = await page.$$(`${VALUES_AVAILABLE_SELECTOR} > option`);

      for (const availableElement of availableElements) {
        const optionTitle = (await availableElement.evaluate((node) => node.getAttribute('title')))?.toString();

        if (optionTitle && config.servicePresenceStatuses.includes(optionTitle)) {
          await availableElement.click();
          await page.click(ADD_BUTTON_SELECTOR);
        }
      }

      await page.waitForSelector(`${VALUES_ENABLED_SELECTOR} > option`);
      const enabledElements = await page.$$(`${VALUES_ENABLED_SELECTOR} > option`);

      for (const enabledElement of enabledElements) {
        const optionTitle = (await enabledElement.evaluate((node) => node.getAttribute('title')))?.toString();

        if (optionTitle && !config.servicePresenceStatuses.includes(optionTitle)) {
          await enabledElement.click();
          await page.click(REMOVE_BUTTON_SELECTOR);
        }
      }
    }

    // Save the settings and wait for page refresh
    await Promise.all([page.waitForNavigation(), page.click(SAVE_BUTTON_SELECTOR)]);

    // Close the page
    await page.close();
  }
}
