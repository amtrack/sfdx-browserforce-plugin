import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';
import { AuthenticationService } from './authentication-service/index.js';

const CONSUMER_SECRET_SELECTOR = '#ConsumerSecret';
const CONSUMER_KEY_SELECTOR = '#ConsumerKey';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"], #topButtonRow > input[name="save"], button[title="Save"]';

const getUrl = (orgId: string): SalesforceUrlPath => `/${orgId}/e` as SalesforceUrlPath;

type AuthProviderConfig = {
  consumerSecret?: string;
  consumerKey?: string;
  enableAuthenticationService?: boolean;
};

export type Config = {
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
    const authProviders = await this.browserforce.connection.query<AuthProviderRecord>(
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

      try {
        // Check if there are updates to consumerSecret or consumerKey
        const hasConsumerUpdates = authProviderConfig.consumerSecret !== undefined || authProviderConfig.consumerKey !== undefined;

        if (hasConsumerUpdates) {
          // Navigate to the edit page
          const editPageUrl = getUrl(authProviderId);

          this.browserforce.logger?.log('editPageUrl', editPageUrl);
          console.log(`[AuthProviders] Navigating to edit page for ${developerName}: ${editPageUrl}`);
          
          await using page = await this.browserforce.openPage(editPageUrl);

          // Wait for the page/frame to load - handle both Lightning (iframe) and Classic UI
          // Use ConsumerSecret as the selector to wait for, or fallback to ConsumerKey
          const formSelector = `${CONSUMER_SECRET_SELECTOR}, ${CONSUMER_KEY_SELECTOR}`;
          const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, formSelector);
          // Update ConsumerSecret if provided
          if (authProviderConfig.consumerSecret !== undefined) {
            await frameOrPage.locator(CONSUMER_SECRET_SELECTOR).waitFor({ timeout: 10000 });
            await frameOrPage.locator(CONSUMER_SECRET_SELECTOR).fill(authProviderConfig.consumerSecret);
          }

          // Update ConsumerKey if provided
          if (authProviderConfig.consumerKey !== undefined) {
            await frameOrPage.locator(CONSUMER_KEY_SELECTOR).waitFor({ timeout: 10000 });
            await frameOrPage.locator(CONSUMER_KEY_SELECTOR).fill(authProviderConfig.consumerKey);
          }

          // Save the changes
          await frameOrPage.locator(SAVE_BUTTON_SELECTOR).waitFor({ timeout: 10000 });
          
          // Click save button - don't wait for navigation as it may redirect to a non-existent page
          // Instead, wait for the click to complete and then check for errors
          const saveButtonLocator = frameOrPage.locator(SAVE_BUTTON_SELECTOR);
          const saveButtonCount = await saveButtonLocator.count();
          if (saveButtonCount === 0) {
            throw new Error(`Save button not found for AuthProvider '${developerName}'`);
          }
          
          // Click the save button
          await saveButtonLocator.first().click();
          
          // Wait for save to complete - give it time to process
          // The page might reload or show a success/error message
          await new Promise((resolve) => setTimeout(resolve, 3000));
          
          // Check for errors on the page/frame
          // If the frame still exists, check it; otherwise check the main page
          try {
            // Try to check for errors in the frame first
            const errorLocator = frameOrPage.locator('div.errorMsg, div.error, .errorMessage, #errorTitle');
            const errorCount = await errorLocator.count();
            if (errorCount > 0) {
              const errorText = await errorLocator.first().textContent();
              if (errorText && !errorText.includes('page no longer exists')) {
                throw new Error(`Save failed: ${errorText.trim()}`);
              }
            }
          } catch (e) {
            // If checking frame fails, check the main page
            await waitForPageErrors(page);
          }
        }

        // Handle enableAuthenticationService if requested
        if (authProviderConfig.enableAuthenticationService !== undefined) {
          const pluginAuthenticationService = new AuthenticationService(this.browserforce);
          await pluginAuthenticationService.apply({
            authProviderId,
            developerName,
            enabled: authProviderConfig.enableAuthenticationService,
          });
        }
      } catch (error) {
        throw new Error(`Failed to update AuthProvider '${developerName}': ${error.message}`);
      }      
    }
  }
}
