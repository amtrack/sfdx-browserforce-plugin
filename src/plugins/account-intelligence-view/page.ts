import type { Page } from 'playwright';
import { type SalesforceUrlPath } from '../../browserforce.js';
import { waitForPageErrors } from '../../page-errors.js';

const TOGGLE = 'lightning-input.pipelineInspectionToggle lightning-primitive-input-toggle';
const TOGGLE_INPUT = 'lightning-input.pipelineInspectionToggle input[type="checkbox"][role="switch"]';

const SAVE_RESPONSE = /AccountInspectorSetup\.setInspectionPref=1/;

export class AccountIntelligenceViewPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): SalesforceUrlPath {
    return '/lightning/setup/AccountInspectionSettings/home';
  }

  public async getStatus(): Promise<boolean> {
    return this.page.locator(TOGGLE_INPUT).isChecked();
  }

  public async setStatus(enable: boolean): Promise<void> {
    if ((await this.getStatus()) === enable) {
      return;
    }

    await Promise.all([
      Promise.race([this.page.waitForResponse(SAVE_RESPONSE), waitForPageErrors(this.page)]),
      this.page.locator(TOGGLE).click(),
    ]);
  }
}
