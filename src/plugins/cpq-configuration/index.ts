import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE:'0A3?setupid=ImportedPackage&retURL=%2Fui%2Fsetup%2FSetup%3Fsetupid%3DStudio'
};
const SELECTORS = {
  CONFIGURE: '.actionLink[title*="Configure"][title*="Salesforce CPQ"]',
  HIDE_DOCUMENT_NAME: 'input[id="page:form:pb:j_id58:j_id70"]',
  FULL_PAGE_PREVIEW: 'input[id="page:form:pb:j_id58:j_id74"]',
  EXCLUDE_HIDDEN_LINES: 'input[id="page:form:pb:j_id58:j_id76"]',
  POST_TO_FEED: 'input[name="page:form:pb:j_id58:j_id71:j_id73"]',
  ENABLE_MULTI_LANGUAGE_TRANSLATION: 'input[id="page:form:pb:j_id58:j_id75"]',
  SAVE: 'input[value="Save"]'
};

type Config = {
  enableHideDocumentName: boolean;
  enableFullPagePreview: boolean;
  enableExcludeHiddenLinesInGroupTotals: boolean;
  enablePostToFeed: boolean;
  enableMultiLanguageTranslations: boolean;
};

export class CpqConfiguration extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);

    // default response
    const response = {
      enableHideDocumentName : false,
      enableFullPagePreview : false,
      enableExcludeHiddenLinesInGroupTotals : false,
      enablePostToFeed : false,
      enableMultiLanguageTranslations : false
    };

    const hideDocumentCheckbox = await page.$(SELECTORS.HIDE_DOCUMENT_NAME);
    if (hideDocumentCheckbox) {
      response.enableHideDocumentName = await page.$eval(
        SELECTORS.HIDE_DOCUMENT_NAME,
        (el: HTMLInputElement) => el.checked
      );
    }

    const fullPagePreviewCheckbox = await page.$(SELECTORS.FULL_PAGE_PREVIEW);
    if (fullPagePreviewCheckbox) {
      response.enableFullPagePreview = await page.$eval(
        SELECTORS.FULL_PAGE_PREVIEW,
        (el: HTMLInputElement) => el.checked
      );
    }

    const excludeHiddenLinesCheckbox = await page.$(SELECTORS.EXCLUDE_HIDDEN_LINES);
    if (excludeHiddenLinesCheckbox) {
      response.enableExcludeHiddenLinesInGroupTotals = await page.$eval(
        SELECTORS.EXCLUDE_HIDDEN_LINES,
        (el: HTMLInputElement) => el.checked
      );
    }

    const postToFeedCheckbox = await page.$(SELECTORS.POST_TO_FEED);
    if (postToFeedCheckbox) {
      response.enablePostToFeed = await page.$eval(
        SELECTORS.POST_TO_FEED,
        (el: HTMLInputElement) => el.checked
      );
    }

    const enableMultiLanguageTranslationsCheckbox = await page.$(SELECTORS.ENABLE_MULTI_LANGUAGE_TRANSLATION);
    if (enableMultiLanguageTranslationsCheckbox) {
      response.enableMultiLanguageTranslations = await page.$eval(
        SELECTORS.ENABLE_MULTI_LANGUAGE_TRANSLATION,
        (el: HTMLInputElement) => el.checked
      );
    }

    await page.close();
    return response;
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await Promise.all([page.waitForNavigation(), page.click(SELECTORS.CONFIGURE)]);

    await page.$eval(
      SELECTORS.HIDE_DOCUMENT_NAME,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableHideDocumentName
    );

    await page.$eval(
      SELECTORS.FULL_PAGE_PREVIEW,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableFullPagePreview
    );

    await page.$eval(
      SELECTORS.EXCLUDE_HIDDEN_LINES,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableExcludeHiddenLinesInGroupTotals
    );

    await page.$eval(
      SELECTORS.POST_TO_FEED,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enablePostToFeed
    );

    await page.$eval(
      SELECTORS.ENABLE_MULTI_LANGUAGE_TRANSLATION,
      (e: HTMLInputElement, v: boolean) => {
        e.checked = v;
      },
      config.enableMultiLanguageTranslations
    );

    await Promise.all([page.click(SELECTORS.SAVE)]);
    await page.close();
  }
}
