import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const activitySettingsSchema = z
  .object({
    allowUsersToRelateMultipleContactsToTasksAndEvents: z
      .boolean()
      .meta({
        title: 'Allow Users to Relate Multiple Contacts to Tasks and Events',
      })
      .describe(
        'Although the Metadata API has a ActivitiesSettings.allowUsersToRelateMultipleContactsToTasksAndEvents field, it is not possible to enable this setting using an API. Warning: can only be disabled with help of the salesforce.com Support team. https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_activitiessettings.htm',
      )
      .optional(),
  })
  .meta({ id: 'activitySettings', title: 'Activity Settings' });

const BASE_PATH = '/setup/activitiesSetupPage.apexp';

const MANY_WHO_PREF_INPUT_SELECTOR = 'input[id="thePage:theForm:theBlock:manyWhoPref"]';
const SUBMIT_BUTTON_SELECTOR = 'input[id="thePage:theForm:theBlock:buttons:submit"]';

export type ActivitySettingsConfig = z.infer<typeof activitySettingsSchema>;

export class ActivitySettings extends BrowserforcePlugin {
  public async retrieve(): Promise<ActivitySettingsConfig> {
    await using page = await this.browserforce.openPage(BASE_PATH);
    const response = {
      allowUsersToRelateMultipleContactsToTasksAndEvents: await page.locator(MANY_WHO_PREF_INPUT_SELECTOR).isChecked(),
    };
    return response;
  }

  public async apply(config: ActivitySettingsConfig): Promise<void> {
    if (config.allowUsersToRelateMultipleContactsToTasksAndEvents === false) {
      throw new Error(
        '`allowUsersToRelateMultipleContactsToTasksAndEvents` can only be disabled with help of the salesforce.com Support team',
      );
    }
    await using page = await this.browserforce.openPage(BASE_PATH);
    await page.locator(MANY_WHO_PREF_INPUT_SELECTOR).waitFor();

    await page
      .locator(MANY_WHO_PREF_INPUT_SELECTOR)
      .setChecked(config.allowUsersToRelateMultipleContactsToTasksAndEvents);

    await page.locator(SUBMIT_BUTTON_SELECTOR).click();
    await page.waitForURL((url) => url.pathname === '/ui/setup/Setup');
  }
}
