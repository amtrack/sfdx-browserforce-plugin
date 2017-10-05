module.exports = class Plan {
  static debug(actions) {
    for (let action of actions) {
      console.log(
        `Set ${action.label} from '${action.oldValue}' to '${
          action.targetValue
        }'`
      );
    }
  }

  static plan(schema, state, target) {
    let actions = [];
    for (let prop of schema.properties) {
      if (
        Object.prototype.hasOwnProperty.call(state, prop.name) &&
        Object.prototype.hasOwnProperty.call(target, prop.name) &&
        state[prop.name] !== target[prop.name]
      ) {
        let action = prop;
        action.oldValue = state[prop.name];
        action.targetValue = target[prop.name];
        actions.push(action);
      }
    }
    return actions;
  }
};
