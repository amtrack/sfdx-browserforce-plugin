import { setTimeout as sleep } from 'node:timers/promises';
import { type Connection } from '@salesforce/core';
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';

export const einsteinConversationInsightsSchema = z
  .object({
    enabled: z
      .boolean()
      .meta({ title: 'Enable Einstein Conversation Insights', 'x-irreversible': true })
      .describe(
        'Turning on Einstein Conversation Insights in the scratch org definition can take more than 30 minutes to complete, and a Metadata deploy does not wait for it to complete.\nIt is turned on using ConversationalIntelligenceSettings Metadata (enableCallCoaching) after the org is created, waiting until it is completely turned on https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_conversationalintelligencesettings.htm\nWarning: it cannot be turned off using Browserforce.',
      )
      .optional(),
  })
  .meta({
    id: 'einsteinConversationInsights',
    title: 'Einstein Conversation Insights',
    examples: [{ enabled: true }],
    'x-prerequisites': ['Einstein Conversation Insights license (scratch org feature CallCoaching)'],
  });

const MSG_NOT_AVAILABLE = `Einstein Conversation Insights is not available in this organization.
Please add 'CallCoaching' to your Scratch Org Features or purchase a license.`;

// the Metadata types known to jsforce predate ConversationalIntelligenceSettings
const METADATA_TYPE = 'ConversationalIntelligenceSettings' as Parameters<Connection['metadata']['read']>[0];

// The setting reads true as soon as it is saved, while Salesforce still needs a moment to turn the feature on:
// the object storing the conversations only exists once it is completely turned on.
const CONVERSATION_OBJECT = 'Conversation';

const TURN_ON_TIMEOUT_MS = 10 * 60_000;
const TURN_ON_POLL_INTERVAL_MS = 15_000;

export type EinsteinConversationInsightsConfig = z.infer<typeof einsteinConversationInsightsSchema>;

export class EinsteinConversationInsights extends BrowserforcePlugin {
  public async retrieve(): Promise<EinsteinConversationInsightsConfig> {
    return { enabled: await isEinsteinConversationInsightsOn(this.browserforce.connection) };
  }

  public async apply(config: EinsteinConversationInsightsConfig): Promise<void> {
    if (config.enabled === false) {
      throw new Error('`enabled` cannot be disabled once enabled');
    }
    if (config.enabled) {
      // the setting may already be on while Salesforce is still turning the feature on
      if (!(await readCallCoaching(this.browserforce.connection))) {
        await enableCallCoachingUsingMetadata(this.browserforce.connection);
      }
      await waitForEinsteinConversationInsightsOn(this.browserforce.connection);
    }
  }
}

async function readCallCoaching(connection: Connection): Promise<boolean> {
  try {
    const settings = await connection.metadata.read(METADATA_TYPE, 'ConversationalIntelligence');
    // jsforce only converts the values of the Metadata types it knows: this one comes back as 'true' or 'false'
    return String(settings['enableCallCoaching']) === 'true';
  } catch (e) {
    if (/INVALID_TYPE: This type of metadata is not available for this organization/.test(e)) {
      throw new Error(MSG_NOT_AVAILABLE);
    }
    throw e;
  }
}

async function isEinsteinConversationInsightsOn(connection: Connection): Promise<boolean> {
  if (!(await readCallCoaching(connection))) {
    return false;
  }
  const result = await connection.query(
    `SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName = '${CONVERSATION_OBJECT}'`,
  );
  return result.totalSize > 0;
}

async function waitForEinsteinConversationInsightsOn(connection: Connection): Promise<void> {
  const deadline = Date.now() + TURN_ON_TIMEOUT_MS;
  while (!(await isEinsteinConversationInsightsOn(connection))) {
    if (Date.now() > deadline) {
      throw new Error(
        `Einstein Conversation Insights was not turned on within ${TURN_ON_TIMEOUT_MS / 60_000} minutes.`,
      );
    }
    await sleep(TURN_ON_POLL_INTERVAL_MS);
  }
}

async function enableCallCoachingUsingMetadata(connection: Connection): Promise<void> {
  const settings = {
    fullName: 'ConversationalIntelligence',
    enableCallCoaching: true,
  };
  const result = await connection.metadata.update(METADATA_TYPE, settings);
  if (!result.success) {
    throw new Error(
      [result.errors]
        .flat()
        .map((error) => error.message)
        .join('\n'),
    );
  }
}
