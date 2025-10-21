import {BrowserforcePlugin} from '../../plugin.js';

const BASE_PATH = '/apex/vlocity_cmt__CMTAdmin';

type Config = {
  enableStandardCartAPI: boolean;
};

type GetCustomSettingsResults = {
  result: {
    Id: string,
    Name: string,
    isEnabled: boolean,
    vlocity_cmt__SetupValue__c: 'false' | 'true',
    children: {
      isEnabled: boolean,
      features: {
        Id: string,
        Name: string,
        vlocity_cmt__SetupValue__c: 'false' | 'true',
      }[]
    }[]
  }[];
  hasError: boolean;
};

// Visualforce global type declarations for remoting
interface VisualforceRemotingManager {
  invokeAction(action: string, ...args: any[]): void;
}
interface VisualforceRemoting {
  Manager: VisualforceRemotingManager;
}
interface VisualforceType {
  remoting: VisualforceRemoting;
}
declare const Visualforce: VisualforceType;

export class StandardCartApi extends BrowserforcePlugin {
  private customSettings: GetCustomSettingsResults;

  public async retrieve(definition: Config): Promise<Config> {
    const page = await this.browserforce.openPage(BASE_PATH);

    this.customSettings = await page.evaluate(() => {
      return new Promise<GetCustomSettingsResults>((resolve, reject) => {
        Visualforce.remoting.Manager.invokeAction('vlocity_cmt.CMTAdminController.getCustomSettingsRecord', 'vlocity_cmt__VlocityFeature__c', '',
          (result: GetCustomSettingsResults, _event: any) => {
            // console.log(result, event);
            if (result.hasError) {
              reject(result);
            } else {
              resolve(result);
            }
          },
          {escape: false});
      });
    });

    return {
      enableStandardCartAPI: this.customSettings.result.find(r => r.Name === 'EnableCPQNext1B').isEnabled
    }
  }

  public async apply(config: Config): Promise<void> {
    const page = await this.browserforce.openPage(BASE_PATH);

    const enableCPQNext1B = this.customSettings.result.find(r => r.Name === 'EnableCPQNext1B');
    const customSettings = [
      {
        Id: enableCPQNext1B.Id,
        Name: enableCPQNext1B.Name,
        vlocity_cmt__SetupValue__c: config.enableStandardCartAPI + ''
      },
      ...enableCPQNext1B.children
        .flatMap((x) => x.features)
        .map(feature => ({
          Id: feature.Id,
          Name: feature.Name,
          vlocity_cmt__SetupValue__c: config.enableStandardCartAPI + ''
        }))
    ];

    const customSettingsJson = JSON.stringify(customSettings);

    await page.evaluate((customSettingsJson: string) => {
      return new Promise<any>((resolve, reject) => {
        Visualforce.remoting.Manager.invokeAction(
          'vlocity_cmt.CMTAdminController.saveCustomSettings', 'vlocity_cmt__VlocityFeature__c',
          customSettingsJson,
          function (result: any, _event: any) {
            resolve(result);
          },
          {escape: false});
      });
    }, customSettingsJson);
  }
}
