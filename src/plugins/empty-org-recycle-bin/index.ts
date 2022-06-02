import { BrowserforcePlugin } from '../../plugin';

const DELETE_EVENT_OBJECT = 'DeleteEvent';
const LIST_VIEW_ALL_DELETE_EVENTS = 'AllDeleteEvents';
const DELETE_EVENT_EMPTY_ALL_ACTION = 'DeleteEventEmptyAllAction';

const PATHS = {
  BASE: 'lightning/o/DeleteEvent/home'
};

const SELECTORS = {
  EMPTY_BUTTON: '.modal-container .modal-footer button.uiButton:last-of-type'
};

export class EmptyOrgRecycleBin extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    return { enabled: false };
  }

  public async apply(config: Config): Promise<void> {
    const deleteEventEmptyAllButtonSelector = `a.forceActionLink[title="${await this.determineDeleteEventEmptyAllActionLabel()}"]`;

    const page = await this.browserforce.openPage(PATHS.BASE);
    await page.waitForSelector(deleteEventEmptyAllButtonSelector);
    await page.click(deleteEventEmptyAllButtonSelector);
    await page.waitForSelector(SELECTORS.EMPTY_BUTTON);
    await page.click(SELECTORS.EMPTY_BUTTON);
  }

  private async determineDeleteEventEmptyAllActionLabel(): Promise<string> {
    const conn = this.org.getConnection();
    const deleteEventListViewsUrl = `${conn.instanceUrl}/services/data/v${conn.getApiVersion()}/ui-api/list-ui/${DELETE_EVENT_OBJECT}`;
    const deleteEventListViewsResponse = await conn.request(deleteEventListViewsUrl);
    const allDeleteEventsListView = deleteEventListViewsResponse['lists'].filter((value) => value.apiName == LIST_VIEW_ALL_DELETE_EVENTS)[0];
    const allDeleteEventsListViewId = allDeleteEventsListView['id'];
    const allDeleteEventsListViewActionsUrl = `${conn.instanceUrl}/services/data/v${conn.getApiVersion()}/ui-api/actions/list-view/${allDeleteEventsListViewId}`;
    const allDeleteEventsListViewActionsResponse = await conn.request(allDeleteEventsListViewActionsUrl);
    const deleteEventEmptyAllEventsAction = allDeleteEventsListViewActionsResponse['actions'][allDeleteEventsListViewId]['actions'].filter((value) => value.apiName == DELETE_EVENT_EMPTY_ALL_ACTION)[0];

    return deleteEventEmptyAllEventsAction.label;
  }
}
