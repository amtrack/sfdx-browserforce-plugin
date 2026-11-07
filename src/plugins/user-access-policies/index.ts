import { setTimeout as sleep } from 'node:timers/promises';
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { UserAccessPoliciesPage } from './page.js';

const accessPolicySchema = z
  .object({
    apiName: z.string().describe("The API name of the user access policy (e.g., 'Grant_Permissions')"),
    active: z
      .boolean()
      .describe(
        'Whether the policy should be active (true) or inactive (false). Leave it out to keep the current status of the policy.',
      )
      .optional(),
    on: z
      .enum(['Create', 'Update', 'CreateAndUpdate'])
      .describe(
        "Optional: specify when to apply the policy - 'Create', 'Update', or 'CreateAndUpdate'. Only used when active is true.",
      )
      .optional(),
    applyToAll: z
      .boolean()
      .meta({
        title: 'Apply To All',
        'x-irreversible': true,
      })
      .describe(
        'Run Apply To All once the policy is set: assigns its access to every user matching its criteria. Runs Apply To All at each apply: Salesforce keeps no state that tells it already ran. A run cannot be undone.',
      )
      .optional(),
  })
  .meta({ id: 'accessPolicy' });

export const userAccessPoliciesSchema = z
  .object({
    accessPolicies: z
      .array(accessPolicySchema)
      .default([])
      .meta({
        title: 'Access Policies',
      })
      .describe('List of user access policies to activate, deactivate or apply to all users'),
  })
  .meta({
    id: 'userAccessPolicies',
    title: 'User Access Policies',
    examples: [
      { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create' }] },
      { accessPolicies: [{ apiName: 'Grant_Permissions', active: true, on: 'Create', applyToAll: true }] },
      { accessPolicies: [{ apiName: 'Grant_Permissions', applyToAll: true }] },
    ],
    'x-prerequisites': ['User Access Policies enabled (User Management Settings)'],
  });

type PolicyTriggerType = 'Create' | 'Update' | 'CreateAndUpdate';

const DEFAULT_TRIGGER_TYPE: PolicyTriggerType = 'CreateAndUpdate';

// Salesforce writes a UserAccessChange row once Apply To All has run for the users
const APPLY_TO_ALL_POLL_INTERVAL_MS = 10_000;
const APPLY_TO_ALL_TIMEOUT_MINUTES = 2;

type AccessPolicy = z.infer<typeof accessPolicySchema>;

type PolicyRecord = {
  Id: string;
  DeveloperName: string;
  Status: string;
  TriggerType: string | null;
};

export type UserAccessPoliciesConfig = z.infer<typeof userAccessPoliciesSchema>;

export class UserAccessPolicies extends BrowserforcePlugin {
  public async retrieve(definition?: UserAccessPoliciesConfig): Promise<UserAccessPoliciesConfig> {
    const response: UserAccessPoliciesConfig = {
      accessPolicies: [],
    };

    if (!definition?.accessPolicies || definition.accessPolicies.length === 0) {
      return response;
    }

    const policyRecords = await this.queryPolicies(definition.accessPolicies.map((policy) => policy.apiName));

    for (const policy of definition.accessPolicies) {
      response.accessPolicies.push(this.retrievePolicy(policy, policyRecords.get(policy.apiName)));
    }

    return response;
  }

  /**
   * Compares only what each policy asks for:
   * - its status (active, on) only when active is set,
   * - Apply To All every time it is true: Salesforce keeps no state that tells it already ran.
   *   false never produces a change: a run cannot be undone.
   * @returns undefined when there is no change
   */
  public diff(
    state: UserAccessPoliciesConfig | undefined,
    definition: UserAccessPoliciesConfig | undefined,
  ): UserAccessPoliciesConfig | undefined {
    const changes: AccessPolicy[] = [];
    for (const desired of definition?.accessPolicies ?? []) {
      const current = state?.accessPolicies?.find((policy) => policy.apiName === desired.apiName);
      const change: AccessPolicy = { apiName: desired.apiName };
      if (this.needsStatusChange(desired, current)) {
        change.active = desired.active;
        if (desired.on !== undefined) {
          change.on = desired.on;
        }
      }
      if (desired.applyToAll === true && current?.applyToAll !== true) {
        change.applyToAll = true;
      }
      if (Object.keys(change).length > 1) {
        changes.push(change);
      }
    }
    return changes.length > 0 ? { accessPolicies: changes } : undefined;
  }

  public async apply(config: UserAccessPoliciesConfig): Promise<void> {
    if (!config.accessPolicies || config.accessPolicies.length === 0) {
      return;
    }

    const policyRecords = await this.queryPolicies(config.accessPolicies.map((policy) => policy.apiName));

    for (const policy of config.accessPolicies) {
      const record = policyRecords.get(policy.apiName);

      if (!record) {
        throw new Error(`User Access Policy "${policy.apiName}" not found`);
      }

      if (policy.active !== undefined) {
        await this.applyPolicyChange(policy, record);
      }

      if (policy.applyToAll === true) {
        await this.applyToAllUsers(policy.apiName, record.Id);
      }
    }
  }

  private async queryPolicies(policyApiNames: string[]): Promise<Map<string, PolicyRecord>> {
    const quotedNames = policyApiNames.map((name) => `'${name}'`);
    const query = `SELECT Id, DeveloperName, Status, TriggerType FROM UserAccessPolicy WHERE DeveloperName IN (${quotedNames.join(
      ',',
    )})`;

    const queryResult = await this.browserforce.connection.tooling.query<PolicyRecord>(query);

    return new Map(queryResult.records.map((record) => [record.DeveloperName, record]));
  }

  private retrievePolicy(policy: AccessPolicy, record: PolicyRecord | undefined): AccessPolicy {
    const retrievedPolicy: AccessPolicy = {
      apiName: policy.apiName,
    };

    if (policy.active !== undefined) {
      const isActive = record?.Status === 'Active';
      retrievedPolicy.active = isActive;

      if (policy.on !== undefined && isActive && this.isValidTriggerType(record?.TriggerType)) {
        retrievedPolicy.on = record.TriggerType;
      }
    }

    // applyToAll is left out: Apply To All is an action, not a state, so diff() plans it at each apply

    return retrievedPolicy;
  }

  private needsStatusChange(desired: AccessPolicy, current: AccessPolicy | undefined): boolean {
    if (desired.active === undefined) {
      return false;
    }
    if (current?.active !== desired.active) {
      return true;
    }
    return desired.active && desired.on !== undefined && current.on !== desired.on;
  }

  private async applyPolicyChange(policy: AccessPolicy, record: PolicyRecord): Promise<void> {
    const currentState = record.Status === 'Active';
    const currentTriggerType = record.TriggerType;

    if (!this.needsPolicyChange(policy, currentState, currentTriggerType)) {
      return;
    }

    await using page = await this.browserforce.openPage(UserAccessPoliciesPage.getPolicyUrl(record.Id));
    const policiesPage = new UserAccessPoliciesPage(page);

    if (policy.active) {
      const needsTriggerTypeChange = currentState && policy.on && currentTriggerType !== policy.on;

      if (needsTriggerTypeChange) {
        await policiesPage.deactivatePolicy();

        await using newPage = await this.browserforce.openPage(UserAccessPoliciesPage.getPolicyUrl(record.Id));
        const newPoliciesPage = new UserAccessPoliciesPage(newPage);

        await newPoliciesPage.activatePolicy(policy.on);
      } else {
        const triggerOn: PolicyTriggerType =
          policy.on || (this.isValidTriggerType(currentTriggerType) ? currentTriggerType : DEFAULT_TRIGGER_TYPE);

        await policiesPage.activatePolicy(triggerOn);
      }
    } else {
      await policiesPage.deactivatePolicy();
    }
  }

  private needsPolicyChange(
    policy: AccessPolicy,
    currentState: boolean,
    currentTriggerType: string | null | undefined,
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

  private isValidTriggerType(value: string | null | undefined): value is PolicyTriggerType {
    return value === 'Create' || value === 'Update' || value === 'CreateAndUpdate';
  }

  /**
   * Clicks Apply To All, then waits until Salesforce records the run in UserAccessChange.
   * A policy that matches no user records nothing, so a missing row only gives a warning.
   */
  private async applyToAllUsers(apiName: string, policyId: string): Promise<void> {
    let previousRunDate: string | null = null;
    let canConfirm = true;
    try {
      previousRunDate = await this.queryLastApplyToAllDate(policyId);
    } catch (error) {
      canConfirm = false;
      this.warnUnconfirmedApplyToAll(apiName, error);
    }
    await this.clickApplyToAll(policyId);
    if (!canConfirm) {
      return;
    }
    const deadline = Date.now() + APPLY_TO_ALL_TIMEOUT_MINUTES * 60_000;
    while (Date.now() < deadline) {
      let lastRunDate: string | null;
      try {
        lastRunDate = await this.queryLastApplyToAllDate(policyId);
      } catch (error) {
        // the click already happened: a failing check must not fail the apply
        this.warnUnconfirmedApplyToAll(apiName, error);
        return;
      }
      if (lastRunDate !== null && (previousRunDate === null || Date.parse(lastRunDate) > Date.parse(previousRunDate))) {
        return;
      }
      await sleep(APPLY_TO_ALL_POLL_INTERVAL_MS);
    }
    this.browserforce.logger?.warn(
      `Salesforce recorded no access change for ${apiName} within ${APPLY_TO_ALL_TIMEOUT_MINUTES} minutes: the policy may match no user`,
    );
  }

  private async clickApplyToAll(policyId: string): Promise<void> {
    await using page = await this.browserforce.openPage(UserAccessPoliciesPage.getApplyToAllUrl(policyId));
    await new UserAccessPoliciesPage(page).applyToAll();
  }

  /**
   * @returns the CreatedDate of the latest UserAccessChange row of the policy, or null when there is none
   */
  private async queryLastApplyToAllDate(policyId: string): Promise<string | null> {
    const ids = [policyId.substring(0, 15), policyId].map((id) => `'${id}'`).join(',');
    const result = await this.browserforce.connection.query<{ CreatedDate: string }>(
      `SELECT CreatedDate FROM UserAccessChange WHERE Source IN (${ids}) ORDER BY CreatedDate DESC LIMIT 1`,
    );
    return result.records[0]?.CreatedDate ?? null;
  }

  private warnUnconfirmedApplyToAll(apiName: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.browserforce.logger?.warn(
      `Apply To All of ${apiName} was clicked but could not be confirmed: querying UserAccessChange failed (${message})`,
    );
  }
}
