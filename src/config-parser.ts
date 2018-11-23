export default class ConfigParser {
  public static parse(drivers, data) {
    const settings = [];
    if (data && data.settings) {
      for (const driverName of Object.keys(data.settings)) {
        if (drivers[driverName]) {
          settings.push({
            Driver: drivers[driverName],
            key: driverName,
            value: data.settings[driverName]
          });
        }
      }
    }
    return settings;
  }
}
