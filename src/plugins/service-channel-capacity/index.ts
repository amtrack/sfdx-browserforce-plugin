import { BrowserforcePlugin } from '../../plugin';

const SELECTORS = {
  CAPACITY_MODEL: 'select[id$=":capacityModelSection:editCapacityModel"]',
  OWNER_CHANGE_CAPACITY: 'input[id$=":ownerChangeCapacityCheck"]',
  STATUS_FIELD: 'select[id$=":statusFieldSection:editCapacityModel"]',
  STATUS_CHANGE_CAPACITY: 'input[id$=":statusChangeCapacityCheck"]',
  VALUES_IN_PROGRESS: 'select[id$=":statusFieldValues:duelingListBox:backingList_s"]'
};

type Config = {
  serviceChannelDeveloperName: string;
  capacityModel: string;
  statusField?: string;
  valuesForInProgress?: string[];
  checkAgentCapacityOnReopenedWorkItems?: boolean;
  checkAgentCapacityOnReasignedWorkItems?: boolean;
};

export class ServiceChannelCapacity extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const conn = this.org.getConnection();

    // Query for the service channel
    const serviceChannelDeveloperName = definition!.serviceChannelDeveloperName;
    const serviceChannel = await conn.singleRecordQuery(`SELECT Id FROM ServiceChannel WHERE DeveloperName='${serviceChannelDeveloperName}'`);

    // Open the service channel setup page
    const page = await this.browserforce.openPage(`${serviceChannel.Id}/e`);

    // Retrieve the service channel config
    const capacityModel = await page.$eval(`${SELECTORS.CAPACITY_MODEL} > option[selected]`, el => el.textContent
    ) ?? "";

    if (capacityModel === "Status-based") {
      console.log('statusField');
      const statusField = await page.$eval(SELECTORS.STATUS_FIELD, el => el.textContent
      ) ?? "";
      console.log('valuesInProgress');
      const valuesForInProgress = await page.$$eval(SELECTORS.VALUES_IN_PROGRESS, (options) =>
        options.map((option) => option.textContent ?? '')
      );
      console.log('checkStatus');
      const checkAgentCapacityOnReopenedWorkItems = await page.$eval(SELECTORS.STATUS_CHANGE_CAPACITY, el => (el.getAttribute('checked') === "checked" ? true : false));
      console.log('checkOwner');
      const checkAgentCapacityOnReasignedWorkItems = await page.$eval(SELECTORS.OWNER_CHANGE_CAPACITY, el => (el.getAttribute('checked') === "checked" ? true : false));

      return { serviceChannelDeveloperName, capacityModel, statusField, valuesForInProgress, checkAgentCapacityOnReopenedWorkItems, checkAgentCapacityOnReasignedWorkItems, };
    }

    return { serviceChannelDeveloperName, capacityModel };
  }

  public async apply(config: Config): Promise<void> {
  }
}
