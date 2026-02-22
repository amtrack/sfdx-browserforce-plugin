import { type SalesforceUrlPath, waitForPageErrors } from '../../browserforce.js';
import { BrowserforcePlugin } from '../../plugin.js';

const CONSUMER_SECRET_SELECTOR = '#ConsumerSecret';
const CONSUMER_KEY_SELECTOR = '#ConsumerKey';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"], #topButtonRow > input[name="save"], button[title="Save"]';

const getUrl = (orgId: string): SalesforceUrlPath => `/${orgId}/e?retURL=/${orgId}` as SalesforceUrlPath;

type AuthProviderConfig = {
  consumerSecret?: string;
  consumerKey?: string;
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
        const hasConsumerUpdates =
          authProviderConfig.consumerSecret !== undefined || authProviderConfig.consumerKey !== undefined;

        if (hasConsumerUpdates) {
          // Navigate to the edit page
          const editPageUrl = getUrl(authProviderId);

          this.browserforce.logger?.log(`Navigating to edit page for ${developerName}: ${editPageUrl}`);
          await using page = await this.browserforce.openPage(editPageUrl);

          // Update ConsumerSecret if provided
          if (authProviderConfig.consumerSecret !== undefined) {
            await page.locator(CONSUMER_SECRET_SELECTOR).fill(authProviderConfig.consumerSecret);
          }

          // Update ConsumerKey if provided
          if (authProviderConfig.consumerKey !== undefined) {
            await page.locator(CONSUMER_KEY_SELECTOR).fill(authProviderConfig.consumerKey);
          }

          // Save the changes
          const saveButtonLocator = page.locator(SAVE_BUTTON_SELECTOR);
          await saveButtonLocator.first().click();
          await Promise.race([
            page.waitForURL((url) => url.pathname === `/${authProviderId}`),
            waitForPageErrors(page),
          ]);
        }
      } catch (error) {
        throw new Error(`Failed to update AuthProvider '${developerName}': ${error.message}`);
      }
    }
  }
}
