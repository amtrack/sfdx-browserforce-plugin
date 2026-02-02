import { type SalesforceUrlPath } from '../../../browserforce.js';
import { BrowserforcePlugin } from '../../../plugin.js';

// Authentication Service page selectors
const AUTH_SERVICE_EDIT_PATH = '/domainname/EditLogin.apexp';
const AUTH_SERVICE_FORM_SELECTOR = 'form[id="BrandSetup:brandSetupForm"]';
const AUTH_SERVICE_CHECKBOX_SELECTOR = 'input.authOption[type="checkbox"]';
const AUTH_SERVICE_SAVE_BUTTON_SELECTOR = 'input[id$=":Save"]';

export type Config = {
  authProviderId: string;
  developerName: string;
  enabled: boolean;
};

export class AuthenticationService extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<boolean> {
    // Navigate to Authentication Service edit page
    await using page = await this.browserforce.openPage(AUTH_SERVICE_EDIT_PATH as SalesforceUrlPath);
    const authServiceFrameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      AUTH_SERVICE_FORM_SELECTOR,
    );

    // Find the checkbox with value attribute matching the AuthProvider ID
    const checkboxLocators = await authServiceFrameOrPage.locator(AUTH_SERVICE_CHECKBOX_SELECTOR).all();
    for (const checkboxLocator of checkboxLocators) {
      const value = await checkboxLocator.getAttribute('value');
      if (definition.authProviderId.includes(value)) {
        return await checkboxLocator.isChecked();
      }
    }

    throw new Error(
      `Authentication Service checkbox not found for AuthProvider '${definition.developerName}' (ID: ${definition.authProviderId}). ` +
        `The AuthProvider may not be available in the Authentication Service configuration.`,
    );
  }

  public async apply(config: Config): Promise<void> {
    this.browserforce.logger?.log('enableAuthenticationService', config.enabled.toString());
    console.log(`[AuthenticationService] Updating Authentication Service for ${config.developerName} (ID: ${config.authProviderId} Enabled: ${config.enabled})`);

    // Navigate to Authentication Service edit page
    await using page = await this.browserforce.openPage(AUTH_SERVICE_EDIT_PATH as SalesforceUrlPath);
    const authServiceFrameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      AUTH_SERVICE_FORM_SELECTOR,
    );

    // Find the checkbox with value attribute matching the AuthProvider ID
    const checkboxLocators = await authServiceFrameOrPage.locator(AUTH_SERVICE_CHECKBOX_SELECTOR).all();
    let checkboxFound = false;

    for (const checkboxLocator of checkboxLocators) {
      const value = await checkboxLocator.getAttribute('value');
      if (config.authProviderId.includes(value)) {
        checkboxFound = true;
        const isChecked = await checkboxLocator.isChecked();

        if (config.enabled !== isChecked) {
          // Check / Uncheck the checkbox
          if (config.enabled) {
            await checkboxLocator.check();
          } else {
            await checkboxLocator.uncheck();
          }
          console.log(`[AuthenticationService] Updated Authentication Service checkbox for ${config.developerName}`);
        } else {
          console.log(`[AuthenticationService] Authentication Service checkbox already updated for ${config.developerName}`);
        }

        // Save the changes
        await Promise.all([
          page.waitForResponse((resp) => new URL(resp.url()).pathname === '/domainname/DomainName.apexp'),
          authServiceFrameOrPage.locator(AUTH_SERVICE_SAVE_BUTTON_SELECTOR).first().click(),
        ]);

        console.log(`[AuthenticationService] Saved Authentication Service configuration for ${config.developerName}`);
        break;
      }
    }

    if (!checkboxFound) {
      throw new Error(
        `Authentication Service checkbox not found for AuthProvider '${config.developerName}' (ID: ${config.authProviderId}). ` +
          `The AuthProvider may not be available in the Authentication Service configuration.`,
      );
    }
  }
}
