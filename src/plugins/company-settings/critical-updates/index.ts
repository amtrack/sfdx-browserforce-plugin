import * as jsonMergePatch from 'json-merge-patch';
import * as multimatch from 'multimatch';
import { BrowserforcePlugin } from '../../../plugin';

const PATHS = {
  BASE: 'ruac/ruacPage.apexp',
  REVIEW: '/ruac/CriticalUpdateDetail.apexp?name=',
  ACTIVATE: '/ruac/CriticalUpdateActivate.apexp?name=',
  DEACTIVATE: '/ruac/CriticalUpdateDeactivate.apexp?name='
};
const SELECTORS = {
  TABLE_BODY: 'tbody[id$=":featuresTable:tb"]',
  TABLE_ROWS: 'tbody[id$=":featuresTable:tb"] > tr',
  ROW_NAME_COLUMN: 'td:nth-child(2)',
  ROW_ACTIVATE_ACTION: `td:first-child a[href*="${PATHS.ACTIVATE}"]`,
  ROW_DEACTIVATE_ACTION: `td:first-child a[href*="${PATHS.DEACTIVATE}"]`,
  FORM_COMMENT: 'textarea[id$=":comment"]',
  FORM_ACTIVATE_BUTTON: 'input[id$=":activate"]',
  FORM_DEACTIVATE_BUTTON: 'input[id$=":deactivate"]'
};

export default class CriticalUpdates extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitFor(SELECTORS.TABLE_BODY);
    const response = [];
    const rowHandles = await page.$$(SELECTORS.TABLE_ROWS);
    for (const rowHandle of rowHandles) {
      const name = await rowHandle.$eval(
        SELECTORS.ROW_NAME_COLUMN,
        (td: HTMLTableDataCellElement) => td.textContent
      );
      const rowDeactivateActionHandle = await rowHandle.$(
        SELECTORS.ROW_DEACTIVATE_ACTION
      );
      const rowActivateActionHandle = await rowHandle.$(
        SELECTORS.ROW_ACTIVATE_ACTION
      );
      // return only actionable items
      if (rowDeactivateActionHandle || rowActivateActionHandle) {
        response.push({
          name,
          active:
            rowDeactivateActionHandle !== null ||
            rowActivateActionHandle === null
        });
      }
    }
    return response;
  }

  public diff(state, definition) {
    const response = [];
    for (const stateItem of state) {
      const targetMatch = definition.find(
        item =>
          multimatch(
            [stateItem.name],
            Array.isArray(item.name) ? item.name : [item.name]
          ).length > 0
      );
      if (targetMatch) {
        const newDefinition = Object.assign({}, targetMatch);
        // replace the pattern by the real name
        newDefinition.name = stateItem.name;
        // copy comment to state for diffing
        stateItem['comment'] = newDefinition.comment;
        const diff = jsonMergePatch.generate(stateItem, newDefinition);
        if (diff) {
          response.push(newDefinition);
        }
      }
    }
    return response;
  }

  public async apply(config) {
    for (const update of config) {
      const url = `${
        update.active ? PATHS.ACTIVATE : PATHS.DEACTIVATE
      }${encodeURI(update.name)}`;
      const page = await this.browserforce.openPage(url);
      const buttonSelector = update.active
        ? SELECTORS.FORM_ACTIVATE_BUTTON
        : SELECTORS.FORM_DEACTIVATE_BUTTON;
      await page.waitFor(buttonSelector);
      const isDisabled = await page.$eval(
        buttonSelector,
        button => button.disabled
      );
      if (isDisabled) {
        // TODO: use this.logger.warn once plugins have loggers
        console.warn(
          `Warning: Critical Update '${update.name}' cannot be set to ${
            update.active
          }`
        );
        continue;
      } else {
        await page.waitFor(SELECTORS.FORM_COMMENT);
        if (update.comment) {
          await page.type(SELECTORS.FORM_COMMENT, update.comment);
        }
        await Promise.all([
          page.waitFor(SELECTORS.TABLE_BODY),
          page.click(buttonSelector)
        ]);
      }
    }
  }
}
