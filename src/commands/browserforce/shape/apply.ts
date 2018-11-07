import { core, flags, SfdxCommand } from '@salesforce/command';
import * as path from 'path';
import Browserforce from '../../../browser';
import Plan from '../../../plan';
import * as DRIVERS from '../../../plugins';
import SchemaParser from '../../../schema-parser';

core.Messages.importMessagesDirectory(__dirname);
const messages = core.Messages.loadMessages(
  'sfdx-browserforce-plugin',
  'shape'
);

export default class ShapeApply extends SfdxCommand {
  public static description = messages.getMessage(
    'shapeApplyCommandDescription'
  );

  public static examples = [
    `$ sfdx browserforce:shape:apply -f ./config/browserforce-shape-def.json --targetusername myOrg@example.com
  Applying plan file ./config/browserforce-shape-def.json to org myOrg@example.com
  [AdminsCanLogInAsAny] retrieving state... done
  [AdminsCanLogInAsAny] changing Enabled from 'false' to 'true'... done
  `
  ];

  protected static flagsConfig = {
    definitionfile: flags.string({
      char: 'f',
      description: messages.getMessage('definitionFileDescription')
    })
  };

  protected static requiresUsername = true;
  private bf: Browserforce;

  // tslint:disable-next-line:no-any
  public async run(): Promise<any> {
    const definition = require(path.resolve(this.flags.definitionfile));
    const settings = SchemaParser.parse(DRIVERS, definition);
    const logger = await core.Logger.root();
    this.ux.log(
      `Applying plan file ${
        this.flags.definitionfile
      } to org ${this.org.getUsername()}`
    );
    this.bf = new Browserforce(this.org);

    logger.debug('logging in');
    await this.bf.login();
    logger.debug('logged in');
    logger.debug(settings);

    for (const setting of settings) {
      const driver = setting.Driver.default;
      const instance = new driver(this.bf.browser, this.org);
      this.ux.startSpinner(`[${driver.schema.name}] retrieving state`);
      let state;
      try {
        state = await instance.retrieve();
      } catch (err) {
        this.ux.stopSpinner('failed');
        throw err;
      }
      this.ux.stopSpinner();
      logger.debug(`generating actions for driver ${driver.schema.name}`);
      const actions = Plan.plan(driver.schema, state, setting.value);
      this.ux.stopSpinner();
      if (actions && actions.length) {
        this.ux.startSpinner(`[${driver.schema.name}] ${Plan.debug(actions)}`);
        try {
          await instance.apply(actions);
        } catch (err) {
          this.ux.stopSpinner('failed');
          throw err;
        }
        this.ux.stopSpinner();
      } else {
        this.ux.log(`[${driver.schema.name}] no actions necessary`);
      }
    }
    return { success: true };
  }

  // tslint:disable-next-line:no-any
  public async finally(err: any) {
    if (this.bf) {
      this.debug('logging out');
      await this.bf.logout();
      this.debug('logged out');
    }
  }
}
