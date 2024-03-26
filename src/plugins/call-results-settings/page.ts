import { Page } from 'puppeteer';
import { throwPageErrors } from '../../browserforce';

const ENABLE_TOGGLE = 'div[data-aura-class="voiceSliderCheckBox"] input[type="checkbox"]';


export class DialerLogACallSetupPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public static getUrl(): string {
    return 'lightning/setup/DialerLogACallSetup/home';
  }

  public async getStatus(): Promise<boolean> {
    await this.page.waitForSelector(ENABLE_TOGGLE, { visible: true});
    //add delay 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    const isEnabled = await this.page.$eval(ENABLE_TOGGLE, (el: HTMLInputElement) => el.checked); 

    await this.page.close();
    return isEnabled;
    
  }

  public async setStatus(): Promise<void> {
    await this.page.waitForSelector(ENABLE_TOGGLE, { visible: true});
    await this.page.click(ENABLE_TOGGLE);

    await throwPageErrors(this.page);
    await this.page.close();
  }
}
