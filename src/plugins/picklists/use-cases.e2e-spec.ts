import { defineUseCases, type UseCaseDoc } from '../../../scripts/use-cases.js';
import { picklistsSchema } from './index.js';

/** The lead of a story with the Lead Source it has before the use case, created when the org does not have it. */
async function resetLead(
  doc: UseCaseDoc,
  lead: { FirstName: string; LastName: string; Company: string },
  leadSource: string | null,
): Promise<void> {
  const leads = doc.browserforce.connection.sobject('Lead');
  const found = await doc.browserforce.connection.query<{ Id: string }>(
    `SELECT Id FROM Lead WHERE Company = '${lead.Company}'`,
  );
  if (found.records.length > 0) {
    await leads.update({ Id: found.records[0].Id, LeadSource: leadSource });
  } else {
    await leads.create({ ...lead, LeadSource: leadSource });
  }
}

export const useCases = defineUseCases(picklistsSchema, [
  {
    slug: '01-rename-an-api-name',
    title: 'Rename the API name of a value, with the records that hold it',
    given: {
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          value: 'Partner_Referral',
          newApiName: 'Partner Referral',
        },
      ],
    },
    config: {
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          value: 'Partner Referral',
          newApiName: 'Partner_Referral',
        },
      ],
    },
    story: [
      'Acme connects a marketing automation tool that only accepts lead sources without spaces, and its **Lead Source (1)** picklist has a value whose API name is **Partner Referral (2)**. The sales reps must go on seeing the same label, and the thousands of existing leads must keep their source. Deploying the value set with a value renamed to `Partner_Referral` does not rename anything: the Metadata API creates a new value, and every lead keeps the old one. Only the **Edit** page of the value in Setup changes its API name in place, and Salesforce then updates the records that hold it.',
      'With `newApiName`, Browserforce renames the API name to **Partner_Referral (3)** and keeps the label. An inactive value has no Edit link: Browserforce activates it, renames it and deactivates it again. Once `Partner_Referral` exists, a second `apply` does nothing, and it fails before changing anything when another value already has the new API name or when the org forbids changing API names.',
    ],
    withoutPill: {
      'picklistValues[0].metadataType': 'a standard value set, found by its name',
    },
    captures: {
      'lead-source': {
        // left of the title, not over the New button at its right
        pills: { 'picklistValues[0].metadataFullName': { px: 1.7, py: 34.7 } },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/_ui/common/config/field/StandardFieldAttributes/d?id=LeadSource&type=Lead', {
        height: 1000,
      });
      const ui = await doc.within(page, '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])');
      await doc.shot('lead-source', page, {
        context: [ui.locator('.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])')],
        pills: {
          'picklistValues[0].metadataFullName': ui.locator(
            '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"]) .pbTitle h3',
          ),
          'picklistValues[0].value': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("Partner Referral")) > td:nth-child(3)'),
            in: 'before',
          },
          'picklistValues[0].newApiName': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("Partner_Referral")) > td:nth-child(3)'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '02-rename-the-api-name-and-the-label',
    title: 'Rename the API name and the label of a value',
    given: {
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'Satnav',
          newApiName: 'Navigation',
          newLabel: 'Navigation System',
        },
      ],
    },
    config: {
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'Navigation',
          newApiName: 'Satnav',
          newLabel: 'Satellite Navigation',
        },
      ],
    },
    story: [
      "The dealer's new telematics partner sends the features of each car with its own codes, and expects `Satnav` where the **Features (1)** field stores **Navigation (2)**. The sales team takes the occasion to give the value a clearer label, and both changes must reach every org of the dealer, with the Vehicles that hold the value.",
      'Next to `newApiName`, which renames the API name to **Satnav (3)** in place as in the use case above, `newLabel` changes the label users see to **Satellite Navigation (4)** in the same edit. With `newLabel`, a second `apply` also checks the label, and only changes it when it differs.',
    ],
    withoutPill: {
      'picklistValues[0].metadataType': 'a custom field, found by its object and API name',
    },
    captures: {
      features: {
        // inside the label cell, not over the new API name next to it
        pills: { 'picklistValues[0].newLabel': { px: 31, py: 52.1 } },
      },
    },
    async shoot(doc) {
      const customFieldId = await doc.recordId(
        "SELECT Id FROM CustomField WHERE DeveloperName = 'Features' AND NamespacePrefix = null",
        { tooling: true },
      );
      await using page = await doc.open(`/${customFieldId}`, { height: 1400 });
      const ui = await doc.within(page, '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])');
      await doc.shot('features', page, {
        context: [ui.locator('.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])')],
        pills: {
          'picklistValues[0].metadataFullName': ui.locator(
            '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"]) .pbTitle h3',
          ),
          'picklistValues[0].value': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("Navigation")) > td:nth-child(3)'),
            in: 'before',
          },
          'picklistValues[0].newApiName': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("Satnav")) > td:nth-child(3)'),
            in: 'after',
          },
          'picklistValues[0].newLabel': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("Satnav")) > th'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '03-add-a-status-with-its-category',
    title: 'Add a contract status with its category',
    given: {
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'ContractStatus',
          value: 'Under Legal Review',
          absent: true,
        },
      ],
    },
    config: {
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'ContractStatus',
          newValue: 'Under Legal Review',
          statusCategory: 'Draft',
        },
      ],
    },
    story: [
      'At Acme, every contract goes through the legal team before it is activated. The **Contract Status (1)** picklist needs a step **Under Legal Review (2)**, and each contract status belongs to a **Status Category (3)**, `Draft`, `Activated` or `Expired`, which drives what users can do with the contract. The `StandardValue` type of the Metadata API has no field for the status category, so a deployment cannot create such a status.',
      'Set `statusCategory` with `newValue` on a status picklist (contracts, orders): Browserforce creates the value on its Setup page and picks the category there. A second `apply` finds the value and does nothing.',
    ],
    withoutPill: {
      'picklistValues[0].metadataType': 'tells Browserforce which Setup page holds the values',
    },
    captures: {
      'contract-status': {
        pills: {
          'picklistValues[0].metadataFullName': { px: 1.7, py: 34.9 },
          'picklistValues[0].newValue': { px: 21.4, py: 64.3 },
          'picklistValues[0].statusCategory': { px: 47.8, py: 64.3 },
        },
      },
    },
    async shoot(doc) {
      await using page = await doc.open('/_ui/common/config/field/StandardFieldAttributes/d?id=Status&type=Contract', {
        height: 1000,
      });
      const ui = await doc.within(page, '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])');
      await doc.shot('contract-status', page, {
        context: [ui.locator('.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])')],
        pills: {
          'picklistValues[0].metadataFullName': ui.locator(
            '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"]) .pbTitle h3',
          ),
          'picklistValues[0].newValue': {
            locator: ui.locator('tr:has(> th:text-is("Under Legal Review")) > th'),
            in: 'after',
          },
          'picklistValues[0].statusCategory': {
            locator: ui.locator('tr:has(> th:text-is("Under Legal Review")) > td:nth-child(4)'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '04-replace-a-value-in-the-records',
    title: 'Replace a value in the records, keeping the old one',
    config: {
      picklistValues: [
        { metadataType: 'StandardValueSet', metadataFullName: 'LeadSource', value: 'Phone Inquiry', newValue: 'Other' },
      ],
    },
    restore: false,
    notIdempotent: 'every run replaces the value again in the records that hold it',
    story: [
      "The marketing team of Acme merged its call channels: the leads that came by phone, like Thandi Ndlovu's, now count under Other. The **Replace** button of a picklist page rewrites a value in every record that holds it; the Metadata API only deploys the list of values, and never touches the records.",
      'This config replaces **Phone Inquiry (1)** with **Other (2)** in the Lead Source of every lead. Without `active` or `absent`, the old value stays in the picklist, active, for the processes that still read it. Replacing is not idempotent: every `apply` runs it again, which is harmless once no record holds the old value.',
    ],
    withoutPill: {
      'picklistValues[0].metadataFullName': 'the Lead Source field, shown by the other pills',
      'picklistValues[0].metadataType': 'tells Browserforce which Setup page holds the values',
    },
    captures: {
      lead: {
        title: 'A lead that came by phone',
        pills: { 'picklistValues[0].value': { px: 36, py: 50 }, 'picklistValues[0].newValue': { px: 36, py: 50 } },
      },
    },
    async prepare(doc) {
      await resetLead(doc, { FirstName: 'Thandi', LastName: 'Ndlovu', Company: 'Ndlovu Motors' }, 'Phone Inquiry');
    },
    async shoot(doc) {
      const leadId = await doc.recordId("SELECT Id FROM Lead WHERE Company = 'Ndlovu Motors'");
      await using page = await doc.open(`/${leadId}`, { height: 1200 });
      await doc.click(page, 'a[data-label="Details"]');
      const ui = await doc.within(page, 'records-record-layout-item[field-label="Lead Source"]');
      await doc.shot('lead', page, {
        pills: {
          'picklistValues[0].value': {
            locator: ui.locator('records-record-layout-item[field-label="Lead Source"]'),
            in: 'before',
          },
          'picklistValues[0].newValue': {
            locator: ui.locator('records-record-layout-item[field-label="Lead Source"]'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '05-fill-blank-values',
    title: 'Fill the blank values of the records',
    config: {
      picklistValues: [
        {
          metadataType: 'StandardValueSet',
          metadataFullName: 'LeadSource',
          replaceAllBlankValues: true,
          newValue: 'Purchased List',
        },
      ],
    },
    restore: false,
    notIdempotent: 'every run fills the blank values again',
    story: [
      'Acme imported a purchased list of prospects without filling their source, and its marketing reports now show a large "blank" slice. Records are data, not metadata: no deployment can fill an empty field, and only the **Replace** page of the picklist offers to replace the blanks.',
      "With `replaceAllBlankValues`, the leads whose **Lead Source (1)** is empty, like Bongani Dube's, get **Purchased List (2)**. It is an alternative to `value`: one action replaces either a value or the blanks.",
    ],
    withoutPill: {
      'picklistValues[0].metadataFullName': 'the Lead Source field, shown by the other pills',
      'picklistValues[0].metadataType': 'tells Browserforce which Setup page holds the values',
    },
    captures: {
      lead: {
        title: 'A lead imported without source',
        pills: {
          'picklistValues[0].replaceAllBlankValues': { px: 36, py: 50 },
          'picklistValues[0].newValue': { px: 36, py: 50 },
        },
      },
    },
    async prepare(doc) {
      await resetLead(doc, { FirstName: 'Bongani', LastName: 'Dube', Company: 'Dube Logistics' }, null);
    },
    async shoot(doc) {
      const leadId = await doc.recordId("SELECT Id FROM Lead WHERE Company = 'Dube Logistics'");
      await using page = await doc.open(`/${leadId}`, { height: 1200 });
      await doc.click(page, 'a[data-label="Details"]');
      const ui = await doc.within(page, 'records-record-layout-item[field-label="Lead Source"]');
      await doc.shot('lead', page, {
        pills: {
          'picklistValues[0].replaceAllBlankValues': {
            locator: ui.locator('records-record-layout-item[field-label="Lead Source"]'),
            in: 'before',
          },
          'picklistValues[0].newValue': {
            locator: ui.locator('records-record-layout-item[field-label="Lead Source"]'),
            in: 'after',
          },
        },
      });
    },
  },
  {
    slug: '06-replace-then-deactivate',
    title: 'Replace a value in the records, then deactivate it',
    given: {
      picklistValues: [
        { metadataType: 'CustomField', metadataFullName: 'Vehicle__c.Features__c', value: 'AUX', active: true },
      ],
    },
    config: {
      picklistValues: [
        { metadataType: 'CustomField', metadataFullName: 'Vehicle__c.Features__c', value: 'AUX', newValue: 'Media' },
        { metadataType: 'CustomField', metadataFullName: 'Vehicle__c.Features__c', value: 'AUX', active: false },
      ],
    },
    notIdempotent: 'every run replaces AUX again in the records that hold it',
    story: [
      'The AUX input of old cars is now part of the media system. The admins of the dealer want every Vehicle that says **AUX (2)** to say **Media (3)**, and AUX to leave the choices, while the records keep a valid value. A deployment can deactivate a value, but it leaves the records with the old one: only the **Replace** page of Setup moves them.',
      'Two actions on the same value run in order: the first replaces it in the records, the second sets **active (4)** to `false`. The list of a config is applied from top to bottom.',
    ],
    withoutPill: {
      'picklistValues[0].metadataType': 'a custom field, found by its object and API name',
      'picklistValues[1].metadataType': 'the same field as (1)',
      'picklistValues[1].metadataFullName': 'the same field as (1)',
      'picklistValues[1].value': 'the same value as (2)',
    },
    captures: {
      features: {
        pills: {
          'picklistValues[0].metadataFullName': { px: 1.7, py: 17.4 },
          // left of the inactive value in "After", where the right side is the Modified By link
          'picklistValues[0].value': { px: 21.75, py: 81.8, before: { px: 44.6, py: 63.2 } },
          // left of the action links, not over the label of the value next to them
          'picklistValues[1].active': { px: 1.9, py: 81.8, before: { py: 63.2 } },
        },
      },
    },
    async shoot(doc) {
      const customFieldId = await doc.recordId(
        "SELECT Id FROM CustomField WHERE DeveloperName = 'Features' AND NamespacePrefix = null",
        { tooling: true },
      );
      await using page = await doc.open(`/${customFieldId}`, { height: 1400 });
      const ui = await doc.within(page, '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])');
      await doc.shot('features', page, {
        context: [ui.locator('.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])')],
        pills: {
          'picklistValues[0].metadataFullName': ui.locator(
            '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"]) .pbTitle h3',
          ),
          'picklistValues[0].value': ui.locator('tr:has(> td:nth-child(3):text-is("AUX")) > td:nth-child(3)'),
          'picklistValues[0].newValue': ui.locator('tr:has(> td:nth-child(3):text-is("Media")) > td:nth-child(3)'),
          'picklistValues[1].active': ui.locator('tr:has(> td:nth-child(3):text-is("AUX")) > td.actionColumn'),
        },
      });
    },
  },
  {
    slug: '07-replace-then-delete',
    title: 'Replace a value in the records, then delete it',
    given: {
      picklistValues: [{ metadataType: 'CustomField', metadataFullName: 'Vehicle__c.Features__c', newValue: 'CD' }],
    },
    config: {
      picklistValues: [
        {
          metadataType: 'CustomField',
          metadataFullName: 'Vehicle__c.Features__c',
          value: 'CD',
          newValue: 'Media',
          absent: true,
        },
      ],
    },
    story: [
      'Compact discs are gone for good, and the dealer wants the value out of the **Features (1)** field, not only hidden. The Metadata API cannot delete a picklist value: a value missing from a deployment is only deactivated, and its records keep it. Deleting a value in Setup asks what the records that hold it become.',
      'With `absent: true` and a `newValue`, Browserforce deletes **CD (2)** and gives its records **Media (3)**. Without `newValue`, their value is cleared.',
    ],
    withoutPill: {
      'picklistValues[0].metadataType': 'a custom field, found by its object and API name',
      'picklistValues[0].absent': 'the value (2) is gone from the list',
    },
    captures: {
      features: {
        pills: { 'picklistValues[0].metadataFullName': { px: 1.7, py: 29.5 } },
      },
    },
    async shoot(doc) {
      const customFieldId = await doc.recordId(
        "SELECT Id FROM CustomField WHERE DeveloperName = 'Features' AND NamespacePrefix = null",
        { tooling: true },
      );
      await using page = await doc.open(`/${customFieldId}`, { height: 1400 });
      const ui = await doc.within(page, '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])');
      await doc.shot('features', page, {
        context: [ui.locator('.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"])')],
        pills: {
          'picklistValues[0].metadataFullName': ui.locator(
            '.bRelatedList:has(input[name="new"][onclick*="picklist_masteredit"]) .pbTitle h3',
          ),
          'picklistValues[0].value': {
            locator: ui.locator('tr:has(> td:nth-child(3):text-is("CD")) > td:nth-child(3)'),
            in: 'before',
          },
          'picklistValues[0].newValue': ui.locator('tr:has(> td:nth-child(3):text-is("Media")) > td:nth-child(3)'),
        },
      });
    },
  },
  {
    slug: '08-remove-a-field-dependency',
    title: 'Remove a field dependency',
    given: {
      fieldDependencies: [{ object: 'Vehicle__c', dependentField: 'Gears__c', controllingField: 'Transmission__c' }],
    },
    config: { fieldDependencies: [{ object: 'Vehicle__c', dependentField: 'Gears__c', controllingField: null }] },
    story: [
      'A field dependency also gets in the way: an import of old Vehicle records fails on every gear that does not match its transmission. The dealer removes the dependency during the migration. The Metadata API can create or change a field dependency, but deploying the field without its controlling field does not remove it.',
      'Set the controlling field of **Gears (3)** on **Vehicle (1)** to `null`: Browserforce deletes the dependency, which leaves the field dependencies of **Transmission (2)**, and every value of Gears is available again. A second `apply` finds no dependency and does nothing.',
    ],
    async shoot(doc) {
      const customFieldId = await doc.recordId(
        "SELECT Id FROM CustomField WHERE DeveloperName = 'Transmission' AND NamespacePrefix = null",
        { tooling: true },
      );
      await using page = await doc.open(`/${customFieldId}`, { height: 1000 });
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('field-dependencies', page, {
        context: [
          ui.locator('.bPageTitle'),
          ui.locator(
            '.bRelatedList:has(.pbTitle h3:text-is("Field Dependencies")), .listRelatedObject:has(.pbTitle h3:text-is("Field Dependencies"))',
          ),
        ],
        pills: {
          'fieldDependencies[0].object': ui.locator('.bPageTitle h1.pageType'),
          'fieldDependencies[0].controllingField': ui.locator('.bPageTitle h2.pageDescription'),
          'fieldDependencies[0].dependentField': { locator: ui.locator('tr:has(> th:text-is("Gears"))'), in: 'before' },
        },
      });
    },
  },
]);
