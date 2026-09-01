import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const emailDeliverabilitySchema = z
  .object({
    accessLevel: z
      .enum(['No access', 'System email only', 'All email'])
      .meta({ title: 'Access Level' })
      .describe('Choose the email Deliverability Access Level required')
      .optional(),
  })
  .meta({ id: 'emailDeliverability', title: 'Email Deliverability Settings' });

const BASE_PATH = '/email-admin/editOrgEmailSettings.apexp';

const ACCESS_LEVEL_SELECTOR = 'select[id$=":sendEmailAccessControlSelect"]';
const CONFIRM_MESSAGE_SELECTOR = 'span[id$=":successText"]';
const SAVE_BUTTON_SELECTOR = 'input[id$=":saveBtn"]';

const ACCESS_LEVEL_VALUES = new Map([
  ['No access', '0'],
  ['System email only', '1'],
  ['All email', '2'],
]);

export type EmailDeliverabilityConfig = z.infer<typeof emailDeliverabilitySchema>;

export class EmailDeliverability extends BrowserforcePlugin {
  public async retrieve(definition?: EmailDeliverabilityConfig): Promise<EmailDeliverabilityConfig> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const selectedOption = await page.locator(`${ACCESS_LEVEL_SELECTOR} > option[selected]`).textContent();
    if (!selectedOption) {
      throw new Error('Selected access level not found...');
    }
    return {
      accessLevel: selectedOption as EmailDeliverabilityConfig['accessLevel'],
    };
  }

  public async apply(config: EmailDeliverabilityConfig): Promise<void> {
    const accessLevelNumber = config.accessLevel ? ACCESS_LEVEL_VALUES.get(config.accessLevel) : undefined;
    if (accessLevelNumber === undefined) {
      throw new Error(`Invalid email access level ${config.accessLevel}`);
    }
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(ACCESS_LEVEL_SELECTOR).selectOption(accessLevelNumber);
    await page.locator(SAVE_BUTTON_SELECTOR).click();
    await page.locator(CONFIRM_MESSAGE_SELECTOR).waitFor();
  }
}
