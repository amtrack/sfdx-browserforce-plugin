"use strict";
/* eslint-disable capitalized-comments */

const path = require("path");
const Promise = require("bluebird");

const forceUtils = require("../lib/forceUtils.js");
const Browserforce = require("../lib/browser");
// const Browserforce = require("../lib/browserforce");
const Plan = require("../lib/plan");
const SchemaParser = require("../lib/schema-parser");

module.exports = {
  topic: "shape",
  command: "apply",
  description: "apply an org shape",
  help: "help text for browserforce:shape:apply",
  flags: [
    {
      name: "definitionfile",
      char: "f",
      description: "path to a browserforce definition file",
      hasValue: true
    },
    {
      name: "targetusername",
      char: "u",
      description: "username for the target org",
      hasValue: true
    }
  ],
  run(context) {
    // new Browserforce().then(function(bf) {
    //   return bf.login(org);
    // });
    // headless: !(process.env.BROWSER_DEBUG === "true");
    const DRIVERS = {
      ExternalSharing: require("../plugins/external-sharing"),
      CustomerPortal: require("../plugins/customer-portal")
    };

    const targetUsername = context.flags.targetusername;
    const definitionfile = context.flags.definitionfile;

    let definition = require(path.resolve(definitionfile));
    const settings = SchemaParser.parse(DRIVERS, definition);
    let org;
    let bf;
    return forceUtils
      .getOrg(targetUsername)
      .then(function(orgResult) {
        org = orgResult;
        console.log(
          `Applying plan file ${definitionfile} to org ${
            org.authConfig.username
          }`
        );
        bf = new Browserforce(org);
      })
      .then(function() {
        return bf.login();
      })
      .then(function() {
        // return Promise.mapSeries(["hi", "hi2"], resolveInputAfter3Seconds);
        return Promise.mapSeries(settings, function(setting) {
          // return Promise.delay(3000, "hi");
          let instance = new setting.Driver(bf.browser, org.authConfig);
          return instance
            .retrieve()
            .then(function(state) {
              return Plan.plan(setting.Driver.schema, state, setting.value);
            })
            .then(function(actions) {
              Plan.debug(actions);
              return instance.apply(actions);
            });
        });
      })
      .then(function() {
        return bf.logout();
      })
      .then(function() {
        console.log("done");
        process.exit(0);
      })
      .catch(function(err) {
        console.error(err.message);
        process.exit(1);
      });
  }
};
