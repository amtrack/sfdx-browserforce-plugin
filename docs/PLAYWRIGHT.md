# Playwright Best Practices Guide

This guide provides best practices and patterns for writing Playwright-based plugins in the sfdx-browserforce-plugin project.

## Table of Contents

- [Core Principles](#core-principles)
- [Page Interaction Patterns](#page-interaction-patterns)
- [Waiting Strategies](#waiting-strategies)
- [Modal Handling](#modal-handling)
- [Error Handling](#error-handling)
- [Common Patterns](#common-patterns)
- [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
- [Debugging](#debugging)

## Core Principles

### 1. Always Wait for Elements Before Interacting

**✅ Good:**
```typescript
await page.locator(SELECTOR).waitFor();
await page.locator(SELECTOR).click();
```

**❌ Bad:**
```typescript
await page.locator(SELECTOR).click(); // May fail if element not ready
```

### 2. Close Pages After Use

Always close pages to prevent memory leaks and ensure clean state:

**✅ Good:**
```typescript
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  try {
    const result = await this.getData(page);
    return result;
  } finally {
    await page.close();
  }
}
```

**❌ Bad:**
```typescript
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  return await this.getData(page);
  // Page never closed!
}
```

### 3. Use waitForIdle for State Persistence

After making changes, use `waitForIdle()` to ensure the page has finished processing:

**✅ Good:**
```typescript
await checkbox.click();
await this.browserforce.waitForIdle(page);
await page.close();
```

**❌ Bad:**
```typescript
await checkbox.click();
await page.close(); // May close before changes are saved
```

## Page Interaction Patterns

### Clicking Elements

#### Standard Click
```typescript
const button = page.locator('button[name="save"]');
await button.waitFor({ state: 'visible' });
await button.click();
```

#### Force Click (when element is intercepted)
```typescript
// Use sparingly - only when standard click fails due to overlays
await page.locator(SELECTOR).click({ force: true });
```

#### Evaluate Click (for stubborn elements)
```typescript
// When Playwright's click doesn't work due to framework interference
await page.locator(SELECTOR).evaluate((el: HTMLElement) => el.click());
```

### Checkbox Interactions

#### Reading Checkbox State
```typescript
const isChecked = await page.locator(CHECKBOX_SELECTOR).isChecked();
```

#### Setting Checkbox State
```typescript
// Standard approach: Use Playwright's check method
await page.locator(CHECKBOX_SELECTOR).check();
// or
await page.locator(CHECKBOX_SELECTOR).uncheck();

// Alternative: Use evaluate for reliable state changes
await page.locator(CHECKBOX_SELECTOR).evaluate((el: HTMLInputElement) => {
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
```

### Input Fields

```typescript
// Clear and type
await page.locator(INPUT_SELECTOR).fill('new value');

// Or clear first, then type
await page.locator(INPUT_SELECTOR).clear();
await page.locator(INPUT_SELECTOR).type('new value');
```

## Waiting Strategies

### Wait for Element States

```typescript
// Wait for element to be attached to DOM
await page.locator(SELECTOR).waitFor({ state: 'attached' });

// Wait for element to be visible
await page.locator(SELECTOR).waitFor({ state: 'visible' });

// Wait for element to be hidden
await page.locator(SELECTOR).waitFor({ state: 'hidden' });
```

### Wait for Network Idle

```typescript
// After actions that trigger saves or API calls
await this.browserforce.waitForIdle(page);
```

### Wait for Custom Conditions

```typescript
// Wait for a specific condition to be true
await page.waitForFunction(
  ({ selector, expectedValue }) => {
    const element = document.querySelector(selector);
    return element && element.textContent === expectedValue;
  },
  { selector: MY_SELECTOR, expectedValue: 'Success' }
);
```

### ❌ Avoid waitForTimeout

**Don't use arbitrary timeouts:**
```typescript
// BAD - Flaky and slow
await page.waitForTimeout(2000);
await page.locator('button:has-text("Edit")').click();
```

**Instead, wait for specific conditions:**
```typescript
// GOOD - Fast and reliable
await page.locator('button:has-text("Save")').click();
await page.locator('button:has-text("Edit")').waitFor({ state: 'visible' });
```

## Modal Handling

### Pattern 1: Wait for Modal, Interact, Wait for Close

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

### Pattern 2: Conditional Modal Handling

```typescript
// Check if modal appears (optional confirmation)
const confirmButton = page.locator('lightning-modal lightning-button[variant="brand"]');
if (await confirmButton.isVisible()) {
  await confirmButton.waitFor({ state: 'visible' });
  await confirmButton.click();
}
```

### Pattern 3: Toast Messages

```typescript
// Wait for toast to appear
await page.locator(TOAST_MESSAGE).waitFor({ state: 'visible' });

// Wait for toast to disappear (indicates completion)
await page.locator(TOAST_MESSAGE).waitFor({ state: 'hidden' });
```

## Error Handling

### Always Check for Page Errors

```typescript
import { throwPageErrors } from '../../browserforce.js';

public async apply(config: Config): Promise<void> {
  const page = await this.browserforce.openPage(BASE_PATH);
  try {
    await this.makeChanges(page, config);
    await throwPageErrors(page); // Check for Salesforce errors
  } finally {
    await page.close();
  }
}
```

### Validate Element Existence

```typescript
const element = await page.locator(SELECTOR);
const count = await element.count();
if (count === 0) {
  throw new Error(`Element not found: ${SELECTOR}`);
}
```

## Common Patterns

### Pattern: Separate Page Object

Create a separate page class for complex interactions:

```typescript
// page.ts
export class MyFeaturePage {
  private page: Page;
  private browserforce: Browserforce;

  constructor(page: Page, browserforce: Browserforce) {
    this.page = page;
    this.browserforce = browserforce;
  }

  public static getUrl(): string {
    return 'lightning/setup/MyFeature/home';
  }

  public async getStatus(): Promise<boolean> {
    await this.page.locator(TOGGLE_SELECTOR).waitFor();
    const isEnabled = await this.page.locator(TOGGLE_SELECTOR).isChecked();
    await this.page.close();
    return isEnabled;
  }

  public async setStatus(enable: boolean): Promise<void> {
    await this.page.locator(TOGGLE_SELECTOR).waitFor();
    await this.page.locator(TOGGLE_SELECTOR).click();
    await throwPageErrors(this.page);
    await this.browserforce.waitForIdle(this.page);
    await this.page.close();
  }
}

// index.ts
export class MyFeature extends BrowserforcePlugin {
  public async retrieve(): Promise<Config> {
    const page = new MyFeaturePage(
      await this.browserforce.openPage(MyFeaturePage.getUrl()),
      this.browserforce
    );
    return { enabled: await page.getStatus() };
  }

  public async apply(config: Config): Promise<void> {
    const page = new MyFeaturePage(
      await this.browserforce.openPage(MyFeaturePage.getUrl()),
      this.browserforce
    );
    await page.setStatus(config.enabled);
  }
}
```

### Pattern: Parallel Waiting

Use `Promise.all()` for operations that can happen simultaneously:

```typescript
// Wait for both the toast to appear AND the action to complete
await Promise.all([
  page.locator(TOAST_MESSAGE).waitFor({ state: 'visible' }),
  page.locator(CHECKBOX).evaluate((el: HTMLInputElement) => el.click())
]);

// Then wait for toast to disappear
await page.locator(TOAST_MESSAGE).waitFor({ state: 'hidden' });
```

### Pattern: Handling Dynamic Selectors

```typescript
// When selectors change between Salesforce versions
const SELECTOR_V1 = 'lightning-datatable';
const SELECTOR_V2 = 'one-theme-datatable';

// Try both selectors
const element = await page.locator(`${SELECTOR_V1}, ${SELECTOR_V2}`).first();
await element.waitFor();
```

## Anti-Patterns to Avoid

### ❌ Don't Use Arbitrary Timeouts

```typescript
// BAD
await page.waitForTimeout(5000);

// GOOD
await page.locator('.loading-spinner').waitFor({ state: 'hidden' });
await this.browserforce.waitForIdle(page);
```

### ❌ Don't Forget to Close Pages

```typescript
// BAD
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  return { enabled: await page.locator(SELECTOR).isChecked() };
}

// GOOD
public async retrieve(): Promise<Config> {
  const page = await this.browserforce.openPage(BASE_PATH);
  const enabled = await page.locator(SELECTOR).isChecked();
  await page.close();
  return { enabled };
}
```

### ❌ Don't Ignore Errors

```typescript
// BAD
await page.locator(BUTTON).click();
await page.close();

// GOOD
await page.locator(BUTTON).click();
await throwPageErrors(page);
await this.browserforce.waitForIdle(page);
await page.close();
```

## Debugging

### Enable Browser Debug Mode

See the browser while tests run:

```bash
BROWSER_DEBUG=true npm run test:e2e -- --grep "YourPlugin"
```

### Slow Down Execution

Add delays between actions for observation:

```bash
BROWSER_SLOWMO=1000 npm run test:e2e -- --grep "YourPlugin"
```

### Enable Playwright Tracing

Capture detailed execution traces:

```bash
PLAYWRIGHT_TRACE=true npm run test:e2e -- --grep "YourPlugin"
```

Then view the trace:

```bash
npx playwright show-trace trace-2025-11-23T19-00-00-000Z.zip
```

### Add Console Logging

```typescript
console.log('Current URL:', page.url());
console.log('Element count:', await page.locator(SELECTOR).count());
```

### Take Screenshots

```typescript
await page.screenshot({ path: 'debug-screenshot.png' });
```