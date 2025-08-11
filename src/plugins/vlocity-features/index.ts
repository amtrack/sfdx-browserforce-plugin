import { BrowserforcePlugin } from '../../plugin.js';

const BASE_PATH = '/lightning/n/vlocity_cmt__CMTAdmin';

type Config = {
  enableStandardCartAPI: boolean;
};

export class VlocityFeatures extends BrowserforcePlugin {
  private enableFeaturesButton = `::-p-xpath(//a[contains(@title, "Enable Features")])`;
  private configureButton = '::-p-xpath(//button[contains(text(), "Configure")])';

  public async retrieve(definition): Promise<Config> {
    const enableStandardCartAPI = definition.enableStandardCartAPI;
    const page = await this.browserforce.openPage(BASE_PATH);

    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      let targetFrame;
      let frames = page.frames();
      for (const frame of frames) {
        if (frame.url().includes('/apex/')) {
          targetFrame = frame;
          await targetFrame.waitForSelector(this.enableFeaturesButton);
          await targetFrame.click(this.enableFeaturesButton);
        }
      }

      if (targetFrame) {
        await new Promise(resolve => setTimeout(resolve, 15000));

        await targetFrame.waitForSelector(this.configureButton);
        await targetFrame.click(this.configureButton);

        await new Promise(resolve => setTimeout(resolve, 10000));

        let checkboxes = [];
        if (enableStandardCartAPI) {
          checkboxes = await targetFrame.$$('::-p-xpath(//input[contains(@type, "checkbox") and contains(@ng-change, "changeInFeature(feature)") and contains(@class, "ng-empty")])');
        } else {
          checkboxes = await targetFrame.$$('::-p-xpath(//input[contains(@type, "checkbox") and contains(@ng-change, "changeInFeature(feature)") and contains(@class, "ng-not-empty")])');
          checkboxes = checkboxes.reverse();
        }

        for (const checkbox of checkboxes) {
          await checkbox.click();
        }

        await new Promise(resolve => setTimeout(resolve, 10000));

        const saveButton = await targetFrame.$('::-p-xpath(//button[contains(text(), "Save")])');
        if (saveButton) {
          await saveButton.click();
          console.log(`Standard Cart API is ${enableStandardCartAPI ? 'enabled' : 'disabled'}`);
        }
      }
    } catch (e) {
      console.warn(`Something went wrong: ${e}`);
    }


    return definition;
  }

  public async apply(config: Config): Promise<void> {

  }
}
