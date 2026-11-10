import { defineUseCases } from '../../../scripts/use-cases.js';
import { recordTypesSchema } from './index.js';

export const useCases = defineUseCases(recordTypesSchema, [
  {
    slug: '01-delete-retired-record-types',
    title: 'Delete retired record types',
    config: {
      deletions: [
        { fullName: 'Vehicle__c.SportsCar', replacement: 'Vehicle__c.Bicycle' },
        { fullName: 'Vehicle__c.SUV' },
      ],
    },
    restore: false,
    story: [
      'A rental company used to track sports cars and SUVs as Vehicle record types. Both were deactivated long ago, but they still clutter the record type lists, the reports and every profile. The Metadata API refuses to delete a record type ("Cannot delete record type through API"), and Setup only deletes an inactive one, asking which record type its records get instead.',
      'This config deletes **Sports Car (1)**, whose records become **Bike (2)** records, and **Sport Utility Vehicle (3)**, whose records lose their record type. Browserforce refuses to delete an active record type: deactivate it first with the Metadata API. Once deleted, a record type only comes back by deploying it again.',
    ],
    captures: {
      'vehicle-record-types': {
        // from the right edge of the Object Manager navigation
        clip: { x: 499, y: 237, width: 941, height: 420 },
        pills: {
          'deletions[0].fullName': { px: 85.5, py: 67.4 },
          'deletions[0].replacement': { px: 85.5, py: 32.4 },
          'deletions[1].fullName': { px: 85.5, py: 55.7 },
        },
      },
    },
    async prepare(doc) {
      // the inactive record types of the fixtures (sfdx-source), deleted by a previous run
      await doc.browserforce.connection.metadata.upsert('RecordType', [
        { fullName: 'Vehicle__c.SportsCar', label: 'Sports Car', active: false },
        { fullName: 'Vehicle__c.SUV', label: 'Sport Utility Vehicle', active: false },
      ]);
    },
    async shoot(doc) {
      await using page = await doc.open('/lightning/setup/ObjectManager/Vehicle__c/RecordTypes/view');
      const ui = await doc.within(page, 'tr:has(span.uiOutputText:text-is("Bike"))');
      await doc.shot('vehicle-record-types', page, {
        pills: {
          'deletions[0].fullName': {
            locator: ui.locator('tr:has(span.uiOutputText:text-is("Sports Car"))'),
            in: 'before',
          },
          'deletions[0].replacement': ui.locator('tr:has(span.uiOutputText:text-is("Bike"))'),
          'deletions[1].fullName': {
            locator: ui.locator('tr:has(span.uiOutputText:text-is("Sport Utility Vehicle"))'),
            in: 'before',
          },
        },
      });
    },
  },
]);
