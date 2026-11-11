import { DefaultPicklistAddPage } from './default-picklist-add.js';

/**
 * The edit page of a picklist value (`/setup/ui/picklist_masteredit.jsp?id=<value id>`): its label and API name.
 */
export class PicklistValueEditPage extends DefaultPicklistAddPage {
  /**
   * Changes the API name and/or the label of the value, then saves: Salesforce updates the records holding it.
   */
  async edit({ apiName, label }: { apiName?: string; label?: string }): Promise<void> {
    if (apiName !== undefined) {
      await this.page.locator('input#p3').describe('API name').fill(apiName);
    }
    if (label !== undefined) {
      await this.page.locator('input#p1').describe('label').fill(label);
    }
    await this.save();
  }
}
