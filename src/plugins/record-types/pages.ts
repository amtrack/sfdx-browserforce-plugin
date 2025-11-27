import { Page } from 'playwright';

export class RecordTypePage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  public async clickDeleteAction(
    recordTypeId: string
  ): Promise<RecordTypeDeletePage> {
    const xpath = `//a[contains(@href, "setup/ui/recordtypedelete.jsp?id=${recordTypeId.slice(
      0,
      15
    )}")]`;
    await this.page.locator(`xpath=${xpath}`).first().click();
    await this.page.waitForLoadState('networkidle');
    return new RecordTypeDeletePage(this.page);
  }
}

export class RecordTypeDeletePage {
  protected page;
  protected saveButton = 'input[name="save"]';

  constructor(page: Page) {
    this.page = page;
  }

  async replace(newRecordTypeId?: string): Promise<void> {
    await this.throwOnMissingSaveButton();
    const NEW_VALUE_SELECTOR = 'select#p2';
    if (newRecordTypeId) {
      await this.page
        .locator(NEW_VALUE_SELECTOR)
        .selectOption(newRecordTypeId.slice(0, 15));
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.locator(this.saveButton).click();
    await this.page.waitForLoadState('load');
    await this.throwPageErrors();
  }

  async throwOnMissingSaveButton(): Promise<void> {
    const saveButtonCount = await this.page.locator(this.saveButton).count();
    if (saveButtonCount === 0) {
      const bodyElement = this.page.locator('div.pbBody');
      if ((await bodyElement.count()) > 0) {
        const errorMsg = await bodyElement.textContent();
        if (errorMsg?.trim()) {
          throw new Error(errorMsg.trim());
        }
      }
    }
  }

  async throwPageErrors(): Promise<void> {
    const errorElement = this.page.locator(
      'div#validationError div.messageText'
    );
    if ((await errorElement.count()) > 0) {
      const errorMsg = await errorElement.innerText();
      if (errorMsg?.trim()) {
        throw new Error(errorMsg.trim());
      }
    }
  }
}
