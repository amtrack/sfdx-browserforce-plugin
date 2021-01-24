import { throwPageErrors } from '../../browserforce';

const SET_UP_AND_ENABLE_HVS_BUTTON = 'button.setupAndEnableButton';
const ENABLE_TOGGLE = '#toggleHighVelocitySalesPref';

export class HighVelocitySalesSetupPage {
  private page;

  constructor(page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/HighVelocitySales/home';
  }

  public async setUpAndEnable() {
    await this.page.waitForSelector(SET_UP_AND_ENABLE_HVS_BUTTON);
    await this.page.click(SET_UP_AND_ENABLE_HVS_BUTTON);
    await throwPageErrors(this.page);
    await this.page.waitForSelector(ENABLE_TOGGLE);
  }
}
