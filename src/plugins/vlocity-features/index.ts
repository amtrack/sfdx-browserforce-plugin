import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/lightning/n/vlocity_cmt__CMTAdmin';

type Config = {
  enableStandardCartAPI: boolean;
};

export class VlocityFeatures extends BrowserforcePlugin {
  private enableFeaturesButton = `::-p-xpath(//a[contains(@title, "Enable Features")])`;
  private configureButton = '::-p-xpath(//button[contains(text(), "Configure")])';

  public async retrieve(): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await new Promise(resolve => setTimeout(resolve, 10000));

    let targetFrame;
    let frames = page.frames();
    for (const frame of frames) {
      try {
        if (frame.url().includes('/apex/')) {
          targetFrame = frame;
          await targetFrame.waitForSelector(this.enableFeaturesButton);
          await targetFrame.click(this.enableFeaturesButton);
        }
      } catch (e) {
        console.warn(`'Enable Features' button not found in frame: ${targetFrame.url()}`);
      }
    }

    await new Promise(resolve => setTimeout(resolve, 15000));
    try {
      await targetFrame.waitForSelector(this.configureButton);
      await targetFrame.click(this.configureButton);
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch(e) {
      console.warn(`Failed to click 'Configure' button`);
    }

    const checkboxes = await targetFrame.$$('::-p-xpath(//input[contains(@type, "checkbox") and contains(@ng-change, "changeInFeature(feature)") and contains(@class, "ng-empty")])');
    console.log('checkboxes.length: ' + checkboxes.length);

    for(const checkbox of checkboxes) {
      await checkbox.click();
    }

    await new Promise(resolve => setTimeout(resolve, 30000));


    return {enableStandardCartAPI: true};
  }

  public async apply(config: Config): Promise<void> {
    console.log('nu in apply');
  }
}
