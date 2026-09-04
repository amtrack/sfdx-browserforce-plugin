import { type Page } from 'playwright';

export async function waitForPageErrors(page: Page, timeout = 90_000): Promise<void> {
  const anyErrorsLocator = page.locator(`#error, #errorTitle, #errorDesc, #validationError, div.errorMsg`);
  await anyErrorsLocator.first().waitFor({ state: 'attached', timeout });
  const errorMessages = (await anyErrorsLocator.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (errorMessages.length === 1) {
    throw new Error(errorMessages[0]);
  } else if (errorMessages.length > 1) {
    throw new Error(errorMessages.join('\n'));
  }
}
