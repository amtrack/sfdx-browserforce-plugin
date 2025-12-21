import { BrowserforcePlugin } from '../../../plugin.js';

export type Config = {
  services: Array<{
    label: string;
    enabled: boolean;
  }>;
};

const EDIT_VIEW_PATH = '/lightning/setup/OrgDomain/page?address=%2Fdomainname%2FEditLogin.apexp';

const SETUP_FORM_SELECTOR = 'form[id="BrandSetup:brandSetupForm"]';
const SERVICE_CHECKBOX_SELECTOR = 'input.authOption[type="checkbox"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":Save"]';

export class AuthenticationConfiguration extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    await using page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, SETUP_FORM_SELECTOR);

    const inputLocators = await frameOrPage.locator(SERVICE_CHECKBOX_SELECTOR).all();
    const allServices = await Promise.all(
      inputLocators.map(async (input) => {
        const id = await input.getAttribute('id');
        const labelLocator = frameOrPage.locator(`label[for="${id}"]`);
        const labelCount = await labelLocator.count();
        const label = labelCount > 0 ? (await labelLocator.textContent())!.trim() : id!;
        return {
          label,
          enabled: await input.isChecked(),
        };
      }),
    );
    const services = allServices.filter((service) =>
      definition.services.some((definedService) => definedService.label === service.label),
    );

    return { services };
  }

  public async apply(plan: Config): Promise<void> {
    await using page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(page, SETUP_FORM_SELECTOR);

    for (const svc of plan.services) {
      const inputLocators = await frameOrPage.locator(SERVICE_CHECKBOX_SELECTOR).all();
      let checkboxId: string | null = null;
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
