const salesforcePrettierConfig = require('@salesforce/prettier-config');

module.exports = {
  ...salesforcePrettierConfig,
  trailingComma: 'none'
};
