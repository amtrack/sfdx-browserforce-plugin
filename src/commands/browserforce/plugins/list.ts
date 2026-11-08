import { SfCommand } from '@salesforce/sf-plugins-core';
import { buildPluginCatalog, type PluginCatalog } from '../../../plugin-catalog.js';

const PACKAGE_NAME = 'sfdx-browserforce-plugin';

export class BrowserforcePluginsList extends SfCommand<PluginCatalog> {
  public static summary = 'list the settings Browserforce can apply';
  public static description = `Describe every setting (plugin) that can be used under "settings" in a Browserforce config file, without connecting to an org.

With --json, each setting comes with its JSON Schema, a flat list of its fields ready to be prompted, examples, and warnings (irreversible changes, Classic-only features, org prerequisites). The settings that have been removed are listed with their migration instructions.

This output is meant for tools building Browserforce configurations, like sfdx-hardis deployment actions. Its "formatVersion" only changes when a field is removed or renamed.`;
  public static examples = [`$ <%= config.bin %> <%= command.id %>`, `$ <%= config.bin %> <%= command.id %> --json`];

  public async run(): Promise<PluginCatalog> {
    await this.parse(BrowserforcePluginsList);
    const catalog = buildPluginCatalog(this.config.plugins.get(PACKAGE_NAME)?.version ?? this.config.version);
    this.table({
      data: catalog.plugins.map((plugin) => ({
        key: plugin.key,
        title: plugin.title ?? '',
        warnings: [
          plugin.warnings.irreversibleFields.length > 0 ? 'irreversible' : undefined,
          plugin.warnings.userInterface ? `${plugin.warnings.userInterface} only` : undefined,
          plugin.warnings.prerequisites.length > 0 ? 'prerequisites' : undefined,
        ]
          .filter(Boolean)
          .join(', '),
      })),
      columns: [
        { key: 'key', name: 'Key' },
        { key: 'title', name: 'Title' },
        { key: 'warnings', name: 'Warnings' },
      ],
    });
    return catalog;
  }
}
