import { Page } from 'playwright';
import { LayoutSelectionPage } from './layout-selection.js';

const SAVE_BUTTON = 'input[id$=":form:SaveButton"]';
const MODAL_CONFIRM_BUTTON =
  'input[id="splitsMassOperationConfirmDialog_overlayConfirmButton"]';

export class SetupPage {
  static PATH =
    'opp/opportunitySplitSetupEdit.apexp?setupid=OpportunitySplitSetup';
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async enable(): Promise<LayoutSelectionPage> {
    await this.page.locator(SAVE_BUTTON).click();
    await this.page.locator(MODAL_CONFIRM_BUTTON).click();
    await this.page.waitForLoadState('networkidle');
    return new LayoutSelectionPage(this.page);
  }
}
