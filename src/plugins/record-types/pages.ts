import { Page } from 'puppeteer';

export class RecordTypePage {
  private page;

  constructor(page: Page) {
    this.page = page;
  }

  public async clickDeleteAction(recordTypeId: string): Promise<RecordTypeDeletePage> {
    const xpath = `//a[contains(@href, "setup/ui/recordtypedelete.jsp?id=${recordTypeId.slice(0, 15)}")]`;
    await this.page.waitForXPath(xpath);
    const deleteLink = (await this.page.$x(xpath))[0];
    await Promise.all([this.page.waitForNavigation(), this.page.evaluate((e) => e.click(), deleteLink)]);
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
      await this.page.waitForSelector(NEW_VALUE_SELECTOR);
      await this.page.select(NEW_VALUE_SELECTOR, newRecordTypeId.slice(0, 15));
    }
    await this.save();
  }

  async save(): Promise<void> {
    await this.page.waitForSelector(this.saveButton);
    await Promise.all([this.page.waitForNavigation(), this.page.click(this.saveButton)]);
    await this.throwPageErrors();
  }

  async throwOnMissingSaveButton(): Promise<void> {
    const saveButton = await this.page.$(this.saveButton);
    if (!saveButton) {
      const bodyHandle = await this.page.$('div.pbBody');
      if (bodyHandle) {
        const errorMsg = await this.page.evaluate((div: HTMLDivElement) => div.textContent, bodyHandle);
        await bodyHandle.dispose();
        if (errorMsg?.trim()) {
          throw new Error(errorMsg.trim());
        }
      }
    }
  }

  async throwPageErrors(): Promise<void> {
    const errorHandle = await this.page.$('div#validationError div.messageText');
    if (errorHandle) {
      const errorMsg = await this.page.evaluate((div: HTMLDivElement) => div.innerText, errorHandle);
      await errorHandle.dispose();
      if (errorMsg?.trim()) {
        throw new Error(errorMsg.trim());
      }
    }
  }
}
