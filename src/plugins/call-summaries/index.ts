import { setTimeout as sleep } from 'node:timers/promises';
import { type Connection } from '@salesforce/core';
import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import { CallSummariesSetupPage } from './page.js';

export const callSummariesSchema = z
  .object({
    enabled: z
      .boolean()
      .meta({ title: 'Enable Call Summaries' })
      .describe(
        'Turning on Call Summaries using ConversationalIntelligenceSettings Metadata (enableCallSummarization) often fails with OrgPreferences.GenECI, so it is turned on in Setup > Salesforce Go > Call Summaries instead.\nIt is turned off using Metadata https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_conversationalintelligencesettings.htm',
      )
      .optional(),
  })
  .meta({
    id: 'callSummaries',
    title: 'Call Summaries',
    examples: [{ enabled: true }, { enabled: false }],
    'x-prerequisites': [
      'Einstein Conversation Insights turned on (scratch org feature CallCoaching and ConversationalIntelligenceSettings.enableCallCoaching)',
      'Einstein Generative AI turned on (scratch org feature Einstein1AIPlatform and EinsteinGptSettings.enableEinsteinGptPlatform)',
    ],
  });

const MSG_NOT_AVAILABLE = `Einstein Conversation Insights is not available in this organization.
Please add 'CallCoaching' to your Scratch Org Features or purchase a license.`;
const MSG_ECI_NOT_ON = `Call Summaries cannot be turned on: Einstein Conversation Insights is not turned on in this organization.
Please turn on Einstein Conversation Insights first.`;

// the Metadata types known to jsforce predate ConversationalIntelligenceSettings
const METADATA_TYPE = 'ConversationalIntelligenceSettings' as Parameters<Connection['metadata']['read']>[0];

// The setting can read true while Call Summaries is not turned on (e.g. after a Metadata deploy):
// the object storing the summaries only exists once it is really turned on.
const SUMMARY_OBJECT = 'GenAIConversationSummary';

// Salesforce takes a moment to report Call Summaries as on after the modal closes
const TURN_ON_TIMEOUT_MS = 10 * 60_000;
const TURN_ON_POLL_INTERVAL_MS = 15_000;

export type CallSummariesConfig = z.infer<typeof callSummariesSchema>;

export class CallSummaries extends BrowserforcePlugin {
  public async retrieve(definition?: CallSummariesConfig): Promise<CallSummariesConfig> {
    // turning off only needs the setting off, even when Call Summaries is not completely turned on yet
    if (definition?.enabled === false) {
      return { enabled: await readSetting(this.browserforce.connection, 'enableCallSummarization') };
    }
    return { enabled: await isCallSummariesOn(this.browserforce.connection) };
  }

  public async apply(config: CallSummariesConfig): Promise<void> {
    if (config.enabled === undefined) {
      return;
    }
    if (config.enabled) {
      // while it is off, Turn On is enabled anyway and turns on Einstein Conversation Insights instead of Call Summaries
      if (!(await readSetting(this.browserforce.connection, 'enableCallCoaching'))) {
        throw new Error(MSG_ECI_NOT_ON);
      }
      await using page = await this.browserforce.openPage(CallSummariesSetupPage.getUrl());
      const callSummaries = new CallSummariesSetupPage(page);
      await callSummaries.turnOn();
      await waitForCallSummariesOn(this.browserforce.connection);
    } else {
      await disableCallSummarizationUsingMetadata(this.browserforce.connection);
    }
  }
}

async function readSetting(
  connection: Connection,
  setting: 'enableCallCoaching' | 'enableCallSummarization',
): Promise<boolean> {
  try {
    const settings = await connection.metadata.read(METADATA_TYPE, 'ConversationalIntelligence');
    // jsforce only converts the values of the Metadata types it knows: this one comes back as 'true' or 'false'
    return String(settings[setting]) === 'true';
  } catch (e) {
    if (/INVALID_TYPE: This type of metadata is not available for this organization/.test(e)) {
      throw new Error(MSG_NOT_AVAILABLE);
    }
    throw e;
  }
}

async function isCallSummariesOn(connection: Connection): Promise<boolean> {
  if (!(await readSetting(connection, 'enableCallSummarization'))) {
    return false;
  }
  const result = await connection.query(
    `SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName = '${SUMMARY_OBJECT}'`,
  );
  return result.totalSize > 0;
}

async function waitForCallSummariesOn(connection: Connection): Promise<void> {
  const deadline = Date.now() + TURN_ON_TIMEOUT_MS;
  while (!(await isCallSummariesOn(connection))) {
    if (Date.now() > deadline) {
      throw new Error(`Call Summaries was not turned on within ${TURN_ON_TIMEOUT_MS / 60_000} minutes.`);
    }
    await sleep(TURN_ON_POLL_INTERVAL_MS);
  }
}

async function disableCallSummarizationUsingMetadata(connection: Connection): Promise<void> {
  const settings = {
    fullName: 'ConversationalIntelligence',
    enableCallSummarization: false,
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
