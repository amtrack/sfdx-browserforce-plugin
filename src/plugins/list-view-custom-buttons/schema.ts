import { z } from 'zod';

export const listViewCustomButtonsSchema = z
  .object({
    objectApiName: z.string().meta({
      title: 'Object API Name',
      description:
        'The API name of the object whose list view custom buttons to manage (e.g. Activity, Account, Contact).',
    }),
    buttons: z
      .array(
        z.string().meta({
          description:
            "WebLink API Name (DeveloperName) of the custom button, optionally prefixed with namespace (e.g. 'AssignTask' or 'th_dev__AssignTask').",
        }),
      )
      .meta({
        title: 'Buttons',
        description:
          "WebLink API Names (DeveloperName) of the custom buttons to select. Use namespace__Name for namespaced buttons (e.g. 'th_dev__AssignTask') or just Name for unpackaged buttons (e.g. 'AssignTask').",
        default: [],
      }),
    removeOtherButtons: z.boolean().optional().meta({
      title: 'Remove Other Buttons',
      description:
        'Whether to remove other buttons from the list view. If true, all buttons except the ones specified in the buttons array will be removed.',
      default: false,
    }),
  })
  .meta({ id: 'listViewCustomButtons' });

export const schema = z.array(listViewCustomButtonsSchema).default([]).meta({
  title: 'List View Custom Buttons',
  description:
    "Manage the selected custom buttons in the list view button layout (Aloha Search Layout) for any object. Buttons are identified by their WebLink API Name (DeveloperName), with optional namespace prefix (e.g. 'AssignTask' or 'th_dev__AssignTask').",
});
