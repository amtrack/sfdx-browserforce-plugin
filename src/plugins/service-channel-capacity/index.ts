import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'lightning/setup/ServiceChannel'
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
    console.log(`${PATHS.BASE}/page?address=%2F${serviceChannel.Id}`);
    const page = await this.browserforce.openPage(`${PATHS.BASE}/page?address=%${serviceChannel.Id}`);

    // Retrieve the service channel config
    const capacityModel = await page.$eval('[id*="capacitySection:capacityModelSection"]', el => el.textContent
    ) ?? "";

    if (capacityModel === "Status-based") {
      const statusField = await page.$eval('[id*="capacitySection:statusFieldSection"]', el => el.textContent
      ) ?? "";
      const valuesForInProgress = await page.$$eval('[id*="capacitySection:statusFieldValuesSection"]', (options) =>
        options.map((option) => option.textContent ?? '')
      );
      const checkAgentCapacityOnReopenedWorkItems = await page.$eval('[id*="capacitySection:statusChangeCapacityCheck"]', el => (el.getAttribute('checked') === "checked" ? true : false));
      const checkAgentCapacityOnReasignedWorkItems = await page.$eval('[id*="capacitySection:ownerChangeCapacityCheck"]', el => (el.getAttribute('checked') === "checked" ? true : false));

      return { serviceChannelDeveloperName, capacityModel, statusField, valuesForInProgress, checkAgentCapacityOnReopenedWorkItems, checkAgentCapacityOnReasignedWorkItems, };
    }

    return { serviceChannelDeveloperName, capacityModel };
  }

  public async apply(config: Config): Promise<void> {
  }
}
