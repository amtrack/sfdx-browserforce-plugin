# Best Practices: Using Playwright for Browserforce

This guide provides best practices and patterns for writing Playwright-based plugins for the sfdx-browserforce-plugin project.

## Core Principles

### Automatically close pages with `await using`

Modern JavaScript has a [using keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/using) for declaring variable which automatically calls the `dispose()` or `asyncDispose()` symbol to free up resources.
We can use it to automatically close pages:

**✅ Good:**

```typescript
public async retrieve(): Promise<Config> {
  await async page = await this.browserforce.openPage(BASE_PATH);
  const result = await this.getData(page);
  return result;
}
```

**❌ Bad:**

```typescript
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  const result = await this.getData(page);
  return result;
  // Page is not closed
}
```

**❌ Bad:**

```typescript
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  const result = await this.getData(page);
  await page.close();
  return result;
  // Page is not closed when errors are thrown
}
```

### Prefer using the Locator API

> Locators are the central piece of Playwright's auto-waiting and retry-ability. In a nutshell, locators represent a way to find element(s) on the page at any moment.
>
> https://playwright.dev/docs/locators

Playwright Locators have a bunch of [methods](https://playwright.dev/docs/api/class-locator) to scrape and interact with the DOM.

Examples:

- `innerHTML()`, `innerText()`, `textContent()`
- `count()`
- `first()`, `nth(number)`, `last()`, `filter()`
- `isEnabled()`, `isVisible()`, `isEditable()`
- `click()`
- `isChecked()`, `check()`, `uncheck()`, `setChecked(boolean)`
- `selectOption()`
- `fill(string)`

### Use language-agnostic selectors if possible

A save button rendered in English

```html
<input value=" Save " class="btn" name="save" title="Save" type="submit" />
```

The same save button rendered in German

```html
<input value="Speichern" class="btn" name="save" title="Speichern" type="submit" />
```

**✅ Good:**

```typescript
const saveButton = page.locator('input[type="submit"][name="save"]');
```

**❌ Bad:**

```typescript
const saveButton = page.locator('input[type="submit"][title="Save"]');
```

### Avoid `waitForTimeout()` and `waitForLoadState()`

There should always be a better indicator than those two.
For example: There might be a specific network response, URL or locator visible/hidden to indicate the page is ready or the action has been completed.

> Never wait for timeout in production.
>
> --- [Playwright Docs](https://playwright.dev/docs/api/class-page#page-wait-for-timeout)

and

> Most of the time, this method is not needed because Playwright auto-waits before every action.
>
> --- [Playwright Docs](https://playwright.dev/docs/api/class-frame#frame-wait-for-load-state)

### Avoid `evaluate()`

Prefer using specific Locator methods over `evaluate()`.
Please see the examples above.

## Types of Salesforce Setup Pages

There are three different kinds of setup pages in Salesforce:

- **Classic UI**: simple to implement
- **Lightning Experience with a Classic UI page in an `<iframe>`**: annoying - please see our helper `waitForSelectorInFrameOrPage()`
- **Lightning Experience only setup pages**: SPA - difficult with certain Lightning Components

## Patterns

### Saving Pages

Browserforce is all about automating changes in the Setup.
At the end, there is most likely a "Save" button to be clicked.

While the following code might seem tempting, please don't do it.

**❌ Bad:**

```typescript
await saveButton.click();
if (await page.locator('#error').count()) {
  throw new Error('failed');
}
await page.waitForLoadState('networkidle');
```

Problems:

- The element with the selector `#error` might show up delayed and the error might not be catched
- If the page does not reload/redirect (in case of an uncaught error) `await page.waitForLoadState("networkidle")` is resolved although we expected a redirect and waiting for the new page to have loaded

The most reliable way (although difficult to understand) is the following:

```typescript
await Promise.all([Promise.race([waitForPageErrors(), page.waitForEvent('load')]), saveButton.click()]);
```

This starts both promises to wait for the after-save indicators (success and failure) **before** clicking on the save button.
The first of the two promises (success or failure) will be resolved/rejected.

If the success indicator is not a time-critical one-off event but something that is persistent, it is easier:

```typescript
await saveButton.click();
await Promise.race([waitForPageErrors(), page.waitForURL((url) => url.pathname === '/aftersaveurl')]);
```

### Saving Pages in Salesforce Classic UI

Most Salesforce Classic pages show error messages on the same page and perform a page redirect to another Classic UI page after a successful save.

The most simple way is to wait for the success page URL as shown above.

However, if there is no specific success page, the page might eventually open the Lightning Experience setup home page with multiple redirects on the way.
This is suboptimal for our scenario.

> ![TIP] If there is no deterministic after-save URL, it is sometimes possible to set it using the `retURL` URL parameter.

### Saving Pages in Salesforce Lightning Experience

Many new Lightning-only Setup Pages are Single Page Applications (SPAs).

- there is no page reload or redirect after save
- it is difficult to determine a success or failure indicator

> ![TIP] Please use the Developer Tools of your web browser to inspect network traffic.
>
> Sometimes it's possible to wait for responses like `page.waitForResponse(/LinkedInIntegrationSetup.updatePref=1/)`.

### Waiting for Custom Conditions

```typescript
// Wait for a specific condition to be true
await page.waitForFunction(
  ({ selector, expectedValue }) => {
    const element = document.querySelector(selector);
    return element && element.textContent === expectedValue;
  },
  { selector: MY_SELECTOR, expectedValue: 'Success' },
);
```

### Modal Handling

Wait for Modal, Interact, Wait for Close

```typescript
// Click button that opens modal
await page.locator(OPEN_MODAL_BUTTON).click();
// Wait for modal to appear
await page.locator('.slds-modal__container').waitFor({ state: 'visible' });
// Interact with modal content
await page.locator(MODAL_CHECKBOX).click();
await page.locator(MODAL_CONFIRM_BUTTON).click();
// Wait for modal to close
await page.locator('.slds-modal__container').waitFor({ state: 'hidden' });
```

Conditional Modal Handling

```typescript
// Check if modal appears (optional confirmation)
const confirmButton = page.locator('lightning-modal lightning-button[variant="brand"]');
if (await confirmButton.isVisible()) {
  await confirmButton.waitFor({ state: 'visible' });
  await confirmButton.click();
}
```

### Toast Messages

```typescript
const toastMessage = page.locator(TOAST_MESSAGE);
// Wait for toast to appear
await toastMessage.waitFor({ state: 'visible' });
// Wait for toast to disappear (indicates completion)
await toastMessage.waitFor({ state: 'hidden' });
```

### Handling Dynamic Selectors

```typescript
// When selectors change between Salesforce versions
const SELECTOR_V1 = 'lightning-datatable';
const SELECTOR_V2 = 'one-theme-datatable';

// Try both selectors
const element = await page.locator(`${SELECTOR_V1}, ${SELECTOR_V2}`).first();
await element.waitFor();
```

### Page Object Model (POM)

When things get more complex, like a wizard of multiple pages,
create separate page classes and orchestrate them.

Example:

- ![src/plugins/opportunity-splits/index.ts](../src/plugins/opportunity-splits/index.ts)
- ![src/plugins/opportunity-splits/pages/overview.ts](../src/plugins/opportunity-splits/pages/overview.ts)
- ![src/plugins/opportunity-splits/pages/setup.ts](../src/plugins/opportunity-splits/pages/setup.ts)
- ![src/plugins/opportunity-splits/pages/layout-selection.ts](../src/plugins/opportunity-splits/pages/layout-selection.ts)

## Debugging

For general debugging and tracing documentation, please see the [CONTRIBUTING](../CONTRIBUTING.md) guide.
Programmatically you can either add console logging

```typescript
console.log('URL before save:', page.url());
await page.locator(SAVE_BUTTON).click();
await page.waitForTimeout(3_000);
console.log('URL after save:', page.url());
```

or take screenhots

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```
