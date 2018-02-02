const assert = require("assert");
const child = require("child_process");
const path = require("path");

const pluginName = "ExternalSharing";

describe(pluginName, () => {
  it("should disable and re-enable", function() {
    this.timeout(1000 * 120);
    this.slow(1000 * 30);
    var disableCmd = child.spawnSync("sfdx", [
      "browserforce:shape:apply",
      "-f",
      path.resolve(path.join(__dirname, "disable.json"))
    ]);
    assert.deepEqual(disableCmd.status, 0, disableCmd.stderr);
    assert(/to 'false'/.test(disableCmd.stdout.toString()));
    var enableCmd = child.spawnSync("sfdx", [
      "browserforce:shape:apply",
      "-f",
      path.resolve(path.join(__dirname, "enable.json"))
    ]);
    assert.deepEqual(enableCmd.status, 0, enableCmd.stderr);
    assert(/to 'true'/.test(enableCmd.stdout.toString()));
  });
});
