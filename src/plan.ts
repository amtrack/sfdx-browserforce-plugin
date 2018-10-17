export interface Action {
  name: string;
  label: string;
  selector: string;
  oldValue: object;
  targetValue: object;
}

export default class Plan {
  public static debug(actions) {
    for (const action of actions) {
      return `changing ${action.label} from '${action.oldValue}' to '${
        action.targetValue
      }'`;
    }
  }

  public static plan(schema, state, target) {
    const actions = [];
    for (const key of Object.keys(schema.properties)) {
      if (
        Object.prototype.hasOwnProperty.call(state, key) &&
        Object.prototype.hasOwnProperty.call(target, key) &&
        state[key] !== target[key]
      ) {
        const action = schema.properties[key];
        action.oldValue = state[key];
        action.targetValue = target[key];
        actions.push(action);
      }
    }
    return actions;
  }
}
