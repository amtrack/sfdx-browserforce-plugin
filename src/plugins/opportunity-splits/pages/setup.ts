import type { Page } from 'playwright';
import { LayoutSelectionPage } from './layout-selection.js';
import type { SalesforceUrlPath } from '../../../browserforce.js';

const SAVE_BUTTON = 'input[id$=":form:SaveButton"]';
const MODAL_CONFIRM_BUTTON =
  'input[id="splitsMassOperationConfirmDialog_overlayConfirmButton"]';

export class SetupPage {
  static PATH: SalesforceUrlPath =
    '/opp/opportunitySplitSetupEdit.apexp?setupid=OpportunitySplitSetup';
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async enable(): Promise<LayoutSelectionPage> {
    await this.page.locator(SAVE_BUTTON).click();
    await this.page.locator(MODAL_CONFIRM_BUTTON).click();
    await this.page.waitForURL(
      (url) => url.pathname === '/opp/opportunitySplitSetupLayout.apexp'
    );
    return new LayoutSelectionPage(this.page);
  }
}
