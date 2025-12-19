import { BrowserforcePlugin } from '../../plugin.js';
import { UserAccessPoliciesPage } from './page.js';

export type PolicyTriggerType = 'Create' | 'Update' | 'CreateAndUpdate';

const DEFAULT_TRIGGER_TYPE: PolicyTriggerType = 'CreateAndUpdate';

type AccessPolicy = {
  apiName: string;
  active: boolean;
  on?: PolicyTriggerType;
};

export type Config = {
  accessPolicies?: AccessPolicy[];
};

export class UserAccessPolicies extends BrowserforcePlugin {
  private async queryPolicies(policyApiNames: string[]): Promise<{
    policyStateMap: Map<string, boolean>;
    policyIdMap: Map<string, string>;
    policyTriggerTypeMap: Map<string, string | null>;
  }> {
    const quotedNames = policyApiNames.map((name) => `'${name}'`);
    const query = `SELECT Id, DeveloperName, Status, TriggerType FROM UserAccessPolicy WHERE DeveloperName IN (${quotedNames.join(
      ','
    )})`;

    const queryResult = await this.org.getConnection().tooling.query(query);

    const policyStateMap = new Map<string, boolean>();
    const policyIdMap = new Map<string, string>();
    const policyTriggerTypeMap = new Map<string, string | null>();

    for (const record of queryResult.records as Array<{
      Id: string;
      DeveloperName: string;
      Status: string;
      TriggerType: string | null;
    }>) {
      policyStateMap.set(record.DeveloperName, record.Status === 'Active');
      policyIdMap.set(record.DeveloperName, record.Id);
      policyTriggerTypeMap.set(record.DeveloperName, record.TriggerType);
    }

    return { policyStateMap, policyIdMap, policyTriggerTypeMap };
  }

  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {
      accessPolicies: [],
    };

    if (!definition?.accessPolicies || definition.accessPolicies.length === 0) {
      return response;
    }

    const policyApiNames = definition.accessPolicies.map(
      (policy) => policy.apiName
    );
    const { policyStateMap, policyTriggerTypeMap } = await this.queryPolicies(
      policyApiNames
    );

    for (const policy of definition.accessPolicies) {
      const isActive = policyStateMap.get(policy.apiName) ?? false;
      const triggerType = policyTriggerTypeMap.get(policy.apiName);

      const retrievedPolicy: AccessPolicy = {
        apiName: policy.apiName,
        active: isActive,
      };

      if (policy.on !== undefined && isActive && triggerType) {
        if (this.isValidTriggerType(triggerType)) {
          retrievedPolicy.on = triggerType;
        }
      }

      response.accessPolicies!.push(retrievedPolicy);
    }

    return response;
  }

  public async apply(config: Config): Promise<void> {
    if (!config.accessPolicies || config.accessPolicies.length === 0) {
      return;
    }

    const policyApiNames = config.accessPolicies.map(
      (policy) => policy.apiName
    );
    const { policyStateMap, policyIdMap, policyTriggerTypeMap } =
      await this.queryPolicies(policyApiNames);

    for (const policy of config.accessPolicies) {
      const currentState = policyStateMap.get(policy.apiName) ?? false;
      const policyId = policyIdMap.get(policy.apiName);
      const currentTriggerType = policyTriggerTypeMap.get(policy.apiName);

      if (!policyId) {
        throw new Error(`User Access Policy "${policy.apiName}" not found`);
      }

      await this.applyPolicyChange(
        policy,
        policyId,
        currentState,
        currentTriggerType
      );
    }
  }

  private isValidTriggerType(
    value: string | null | undefined
  ): value is PolicyTriggerType {
    return (
      value === 'Create' || value === 'Update' || value === 'CreateAndUpdate'
    );
  }

  private needsPolicyChange(
    policy: AccessPolicy,
    currentState: boolean,
    currentTriggerType: string | null | undefined
  ): boolean {
    if (currentState !== policy.active) {
      return true;
    }

    if (!policy.active) {
      return false;
    }

    if (policy.on && currentTriggerType) {
      return currentTriggerType !== policy.on;
    }

    return false;
  }

  private async applyPolicyChange(
    policy: AccessPolicy,
    policyId: string,
    currentState: boolean,
    currentTriggerType: string | null | undefined
  ): Promise<void> {
    const needsChange = this.needsPolicyChange(
      policy,
      currentState,
      currentTriggerType
    );

    if (!needsChange) {
      return;
    }

    const page = await this.browserforce.openPage(
      UserAccessPoliciesPage.getPolicyUrl(policyId)
    );
    const policiesPage = new UserAccessPoliciesPage(page);

    if (policy.active) {
      const needsTriggerTypeChange =
        currentState && policy.on && currentTriggerType !== policy.on;

      if (needsTriggerTypeChange) {
        await policiesPage.deactivatePolicy();
        await page.close();

        const newPage = await this.browserforce.openPage(
          UserAccessPoliciesPage.getPolicyUrl(policyId)
        );
        const newPoliciesPage = new UserAccessPoliciesPage(newPage);

        await newPoliciesPage.activatePolicy(policy.on);
        await newPage.close();
      } else {
        const triggerOn: PolicyTriggerType =
          policy.on ||
          (this.isValidTriggerType(currentTriggerType)
            ? currentTriggerType
            : DEFAULT_TRIGGER_TYPE);

        await policiesPage.activatePolicy(triggerOn);
        await page.close();
      }
    } else {
      await policiesPage.deactivatePolicy();
      await page.close();
    }
  }
}
