import { BrowserforcePlugin } from '../../../plugin.js';

const ADD_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_add"]';
const REMOVE_BUTTON_SELECTOR = 'a[id$=":duelingListBox:backingList_remove"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":button_pc_save"]';
const VALUES_AVAILABLE_SELECTOR =
  'select[id$=":duelingListBox:backingList_a"]:not([disabled="disabled"])';
const VALUES_ENABLED_SELECTOR =
  'select[id$=":duelingListBox:backingList_s"]:not([disabled="disabled"])';

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
      .singleRecordQuery(
        `SELECT Id FROM PermissionSet WHERE Name='${permissionSetName}'`
      );

    // Open the permission set setup page
    const page = await this.browserforce.openPage(
      `${permissionSet.Id}/e?s=ServicePresenceStatusAccess`
    );

    const enabledServicePresenceStatuses = await page
      .locator(`${VALUES_ENABLED_SELECTOR} > option`)
      .evaluateAll((options: HTMLOptionElement[]) => {
        return options.map((option) => option.title ?? '');
      });

    await page.close();
    return enabledServicePresenceStatuses;
  }

  public async apply(config: PermissionSet): Promise<void> {
    // Query for the permission set
    const permissionSetName = config.permissionSetName;
    const permissionSet = await this.org
      .getConnection()
      .singleRecordQuery(
        `SELECT Id FROM PermissionSet WHERE Name='${permissionSetName}'`
      );

    // Open the permission set setup page
    const page = await this.browserforce.openPage(
      `${permissionSet.Id}/e?s=ServicePresenceStatusAccess`
    );

    if (config?.servicePresenceStatuses) {
      await page.locator(`${VALUES_AVAILABLE_SELECTOR} > option`).first().waitFor();

      const availableElements = await page
        .locator(`${VALUES_AVAILABLE_SELECTOR} > option`)
        .all();

      for (const availableElement of availableElements) {
        const optionTitle = await availableElement.getAttribute('title');

        if (
          optionTitle &&
          config.servicePresenceStatuses.includes(optionTitle)
        ) {
          await availableElement.click();
          await page.locator(ADD_BUTTON_SELECTOR).click();
        }
      }

      await page.locator(`${VALUES_ENABLED_SELECTOR} > option`).first().waitFor();
      const enabledElements = await page
        .locator(`${VALUES_ENABLED_SELECTOR} > option`)
        .all();

      for (const enabledElement of enabledElements) {
        const optionTitle = await enabledElement.getAttribute('title');

        if (
          optionTitle &&
          !config.servicePresenceStatuses.includes(optionTitle)
        ) {
          await enabledElement.click();
          await page.locator(REMOVE_BUTTON_SELECTOR).click();
        }
      }
    }

    // Save the settings and wait for page refresh
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    await page.waitForLoadState('load');

    // Close the page
    await page.close();
  }
}
