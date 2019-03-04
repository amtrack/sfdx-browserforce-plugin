import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import CriticalUpdates from './critical-updates';

export default class CompanySettings extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const response = {
      criticalUpdates: {}
    };
    if (definition) {
      if (definition.criticalUpdates) {
        const pluginCU = new CriticalUpdates(this.browserforce, this.org);
        response.criticalUpdates = await pluginCU.retrieve(
          definition.criticalUpdates
        );
      }
    }
    return response;
  }

  public diff(state, definition) {
    const pluginCU = new CriticalUpdates(null, null);
    const response = {
      criticalUpdates: pluginCU.diff(
        state.criticalUpdates,
        definition.criticalUpdates
      )
    };
    return removeEmptyValues(response);
  }

  public async apply(plan) {
    if (plan.criticalUpdates) {
      const pluginCU = new CriticalUpdates(this.browserforce, this.org);
      await pluginCU.apply(plan.criticalUpdates);
    }
  }
}
