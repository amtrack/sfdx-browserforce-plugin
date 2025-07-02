import { BrowserforcePlugin } from '../../../plugin.js';

export type Config = {
  services: Array<{
    label: string;
    enabled: boolean;
  }>;
};

const EDIT_VIEW_PATH =
  'lightning/setup/OrgDomain/page?address=%2Fdomainname%2FEditLogin.apexp';

const SETUP_FORM_SELECTOR = 'form[id="BrandSetup:brandSetupForm"]';
const SERVICE_CHECKBOX_SELECTOR = 'input.authOption[type="checkbox"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":Save"]';

export class AuthenticationConfiguration extends BrowserforcePlugin {
  public async retrieve(definition: Config): Promise<Config> {
    const page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      SETUP_FORM_SELECTOR
    );
    await frameOrPage.waitForSelector(SERVICE_CHECKBOX_SELECTOR);

    const services = await frameOrPage.$$eval(
      SERVICE_CHECKBOX_SELECTOR,
      (inputs, definedServices) =>
        (inputs as HTMLInputElement[])
          .map((cb) => {
            const labelElement = document.querySelector(
              `label[for="${cb.id}"]`
            );
            const label = labelElement
              ? labelElement.textContent!.trim()
              : cb.id;
            return {
              label,
              enabled: cb.checked,
            };
          })
          .filter((service) =>
            definedServices.some(
              (definedService) => definedService.label === service.label
            )
          ),
      definition.services
    );

    await page.close();
    return { services };
  }

  public async apply(plan: Config): Promise<void> {
    const page = await this.browserforce.openPage(EDIT_VIEW_PATH);
    const frameOrPage = await this.browserforce.waitForSelectorInFrameOrPage(
      page,
      SETUP_FORM_SELECTOR
    );
    await frameOrPage.waitForSelector(SERVICE_CHECKBOX_SELECTOR);

    for (const svc of plan.services) {
      const checkboxId = (await frameOrPage.$$eval(
        SERVICE_CHECKBOX_SELECTOR,
        (inputs, serviceName) => {
          for (const inp of inputs as HTMLInputElement[]) {
            const labelElement = document.querySelector(
              `label[for="${inp.id}"]`
            );
            if (
              labelElement &&
              labelElement.textContent!.trim() === serviceName
            ) {
              return inp.id;
            }
          }
          return null;
        },
        svc.label
      )) as string | null;

      if (!checkboxId) {
        await page.close();
        throw new Error(`Authentication service "${svc.label}" not found`);
      }

      const checkboxLocator = frameOrPage.locator(`input[id="${checkboxId}"]`);
      const isChecked = await checkboxLocator
        .map((input) => input.checked)
        .wait();
      if (svc.enabled !== isChecked) {
        await checkboxLocator.click();
      }
    }

    const anyChecked = await frameOrPage.$$eval(
      SERVICE_CHECKBOX_SELECTOR,
      (inputs) => (inputs as HTMLInputElement[]).some((cb) => cb.checked)
    );
    if (!anyChecked) {
      await page.close();
      throw new Error(
        'Change failed: “You must select at least one authentication service.”'
      );
    }
    await Promise.all([
      frameOrPage.waitForNavigation(),
      frameOrPage.locator(SAVE_BUTTON_SELECTOR).click(),
    ]);
    await page.close();
  }
}
