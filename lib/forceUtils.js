const path = require("path");
const almPath = path.dirname(require.resolve("salesforce-alm"));
const Org = require(path.join(almPath, "lib", "scratchOrgApi"));

module.exports = {
  getOrg: (targetUsername, result) => {
    return Org.create(targetUsername).then(result);
  }
};
