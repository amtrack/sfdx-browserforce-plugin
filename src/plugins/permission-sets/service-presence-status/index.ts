import { BrowserforcePlugin } from '../../../plugin.js';

const SELECTORS = {
  ADD_BUTTON: 'a[id$=":duelingListBox:add"]',
  REMOVE_BUTTON: 'a[id$=":duelingListBox:remove"]',
  SAVE_BUTTON: 'input[id$=":button_pc_save"]',
  VALUES_AVAILABLE: 'select[id$=":statusFieldValues:duelingListBox:backingList_a"]:not([disabled="disabled"])',
  VALUES_ENABLED: 'select[id$=":statusFieldValues:duelingListBox:backingList_s"]:not([disabled="disabled"])'
};

type PermissionSet = {
  permissionSetDeveloperName: string;
  servicePresenceStatuses: string[];
};

export class ServicePresenceStatus extends BrowserforcePlugin {
  public async retrieve(definition: PermissionSet): Promise<string[]> {
    // Query for the permission set
    const permissionSetDeveloperName = definition.permissionSetDeveloperName;
    const permissionSet = await this.org.getConnection().singleRecordQuery(
      `SELECT Id FROM PermissionSet WHERE DeveloperName='${permissionSetDeveloperName}'`
    );

    // Open the permission set setup page
    const page = await this.browserforce.openPage(`${permissionSet.Id}/e?s=ServicePresenceStatusAccess`);
    
    const enabledServicePresenceStatuses = await page.$$eval(`${SELECTORS.VALUES_ENABLED} > option`, (options) => {
      return options.map((option) => option.title ?? '');
    });

    return enabledServicePresenceStatuses;
  }

  public async apply(config: PermissionSet): Promise<void> {
    // Query for the permission set
    const permissionSetDeveloperName = config.permissionSetDeveloperName;
    const permissionSet = await this.org.getConnection().singleRecordQuery(
      `SELECT Id FROM PermissionSet WHERE DeveloperName='${permissionSetDeveloperName}'`
    );

    // Open the permission set setup page
    const page = await this.browserforce.openPage(`${permissionSet.Id}/e?s=ServicePresenceStatusAccess`);
  
    if (config?.servicePresenceStatuses) {
      await page.waitForSelector(`${SELECTORS.VALUES_AVAILABLE} > option`);

      const availableElements = await page.$$(`${SELECTORS.VALUES_AVAILABLE} > option`);

      for (const availableElement of availableElements) {
        const optionTitle = (await availableElement.evaluate(node => node.getAttribute('title')))?.toString();

        if (optionTitle && config.servicePresenceStatuses.includes(optionTitle)) {
          await availableElement.click();
          await page.click(SELECTORS.ADD_BUTTON);
        }
      }

      await page.waitForSelector(`${SELECTORS.VALUES_ENABLED} > option`);
      const enabledElements = await page.$$(`${SELECTORS.VALUES_ENABLED} > option`);

      for (const enabledElement of enabledElements) {
        const optionTitle = (await enabledElement.evaluate(node => node.getAttribute('title')))?.toString();

        if (optionTitle && !config.servicePresenceStatuses.includes(optionTitle)) {
          await enabledElement.click();
          await page.click(SELECTORS.REMOVE_BUTTON);
        }
      }
    }

    // Save the settings
    await page.click(SELECTORS.SAVE_BUTTON);

    // Wait for the page to refresh
    await page.waitForNavigation()

    // Close the page
    await page.close();
  }
}
