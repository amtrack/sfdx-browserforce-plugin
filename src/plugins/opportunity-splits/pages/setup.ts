import { Page } from 'puppeteer';
import { LayoutSelectionPage } from './layout-selection.js';

const SAVE_BUTTON = 'input[id$=":form:SaveButton"]';
const MODAL_CONFIRM_BUTTON = 'input[id="splitsMassOperationConfirmDialog_overlayConfirmButton"]';

export class SetupPage {
  static PATH = 'opp/opportunitySplitSetupEdit.apexp?setupid=OpportunitySplitSetup';
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public async enable(): Promise<LayoutSelectionPage> {
    await this.page.waitForSelector(SAVE_BUTTON);
    await this.page.click(SAVE_BUTTON);
    await this.page.waitForSelector(MODAL_CONFIRM_BUTTON);
    await Promise.all([this.page.waitForNavigation(), this.page.click(MODAL_CONFIRM_BUTTON)]);
    return new LayoutSelectionPage(this.page);
  }
}
