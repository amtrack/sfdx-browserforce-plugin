import { BrowserforcePlugin } from '../../../plugin.js';

type AuthProviderRecord = {
  Id: string;
  DeveloperName: string;
};

export type Config = {
  services: Array<
    | { label: string; enabled: boolean }
    | { authProviderApiName: string; enabled: boolean }
  >;
};

const EDIT_VIEW_PATH = '/lightning/setup/OrgDomain/page?address=%2Fdomainname%2FEditLogin.apexp';

const SETUP_FORM_SELECTOR = 'form[id="BrandSetup:brandSetupForm"]';
const SERVICE_CHECKBOX_SELECTOR = 'input.authOption[type="checkbox"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":Save"]';

function authProviderIdMatchesCheckboxValue(authProviderId: string, checkboxValue: string | null): boolean {
  if (!checkboxValue) return false;
  // Support 15-char and 18-char Salesforce Id comparison
  const id15 = authProviderId.substring(0, 15);
  return authProviderId === checkboxValue || id15 === checkboxValue || authProviderId.includes(checkboxValue);
}

export class AuthenticationConfiguration extends BrowserforcePlugin {
  private async getAuthProviderIds(developerNames: string[]): Promise<Map<string, string>> {
    if (developerNames.length === 0) return new Map();
    const developerNamesList = developerNames.map((name) => `'${name}'`).join(',');
    const authProviders = await this.browserforce.connection.query<AuthProviderRecord>(
      `SELECT Id, DeveloperName FROM AuthProvider WHERE DeveloperName IN (${developerNamesList})`,
    );
    const map = new Map<string, string>();
    for (const record of authProviders.records) {
      map.set(record.DeveloperName, record.Id);
    }
    return map;
  }

  public async retrieve(definition: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, SETUP_FORM_SELECTOR);

    const authProviderApiNames = definition.services
      .filter((s): s is { authProviderApiName: string; enabled: boolean } => 'authProviderApiName' in s)
      .map((s) => s.authProviderApiName);
    const authProviderIdMap = await this.getAuthProviderIds(authProviderApiNames);

    const inputLocators = await frameOrPage.locator(SERVICE_CHECKBOX_SELECTOR).all();
    const allServices = await Promise.all(
      inputLocators.map(async (input) => {
        const id = await input.getAttribute('id');
        const value = await input.getAttribute('value');
        const labelLocator = frameOrPage.locator(`label[for="${id}"]`);
        const labelCount = await labelLocator.count();
        const label = labelCount > 0 ? (await labelLocator.textContent())!.trim() : id!;
        return {
          label,
          value,
          enabled: await input.isChecked(),
        };
      }),
    );

    const services = definition.services
      .map((definedService) => {
        if ('label' in definedService) {
          const service = allServices.find((s) => s.label === definedService.label);
          return service ? { label: service.label, enabled: service.enabled } : null;
        }
        const authProviderId = authProviderIdMap.get(definedService.authProviderApiName);
        if (!authProviderId) return null;
        const service = allServices.find((s) => authProviderIdMatchesCheckboxValue(authProviderId, s.value));
        return service
          ? { authProviderApiName: definedService.authProviderApiName, enabled: service.enabled }
          : null;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return { services };
  }

  public async apply(plan: Config): Promise<void> {
    await using page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, SETUP_FORM_SELECTOR);

    const authProviderApiNames = plan.services
      .filter((s): s is { authProviderApiName: string; enabled: boolean } => 'authProviderApiName' in s)
      .map((s) => s.authProviderApiName);
    const authProviderIdMap = await this.getAuthProviderIds(authProviderApiNames);

    for (const svc of plan.services) {
      const inputLocators = await frameOrPage.locator(SERVICE_CHECKBOX_SELECTOR).all();
      let checkboxId: string | null = null;

      if ('label' in svc) {
        for (const input of inputLocators) {
          const id = await input.getAttribute('id');
          const labelLocator = frameOrPage.locator(`label[for="${id}"]`);
          const labelCount = await labelLocator.count();
          if (labelCount > 0) {
            const labelText = (await labelLocator.textContent())!.trim();
            if (labelText === svc.label) {
              checkboxId = id;
              break;
            }
          }
        }
        if (!checkboxId) {
          throw new Error(`Authentication service "${svc.label}" not found`);
        }
      } else {
        const authProviderId = authProviderIdMap.get(svc.authProviderApiName);
        if (!authProviderId) {
          throw new Error(
            `AuthProvider with DeveloperName '${svc.authProviderApiName}' not found. ` +
              `Please verify the AuthProvider exists in your org.`,
          );
        }
        for (const input of inputLocators) {
          const id = await input.getAttribute('id');
          const value = await input.getAttribute('value');
          if (authProviderIdMatchesCheckboxValue(authProviderId, value)) {
            checkboxId = id;
            break;
          }
        }
        if (!checkboxId) {
          throw new Error(
            `Authentication service for AuthProvider '${svc.authProviderApiName}' not found. ` +
              `It may not be available in the Authentication Service configuration.`,
          );
        }
      }

      const selector = `[id="${checkboxId}"]`;
      const isChecked = await frameOrPage.locator(selector).isChecked();

      if (svc.enabled !== isChecked) {
        await frameOrPage.locator(selector).click();
      }
    }

    const inputLocators = await frameOrPage.locator(SERVICE_CHECKBOX_SELECTOR).all();
    const checkedStates = await Promise.all(inputLocators.map((input) => input.isChecked()));
    const anyChecked = checkedStates.some((checked) => checked);
    if (!anyChecked) {
      throw new Error('Change failed: "You must select at least one authentication service."');
    }
    await Promise.all([
      page.waitForResponse((resp) => new URL(resp.url()).pathname === '/domainname/DomainName.apexp'),
      frameOrPage.locator(SAVE_BUTTON_SELECTOR).first().click(),
    ]);
  }
}
