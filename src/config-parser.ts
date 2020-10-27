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
        } else {
          throw new Error(
            `Could not find plugin named '${driverName}' in definition: ${JSON.stringify(
              data
            )}`
          );
        }
      }
    } else {
      throw new Error(
        `Missing 'settings' attribute in definition: ${JSON.stringify(data)}`
      );
    }
    return settings;
  }
}
