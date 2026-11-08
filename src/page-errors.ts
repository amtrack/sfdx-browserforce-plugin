import { type Page } from 'playwright';

const PAGE_ERRORS_SELECTOR = '#error, #errorTitle, #errorDesc, #validationError, div.errorMsg';

/**
 * Waits until the page shows a Salesforce error, then throws its text.
 */
export async function waitForPageErrors(page: Page, timeout = 90_000): Promise<void> {
  await page.locator(PAGE_ERRORS_SELECTOR).first().waitFor({ state: 'attached', timeout });
  await throwPageErrors(page);
}

/**
 * Throws the text of the Salesforce errors the page shows now, if any, without waiting.
 */
export async function throwPageErrors(page: Page): Promise<void> {
  const errorMessages = (await page.locator(PAGE_ERRORS_SELECTOR).allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (errorMessages.length > 0) {
    throw new Error(errorMessages.join('\n'));
  }
}
