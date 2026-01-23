import { BrowserforcePlugin } from '../../plugin.js';

const CONSUMER_SECRET_SELECTOR = '#ConsumerSecret';
const CONSUMER_KEY_SELECTOR = '#ConsumerKey';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"], #topButtonRow > input[name="save"], button[title="Save"]';

const getUrl = (orgId: string) => `/${orgId}/e`;

type AuthProviderConfig = {
  consumerSecret?: string;
  consumerKey?: string;
};

type Config = {
  [developerName: string]: AuthProviderConfig;
};

type AuthProviderRecord = {
  Id: string;
  DeveloperName: string;
};

export class AuthProviders extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    // Skip retrieve as requested - return empty config
    return {};
  }

  public async apply(config: Config): Promise<void> {
    if (!config || Object.keys(config).length === 0) {
      return;
    }

    const developerNames = Object.keys(config);
    const developerNamesList = developerNames.map((name) => `'${name}'`).join(',');

    // Query AuthProviders using standard REST API (not Tooling API)
    const authProviders = await this.org
      .getConnection()
      .query<AuthProviderRecord>(
        `SELECT Id, DeveloperName FROM AuthProvider WHERE DeveloperName IN (${developerNamesList})`,
      );

    if (authProviders.records.length === 0) {
      throw new Error(`No AuthProviders found with DeveloperNames: ${developerNames.join(', ')}`);
    }

    // Create a map for quick lookup
    const authProviderMap = new Map<string, string>();
    for (const authProvider of authProviders.records) {
      authProviderMap.set(authProvider.DeveloperName, authProvider.Id);
    }

    // Verify we found all required AuthProviders
    const missingProviders = developerNames.filter((name) => !authProviderMap.has(name));
    if (missingProviders.length > 0) {
      throw new Error(
        `AuthProvider with DeveloperName(s) not found: ${missingProviders.join(', ')}. ` +
        `Please verify the DeveloperNames are correct and the AuthProviders exist in your org.`,
      );
    }

    // Process each auth provider configuration
    for (const [developerName, authProviderConfig] of Object.entries(config)) {
      const authProviderId = authProviderMap.get(developerName);
      if (!authProviderId) {
        throw new Error(`AuthProvider with DeveloperName '${developerName}' not found`);
      }

      // Navigate to the edit page
      const editPageUrl = getUrl(authProviderId);

      this.browserforce.logger?.log('editPageUrl', editPageUrl);
      console.log(`[AuthProviders] Navigating to edit page for ${developerName}: ${editPageUrl}`);
      
      const page = await this.browserforce.openPage(editPageUrl);

      // Wait for the page/frame to load - handle both Lightning (iframe) and Classic UI
      // Use ConsumerSecret as the selector to wait for, or fallback to ConsumerKey
      const formSelector = `${CONSUMER_SECRET_SELECTOR}, ${CONSUMER_KEY_SELECTOR}, form`;
      const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, formSelector);

      try {
        // Update ConsumerSecret if provided
        if (authProviderConfig.consumerSecret !== undefined) {
          await frameOrPage.waitForSelector(CONSUMER_SECRET_SELECTOR, { timeout: 10000 });
          await frameOrPage.$eval(
            CONSUMER_SECRET_SELECTOR,
            (e: HTMLInputElement, v: string) => {
              e.value = v;
            },
            authProviderConfig.consumerSecret,
          );
        }

        // Update ConsumerKey if provided
        if (authProviderConfig.consumerKey !== undefined) {
          await frameOrPage.waitForSelector(CONSUMER_KEY_SELECTOR, { timeout: 10000 });
          await frameOrPage.$eval(
            CONSUMER_KEY_SELECTOR,
            (e: HTMLInputElement, v: string) => {
              e.value = v;
            },
            authProviderConfig.consumerKey,
          );
        }

        // Save the changes
        await frameOrPage.waitForSelector(SAVE_BUTTON_SELECTOR, { timeout: 10000 });
        
        // Click save button - don't wait for navigation as it may redirect to a non-existent page
        // Instead, wait for the click to complete and then check for errors
        const saveButton = await frameOrPage.$(SAVE_BUTTON_SELECTOR);
        if (!saveButton) {
          throw new Error(`Save button not found for AuthProvider '${developerName}'`);
        }
        
        // Click the save button
        await saveButton.click();
        
        // Wait for save to complete - give it time to process
        // The page might reload or show a success/error message
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        // Check for errors on the page/frame
        // If the frame still exists, check it; otherwise check the main page
        try {
          // Try to check for errors in the frame first
          const errorElements = await frameOrPage.$$('div.errorMsg, div.error, .errorMessage, #errorTitle');
          if (errorElements.length > 0) {
            const errorText = await frameOrPage.evaluate(() => {
              const errorDiv = document.querySelector('div.errorMsg, div.error, .errorMessage, #errorTitle');
              return errorDiv ? errorDiv.textContent : null;
            });
            if (errorText && !errorText.includes('page no longer exists')) {
              throw new Error(`Save failed: ${errorText}`);
            }
          }
        } catch (e) {
          // If checking frame fails, check the main page
          await this.browserforce.throwPageErrors(page);
        }
      } catch (error) {
        await page.close();
        throw new Error(`Failed to update AuthProvider '${developerName}': ${error.message}`);
      }

      await page.close();
    }
  }
}
