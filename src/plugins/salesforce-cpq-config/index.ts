import { BrowserforcePlugin } from '../../plugin';
import formConfigData from './formConfig.json';
import { FormConfig } from './types';

const formConfig: FormConfig = formConfigData;

const PATHS = {
  BASE: '0A3?setupid=ImportedPackage&retURL=%2Fui%2Fsetup%2FSetup%3Fsetupid%3DStudio'
};

const SELECTORS = {
  CONFIGURE: '.actionLink[title*="Configure"][title*="Salesforce CPQ"]',
  GENERATE_INTEGRATION_USER_PERMISSIONS: 'input[name="page:form:pb:j_id185:j_id197:setupIntegrationUserPermissions"]',
  SAVE: 'input[name="page:form:j_id2:j_id3:j_id11"]',
  AUTHORIZE_NEW_CALCULATION_SERVICE: 'span#page\\:form\\:pb\\:calculatorOptions\\:j_id201\\:j_id203 a',
  ALLOW: 'input[name="save"]'
};

const authorizationURL = 'setup/secur/RemoteAccessAuthorizationPage.apexp';

export type Config = any;

export class SalesforceCpqConfig extends BrowserforcePlugin {
  private logger = this.browserforce.logger;
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(SELECTORS.CONFIGURE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);

    const response = {} as Config;
    if (definition) {
      for (const [keyTab, valueTab] of Object.entries(formConfig)) {
        if (definition[keyTab]) {
          await page.waitForSelector(`td[id="${valueTab.id}"]`);
          await page.click(`td[id="${valueTab.id}"]`);
          for (const [keyItem, valueItem] of Object.entries(valueTab.properties)) {
            if (!(definition[keyTab][keyItem] === undefined)) {
              const item = valueItem;
              response[keyTab] = response[keyTab] || {};
              try {
                if (item.component === 'input' && item.type === 'boolean') {
                  response[keyTab][keyItem] = await page.$eval(
                    `${item.component}[name="${item.name}"]`,
                    (el: HTMLInputElement) => el.checked
                  );
                } else if (item.component === 'input' && item.type === 'string') {
                  response[keyTab][keyItem] = await page.$eval(
                    `${item.component}[name="${item.name}"]`,
                    (el: HTMLInputElement) => el.value
                  );
                } else if (item.component === 'select') {
                  response[keyTab][keyItem] = await page.$eval(
                    `${item.component}[name="${item.name}"]`,
                    (el: HTMLSelectElement) => el.selectedOptions[0].text
                  );
                }
              } catch (e) {
                if (
                  e.message ===
                  `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`
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
    const page = await this.browserforce.openPage(PATHS.BASE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);

    /* 
    This to click on the 'Generate Integration User Permissions button' for first time setup.
    Once the button is clicked, it will not be available for the next time.
    */
    try {
      this.logger?.log(`Clicking on 'Generate Integration User Permissions' button`);
      await page.waitForSelector(`td[id="${formConfig.pricingAndCalculation.id}"]`);
      await page.click(`td[id="${formConfig.pricingAndCalculation.id}"]`);
      await page.click(SELECTORS.GENERATE_INTEGRATION_USER_PERMISSIONS);
    } catch (e) {
      if (e.message === `No element found for selector: ${SELECTORS.GENERATE_INTEGRATION_USER_PERMISSIONS}`) {
        this.logger?.log(
          `The button 'Generate Integration User Permissions' is not found. It might be already clicked before.`
        );
      } else {
        this.logger?.warn(`Error clicking 'Generate Integration User Permissions' button with message: ${e.message}`);
        throw e;
      }
    }

    /* 
    This to loop through the formConfig and set the value based on the config provided.
    */
    for (const [keyTab, valueTab] of Object.entries(formConfig)) {
      if (config[keyTab]) {
        await page.waitForSelector(`td[id="${valueTab.id}"]`);
        await page.click(`td[id="${valueTab.id}"]`);
        for (const [keyItem, valueItem] of Object.entries(valueTab.properties)) {
          if (!(config[keyTab][keyItem] === undefined)) {
            const item = valueItem;
            try {
              this.logger?.log(
                `Updating: '${keyTab}.${keyItem}' (${item.label}) with component '${item.component}[name="${item.name}"]' with value: '${config[keyTab][keyItem]}'`
              );
              if (item.component === 'input' && item.type === 'boolean') {
                await page.$eval(
                  `input[name="${item.name}"]`,
                  (e: HTMLInputElement, v: boolean) => {
                    e.checked = v;
                  },
                  config[keyTab][keyItem]
                );
              } else if (item.component === 'input' && item.type === 'string') {
                await page.$eval(
                  `input[name="${item.name}"]`,
                  (e: HTMLInputElement, v: string) => {
                    e.value = v;
                  },
                  config[keyTab][keyItem]
                );
              } else if (item.component === 'select') {
                const selectFieldOptions = await page.$$eval(
                  `select[name="${item.name}"] option`,
                  (options: HTMLOptionElement[]) => {
                    return options.map((option) => {
                      return {
                        text: option.text,
                        value: option.value
                      };
                    });
                  }
                );
                const chooseFieldOption = selectFieldOptions.find((x) => x.text === config[keyTab][keyItem]);
                if (!chooseFieldOption) {
                  const availableOption = selectFieldOptions.map((option) => option.text);
                  throw new Error(
                    `Fail to set '${item.label}' with value '${
                      config[keyTab][keyItem]
                    }'. \nPlease make sure to select one of this available options: ${JSON.stringify(
                      availableOption
                    )}\n`
                  );
                }
                await page.select(`select[name="${item.name}"]`, chooseFieldOption.value);
              }
              if (item.immediatelySave) {
                await Promise.all([page.waitForNavigation(), page.click(SELECTORS.SAVE)]);
              }
            } catch (e) {
              if (
                e.message === `Error: failed to find element matching selector "${item.component}[name="${item.name}"]"`
              ) {
                this.logger?.warn(
                  `Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' is not found`
                );
              } else {
                this.logger?.warn(
                  `Error: at Label '${item.label}' '${keyTab}.${keyItem}' with component '${item.component}[name="${item.name}"]' with message: ${e.message}`
                );
                throw e;
              }
            }
          }
        }
      }
      await Promise.all([page.waitForNavigation(), page.click(SELECTORS.SAVE)]);
    }

    /* 
    This to click on the 'Authorize New Calculation Service' link under Pricing and Calculation tab.
    Once authorized, it will not appear the next time.
    */
    try {
      this.logger?.log(`'Authorize New Calculation Service' link`);
      await page.waitForSelector(`td[id="${formConfig.pricingAndCalculation.id}"]`);
      await page.click(`td[id="${formConfig.pricingAndCalculation.id}"]`);

      const authorizeLink = await page.$(SELECTORS.AUTHORIZE_NEW_CALCULATION_SERVICE);

      if (authorizeLink) {
        // Click on 'Authorize New Calculation Service' link
        await page.waitForSelector(SELECTORS.AUTHORIZE_NEW_CALCULATION_SERVICE);
        await page.click(SELECTORS.AUTHORIZE_NEW_CALCULATION_SERVICE);

        // Wait for popup window with the expected URL
        const newWindowTarget = await page.browser().waitForTarget((target) => target.url().includes(authorizationURL));
        const newPage = await newWindowTarget.page();

        if (newPage) {
          // Click on'Allow' button
          await newPage.waitForSelector(SELECTORS.ALLOW, { visible: true });
          await newPage.click(SELECTORS.ALLOW);
          await page.waitForNavigation(); // Wait for the main page to refresh

          this.logger?.log('The main page has refreshed after allowing.');
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
      if (e.message === `No element found for selector: ${SELECTORS.AUTHORIZE_NEW_CALCULATION_SERVICE}`) {
        this.logger?.log(
          `The link Authorize New Calculation Service' is not found. It might be already clicked before.`
        );
      } else if (
        e.message === `Waiting for selector \`input[name="save"]\` failed: waitForFunction failed: frame got detached.`
      ) {
        this.logger?.log(`ALLOW button is not found. It might be already clicked before.`);
      } else {
        this.logger?.warn(`Error clicking Authorize New Calculation Service' button with message: ${e.message}`);
        throw e;
      }
    }

    await page.close();
  }
}
