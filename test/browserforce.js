const assert = require("assert");
const Browserforce = require("../lib/browserforce");

describe("Browserforce", () => {
  describe("constructor()", () => {
    it("should instantiate Browserforce", function() {
      this.timeout(1000 * 15);
      this.slow(1000 * 5);
      let bf = new Browserforce();
      assert(bf !== undefined);
    });
  });
  describe("launch()", () => {
    it("should return a browser instance", async function() {
      this.timeout(1000 * 15);
      this.slow(1000 * 5);
      let bf = new Browserforce();
      let browser = await bf.launch();
      assert(browser !== undefined);
      await browser.close();
    });
  });
});
