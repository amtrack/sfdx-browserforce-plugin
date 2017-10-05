"use strict";

const cmdApply = require("./commands/shape-apply.js");

(function() {
  "use strict";
  exports.topics = [
    {
      name: "shape",
      description: "commands for shape"
    }
  ];
  exports.namespace = {
    name: "browserforce",
    description: "Various commands for browserforce"
  };
  exports.commands = [cmdApply];
})();
