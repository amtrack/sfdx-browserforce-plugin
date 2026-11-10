import { defineUseCases } from '../../../scripts/use-cases.js';
import { listViewCustomButtonsSchema } from './index.js';

export const useCases = defineUseCases(listViewCustomButtonsSchema, [
  {
    slug: '01-add-task-list-buttons',
    title: 'Show the custom buttons of the task list views',
    given: [{ objectApiName: 'Task', buttons: [], removeOtherButtons: true }],
    config: [{ objectApiName: 'Task', buttons: ['TestListButton', 'TestListButton2'], removeOtherButtons: true }],
    story: [
      'The support team of Acme works its tasks from list views, and its developers wrote two list buttons, **Test List Button** and **Test List Button 2**, that act on the selected tasks. The `listViewButtons` of the Metadata API (`searchLayouts` of an object) do not apply to tasks and events, so an admin had to add the buttons by hand, in each org.',
      'This config selects both buttons on the list views of **Task (1)**, whose layout is the **Activities List View**, shared with events. The buttons are named by their API name, with their namespace prefix when they come from a package (`th_dev__AssignTask`). With `removeOtherButtons`, the **Selected Buttons (2)** end up exactly as listed.',
    ],
    withoutPill: {
      '[0].removeOtherButtons': 'removes from the Selected Buttons (2) the buttons the list does not name',
    },
    async shoot(doc) {
      await using page = await doc.open('/p/setup/layout/ListButtonsEdit?LayoutEntity=Activity');
      const ui = await doc.within(page, '.bPageTitle');
      await doc.shot('activities-list-view', page, {
        context: [ui.locator('.bPageTitle'), ui.locator('form .pbBody')],
        pills: {
          '[0].objectApiName': ui.locator('.bPageTitle h2'),
          '[0].buttons': ui.locator('select#actionRefs_select_1'),
        },
      });
    },
  },
]);
