module.exports = class SchemaParser {
  static parse(drivers, data) {
    var settings = [];
    if (data && data.orgPreferences) {
      if (Array.isArray(data.orgPreferences.enabled)) {
        for (let driverName of data.orgPreferences.enabled) {
          if (drivers[driverName]) {
            settings.push({
              Driver: drivers[driverName],
              value: {
                enabled: true
              }
            });
          }
        }
      }
      if (Array.isArray(data.orgPreferences.disabled)) {
        for (let driverName of data.orgPreferences.disabled) {
          if (drivers[driverName]) {
            settings.push({
              Driver: drivers[driverName],
              value: {
                enabled: false
              }
            });
          }
        }
      }
    }
    return settings;
  }
};
