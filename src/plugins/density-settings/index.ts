import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/DensitySetup/home'
};

const domWaitForPickerItems = () => {
  return (
    document.querySelector('one-density-visual-picker') &&
    document.querySelector('one-density-visual-picker').shadowRoot &&
    document
      .querySelector('one-density-visual-picker')
      .shadowRoot.querySelectorAll('one-density-visual-picker-item').length >
      1 &&
    document
      .querySelector('one-density-visual-picker')
      .shadowRoot.querySelectorAll('one-density-visual-picker-item')[1]
      .shadowRoot &&
    document
      .querySelector('one-density-visual-picker')
      .shadowRoot.querySelectorAll('one-density-visual-picker-item')[1]
      .shadowRoot.querySelector('input')
  );
};

const domGetPickerItemInputs = () => {
  return Array.from(
    document
      .querySelector('one-density-visual-picker')
      .shadowRoot.querySelectorAll('one-density-visual-picker-item')
  ).map(item => {
    return item.shadowRoot.querySelector('input');
  });
};

export default class DensitySettings extends BrowserforcePlugin {
  public async retrieve() {
    const response = {
      density: ''
    };
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await page.waitForFunction(domWaitForPickerItems);
    const inputJsHandle = await page.evaluateHandle(domGetPickerItemInputs);
    // convert JSHandle.getProperties (Map) to Array
    const inputs = Array.from((await inputJsHandle.getProperties()).values());
    const checkedRadio = await page.evaluate((...inputElements) => {
      return inputElements
        .map(input => {
          return {
            value: input.value,
            checked: input.checked
          };
        })
        .find(input => input.checked);
    }, ...inputs);
    if (checkedRadio && checkedRadio.value) {
      response.density = checkedRadio.value;
    }
    return response;
  }

  public async apply(config) {
    const page = await this.browserforce.openPage(PATHS.BASE, {
      waitUntil: ['load', 'domcontentloaded', 'networkidle0']
    });
    await page.waitForFunction(domWaitForPickerItems);
    const inputJsHandle = await page.evaluateHandle(domGetPickerItemInputs);
    // convert JSHandle.getProperties (Map) to Array
    const inputs = Array.from((await inputJsHandle.getProperties()).values());
    await Promise.all([
      page.waitForResponse(
        response =>
          response
            .url()
            .includes(
              'UserSettings.DensityUserSettings.setDefaultDensitySetting=1'
            ) && response.status() === 200
      ),
      page.evaluate(
        (targetValue, ...inputElements) => {
          const targetInput = inputElements.find(
            input => input.value === targetValue
          );
          if (targetInput) {
            targetInput.click();
          }
        },
        config.density,
        ...inputs
      )
    ]);
  }
}
