import assert from 'assert';
import * as child from 'child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import { ListViewCustomButtons } from './index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe(ListViewCustomButtons.name, function () {
  let plugin: ListViewCustomButtons;
  before(() => {
    plugin = new ListViewCustomButtons(global.browserforce);
  });

  const enableButtons = [
    {
      objectApiName: 'Task',
      buttons: ['TestListButton', 'TestListButton2'],
      removeOtherButtons: false,
    },
    {
      objectApiName: 'Event',
      buttons: ['TestListButton', 'TestListButton2'],
      removeOtherButtons: false,
    },
  ];

  const enableSingleButton = [
    {
      objectApiName: 'Task',
      buttons: ['TestListButton'],
      removeOtherButtons: false,
    },
  ];

  const disableButtons = [
    {
      objectApiName: 'Task',
      buttons: [],
      removeOtherButtons: true,
    },
  ];

  const missingButton = [
    {
      objectApiName: 'Task',
      buttons: ['TestListButton', 'NonExistentButton'],
      removeOtherButtons: false,
    },
  ];

  it('should deploy test WebLink buttons as a prerequisite', () => {
    const sourceDeployCmd = child.spawnSync('sf', [
      'project',
      'deploy',
      'start',
      '-d',
      path.join(__dirname, 'sfdx-source'),
      '--json',
    ]);
    assert.deepStrictEqual(sourceDeployCmd.status, 0, sourceDeployCmd.output.toString());
  });

  it('should add both custom buttons to the list view', async () => {
    await plugin.apply(enableButtons);
    const res = await plugin.retrieve(enableButtons);
    assert.deepStrictEqual(res, enableButtons);
  });

  it('should be idempotent when buttons are already selected', async () => {
    const result = await plugin.run(enableButtons);
    assert.deepStrictEqual(result, { message: 'no action necessary' });
  });

  it('should remove other buttons when removeOtherButtons is true', async () => {
    await plugin.apply([{ objectApiName: 'Task', buttons: ['TestListButton'], removeOtherButtons: true }]);
    const res = await plugin.retrieve([
      { objectApiName: 'Task', buttons: ['TestListButton'], removeOtherButtons: true },
    ]);
    assert.deepStrictEqual(res, [{ objectApiName: 'Task', buttons: ['TestListButton'], removeOtherButtons: true }]);
  });

  it('should remove one button and keep the other', async () => {
    await plugin.apply(enableSingleButton);
    const res = await plugin.retrieve(enableSingleButton);
    assert.deepStrictEqual(res, enableSingleButton);
  });

  it('should remove all custom buttons', async () => {
    await plugin.apply(disableButtons);
    const res = await plugin.retrieve(disableButtons);
    assert.deepStrictEqual(res, disableButtons);
  });

  it('should add found button and warn about missing button without failing', async () => {
    await plugin.apply(missingButton);
    const res = await plugin.retrieve([{ objectApiName: 'Task', buttons: ['TestListButton'] }]);
    assert.strictEqual(res[0].buttons.length, 1);
    assert.strictEqual(res[0].buttons[0], 'TestListButton');
  });
});
