export default class SchemaParser {
  public static parse(drivers, data) {
    const settings = [];
    if (data && data.orgPreferences) {
      if (Array.isArray(data.orgPreferences.enabled)) {
        for (const driverName of data.orgPreferences.enabled) {
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
        for (const driverName of data.orgPreferences.disabled) {
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
}
