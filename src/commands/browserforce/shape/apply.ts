import { core, flags, SfdxCommand } from '@salesforce/command';
import * as Bluebird from 'bluebird';
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

  // tslint:disable-next-line:no-any
  public async run(): Promise<any> {
    const definition = require(path.resolve(this.flags.definitionfile));
    const settings = SchemaParser.parse(DRIVERS, definition);
    let bf;

    const logger = await core.Logger.root();

    return Promise.resolve()
      .then(() => {
        this.ux.log(
          `Applying plan file ${
            this.flags.definitionfile
          } to org ${this.org.getUsername()}`
        );
        bf = new Browserforce(this.org);
      })
      .then(() => {
        logger.debug('logging in');
        return bf.login();
      })
      .then(() => {
        logger.debug(settings);
        return Bluebird.mapSeries(settings, setting => {
          const driver = setting.Driver.default;
          const instance = new driver(bf.browser, this.org);
          this.ux.startSpinner(`[${driver.schema.name}] retrieving state`);
          return instance
            .retrieve()
            .then(state => {
              this.ux.stopSpinner();
              return state;
            })
            .catch(err => {
              this.ux.stopSpinner('failed');
              throw err;
            })
            .then(state => {
              logger.debug(
                `generating actions for driver ${driver.schema.name}`
              );
              return Plan.plan(driver.schema, state, setting.value);
            })
            .then(actions => {
              this.ux.stopSpinner();
              if (actions && actions.length) {
                this.ux.startSpinner(
                  `[${driver.schema.name}] ${Plan.debug(actions)}`
                );
                return instance
                  .apply(actions)
                  .then(() => {
                    this.ux.stopSpinner();
                  })
                  .catch(err => {
                    this.ux.stopSpinner('failed');
                    throw err;
                  });
              } else {
                this.ux.log(`[${driver.schema.name}] no actions necessary`);
              }
            });
        });
      })
      .then(() => {
        logger.debug('logging out');
        return bf.logout();
      })
      .then(() => {
        return { success: true };
      })
      .catch(err => {
        // TODO: exiting with error code does not work currently
        this.error(err, { exit: 1 });
        return { success: false };
      });
  }
}
