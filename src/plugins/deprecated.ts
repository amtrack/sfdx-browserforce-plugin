export const DEPRECATED_DRIVERS = ['communities'];

export const handleDeprecations = (definition: { settings: unknown }) => {
  for (const driverName of Object.keys(definition.settings)) {
    if (DEPRECATED_DRIVERS.includes(driverName)) {
      throw new Error(
        `The sfdx-browserforce-plugin setting '${driverName}' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#${driverName}.`
      );
    }
    if (driverName === 'security') {
      if (definition.settings[driverName]?.loginAccessPolicies !== undefined) {
        throw new Error(
          `The sfdx-browserforce-plugin setting 'security.loginAccessPolicies' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#security-loginaccesspolicies-administratorscanloginasanyuser.`
        );
      }
    }
  }
};
