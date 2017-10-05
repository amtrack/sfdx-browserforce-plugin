const assert = require("assert");
const Plan = require("../lib/plan");

describe("Plan", () => {
  describe("plan()", () => {
    it("should return no actions", function() {
      let schema = {
        properties: [
          {
            name: "foo"
          }
        ]
      };
      let state = {
        foo: "bar"
      };
      let target = {
        foo: "bar"
      };
      assert.deepEqual(Plan.plan(schema, state, target), []);
    });
    it("should return an action", function() {
      let schema = {
        properties: [
          {
            name: "foo"
          }
        ]
      };
      let state = {
        foo: "bar"
      };
      let target = {
        foo: "baz"
      };
      assert.deepEqual(Plan.plan(schema, state, target), [
        {
          name: "foo",
          oldValue: "bar",
          targetValue: "baz"
        }
      ]);
    });
  });
});
