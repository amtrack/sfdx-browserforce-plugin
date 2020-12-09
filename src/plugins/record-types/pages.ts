export class RecordTypePage {
  private page;

  constructor(page) {
    this.page = page;
  }

  public async clickDeleteAction(recordTypeId: string): Promise<any> {
    const xpath = `//a[contains(@href, "setup/ui/recordtypedelete.jsp?id=${recordTypeId.slice(
      0,
      15
    )}")]`;
    await this.page.waitForXPath(xpath);
    const actionLinkHandles = await this.page.$x(xpath);
    if (actionLinkHandles.length !== 1) {
      throw new Error(
        `Could not find delete action for record type id: ${recordTypeId}`
      );
    }
    await Promise.all([
      this.page.waitForNavigation(),
      actionLinkHandles[0].click()
    ]);
    await this.page.waitForTimeout(3000);
    return new RecordTypeDeletePage(this.page);
  }
}

export class RecordTypeDeletePage {
  protected page;
  protected saveButton = 'input[name="save"]';

  constructor(page) {
    this.page = page;
  }

  async replace(newRecordTypeId?: string) {
    await this.throwOnMissingSaveButton();
    const NEW_VALUE_SELECTOR = 'select#p2';
    if (newRecordTypeId) {
      await this.page.waitForSelector(NEW_VALUE_SELECTOR);
      await this.page.select(NEW_VALUE_SELECTOR, newRecordTypeId.slice(0, 15));
    }
    await this.save();
  }

  async save() {
    await this.page.waitForSelector(this.saveButton);
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(this.saveButton)
    ]);
    await this.throwPageErrors();
  }

  async throwOnMissingSaveButton() {
    const saveButton = await this.page.$(this.saveButton);
    if (!saveButton) {
      const bodyHandle = await this.page.$('div.pbBody');
      if (bodyHandle) {
        const errorMsg = await this.page.evaluate(
          (div: HTMLDivElement) => div.textContent,
          bodyHandle
        );
        await bodyHandle.dispose();
        if (errorMsg && errorMsg.trim()) {
          throw new Error(errorMsg.trim());
        }
      }
    }
  }

  async throwPageErrors() {
    const errorHandle = await this.page.$(
      'div#validationError div.messageText'
    );
    if (errorHandle) {
      const errorMsg = await this.page.evaluate(
        (div: HTMLDivElement) => div.innerText,
        errorHandle
      );
      await errorHandle.dispose();
      if (errorMsg && errorMsg.trim()) {
        throw new Error(errorMsg.trim());
      }
    }
  }
}
