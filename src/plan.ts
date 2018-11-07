import * as jsonMergePatch from 'json-merge-patch';

export default class Plan {
  public static debug(plan) {
    const messages = [];
    for (const key of Object.keys(plan)) {
      messages.push(`changing '${key}' to '${JSON.stringify(plan[key])}'`);
    }
    return messages.join('\n');
  }

  public static plan(state, target) {
    return jsonMergePatch.generate(state, target);
  }
}
