import { BrowserforcePlugin } from '../../plugin.js';
import { formConfig } from './formConfig.js';

const BASE_PATH =
  '0A3?setupid=ImportedPackage&retURL=%2Fui%2Fsetup%2FSetup%3Fsetupid%3DStudio';
const AUTH_PATH = 'setup/secur/RemoteAccessAuthorizationPage.apexp';

const CONFIGURE_SELECTOR =
  '.actionLink[title*="Configure"][title*="Salesforce CPQ"]';
const GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR =
  'input[name="page:form:pb:j_id185:j_id197:setupIntegrationUserPermissions"]';
const SAVE_SELECTOR = 'input[name="page:form:j_id2:j_id3:j_id11"]';
const AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR =
  'span#page\\:form\\:pb\\:calculatorOptions\\:j_id201\\:j_id203 a';
const ALLOW_SELECTOR = 'input[name="save"]';

export type Config = any;

export class SalesforceCpqConfig extends BrowserforcePlugin {
  private logger = this.browserforce.logger;
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(CONFIGURE_SELECTOR).waitFor();
    await page.locator(CONFIGURE_SELECTOR).click();
    await page.waitForLoadState('load');

    const response = {} as Config;
    if (definition) {
      for (const [keyTab, valueTab] of Object.entries(formConfig)) {
        if (definition[keyTab]) {
          await page.locator(`td[id="${valueTab.id}"]`).waitFor();
          await page.locator(`td[id="${valueTab.id}"]`).click();
          for (const [keyItem, valueItem] of Object.entries(
            valueTab.properties
          )) {
            if (!(definition[keyTab][keyItem] === undefined)) {
              const item = valueItem;
              response[keyTab] = response[keyTab] || {};
              try {
                if (item.component === 'input' && item.type === 'boolean') {
                  response[keyTab][keyItem] = await page
                    .locator(`${item.component}[name="${item.name}"]`)
                    .isChecked();
                } else if (
                  item.component === 'input' &&
                  item.type === 'string'
                ) {
                  response[keyTab][keyItem] = await page
                    .locator(`${item.component}[name="${item.name}"]`)
                    .evaluate((el: HTMLInputElement) => el.value);
                } else if (item.component === 'select') {
                  response[keyTab][keyItem] = await page
                    .locator(`${item.component}[name="${item.name}"]`)
                    .evaluate(
                      (el: HTMLSelectElement) => el.selectedOptions[0].text
                    );
                }
              } catch (e) {
                if (
                  e instanceof Error &&
                  e.message.includes(
                    `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`
                  )
                ) {
                  this.logger?.warn(
                    `Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' is not found`
                  );
                } else {
                  throw e;
                }
              }
            }
          }
        }
      }
    }
    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(CONFIGURE_SELECTOR).click();
    await page.waitForLoadState('load');

    /*
    This to click on the 'Generate Integration User Permissions button' for first time setup.
    Once the button is clicked, it will not be available for the next time.
    */
    this.logger?.log(
      `Checking for 'Generate Integration User Permissions' button`
    );
    await page
      .locator(`td[id="${formConfig.pricingAndCalculation.id}"]`)
      .waitFor();
    await page
      .locator(`td[id="${formConfig.pricingAndCalculation.id}"]`)
      .click();

    const generateButtonCount = await page
      .locator(GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR)
      .count();

    if (generateButtonCount > 0) {
      this.logger?.log(
        `Clicking on 'Generate Integration User Permissions' button`
      );
      await page
        .locator(GENERATE_INTEGRATION_USER_PERMISSIONS_SELECTOR)
        .click();
    } else {
      this.logger?.log(
        `The button 'Generate Integration User Permissions' is not found. It might be already clicked before.`
      );
    }

    /*
    This to loop through the formConfig and set the value based on the config provided.
    */
    for (const [keyTab, valueTab] of Object.entries(formConfig)) {
      if (config[keyTab]) {
        await page.locator(`td[id="${valueTab.id}"]`).waitFor();
        await page.locator(`td[id="${valueTab.id}"]`).click();
        for (const [keyItem, valueItem] of Object.entries(
          valueTab.properties
        )) {
          if (!(config[keyTab][keyItem] === undefined)) {
            const item = valueItem;
            try {
              this.logger?.log(
                `Updating: '${keyTab}.${keyItem}' (${item.label}) with component '${item.component}[name="${item.name}"]' with value: '${config[keyTab][keyItem]}'`
              );
              if (item.component === 'input' && item.type === 'boolean') {
                const checkbox = await page.locator(
                  `input[name="${item.name}"]`
                );
                if (!(await checkbox.isDisabled())) {
                  if (config[keyTab][keyItem]) {
                    await checkbox.check();
                  } else {
                    await checkbox.uncheck();
                  }
                }
              } else if (item.component === 'input' && item.type === 'string') {
                await page
                  .locator(`input[name="${item.name}"]`)
                  .fill(config[keyTab][keyItem]);
              } else if (item.component === 'select') {
                const selectFieldOptions = await page
                  .locator(`select[name="${item.name}"] option`)
                  .evaluateAll((options: HTMLOptionElement[]) => {
                    return options.map((option) => {
                      return {
                        text: option.text,
                        value: option.value,
                      };
                    });
                  });
                const chooseFieldOption = selectFieldOptions.find(
                  (x) => x.text === config[keyTab][keyItem]
                );
                if (!chooseFieldOption) {
                  const availableOption = selectFieldOptions.map(
                    (option) => option.text
                  );
                  throw new Error(
                    `Fail to set '${item.label}' with value '${
                      config[keyTab][keyItem]
                    }'. \nPlease make sure to select one of this available options: ${JSON.stringify(
                      availableOption
                    )}\n`
                  );
                }
                await page
                  .locator(`select[name="${item.name}"]`)
                  .selectOption(chooseFieldOption.value);
              }
              if (item.immediatelySave) {
                await page.locator(SAVE_SELECTOR).click();
                await page.waitForLoadState('load');
              }
            } catch (e) {
              if (
                e instanceof Error &&
                e.message.includes(
                  `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`
                )
              ) {
                this.logger?.warn(
                  `Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' is not found`
                );
              } else {
                this.logger?.warn(
                  `Error: at Label '${
                    item.label
                  }' '${keyTab}.${keyItem}' with component '${
                    item.component
                  }[name="${item.name}"]' with message: ${
                    e instanceof Error ? e.message : String(e)
                  }`
                );
                throw e;
              }
            }
          }
        }
      }
      await page.locator(SAVE_SELECTOR).click();
      await page.waitForLoadState('load');
    }

    /*
    This to click on the 'Authorize New Calculation Service' link under Pricing and Calculation tab.
    Once authorized, it will not appear the next time.
    */
    try {
      this.logger?.log(`'Authorize New Calculation Service' link`);
      await page
        .locator(`td[id="${formConfig.pricingAndCalculation.id}"]`)
        .waitFor();
      await page
        .locator(`td[id="${formConfig.pricingAndCalculation.id}"]`)
        .click();

      const authorizeLinkCount = await page
        .locator(AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR)
        .count();

      if (authorizeLinkCount > 0) {
        // Click on 'Authorize New Calculation Service' link and wait for popup
        const popupPromise = page
          .context()
          .waitForEvent('page', (newPage) => newPage.url().includes(AUTH_PATH));
        await page.locator(AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR).click();
        const newPage = await popupPromise;

        if (newPage) {
          // Click on 'Allow' button
          await newPage.locator(ALLOW_SELECTOR).waitFor();
          await newPage.locator(ALLOW_SELECTOR).click();
          await page.waitForLoadState('load'); // Wait for the main page to refresh

          this.logger?.log('The main page has refreshed after allowing.');
          await newPage.close();
        } else {
          this.logger?.warn('Failed to retrieve the new page from the popup.');
        }
        this.logger?.log('The authorization process has been completed.');
      } else {
        this.logger?.log(
          `The link 'Authorize New Calculation Service' was not found. It might be already clicked before.`
        );
      }
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes(
          `No element found for selector: ${AUTHORIZE_NEW_CALCULATION_SERVICE_SELECTOR}`
        )
      ) {
        this.logger?.log(
          `The link Authorize New Calculation Service' is not found. It might be already clicked before.`
        );
      } else if (
        e instanceof Error &&
        e.message.includes(
          `Waiting for selector \`input[name="save"]\` failed: waitForFunction failed: frame got detached.`
        )
      ) {
        this.logger?.log(
          `ALLOW button is not found. It might be already clicked before.`
        );
      } else {
        this.logger?.warn(
          `Error clicking Authorize New Calculation Service' button with message: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
        throw e;
      }
    }

    await page.close();
  }
}
