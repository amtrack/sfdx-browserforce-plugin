export const DEPRECATED_DRIVERS = ['communities', 'defer-sharing-calculation'];

export const handleDeprecations = (definition: { settings: unknown }) => {
  for (const driverName of Object.keys(definition.settings)) {
    if (DEPRECATED_DRIVERS.includes(driverName)) {
      throw new Error(
        `The sfdx-browserforce-plugin setting '${driverName}' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#${driverName}.`,
      );
    }
    if (driverName === 'security') {
      if (definition.settings[driverName]?.loginAccessPolicies !== undefined) {
        throw new Error(
          `The sfdx-browserforce-plugin setting 'security.loginAccessPolicies' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#security-loginaccesspolicies-administratorscanloginasanyuser.`,
        );
      }
      if (definition.settings[driverName]?.identityProvider !== undefined) {
        throw new Error(
          `The sfdx-browserforce-plugin setting 'security.identityProvider' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#security-identityprovider.`,
        );
      }
      if (definition.settings[driverName]?.sharing !== undefined) {
        throw new Error(
          `The sfdx-browserforce-plugin setting 'security.sharing' is deprecated and has been removed.
✅ Salesforce now supports this setting in the Metadata API.
👉 Please see the instructions at https://github.com/amtrack/sfdx-browserforce-plugin/wiki/Hall-of-Fame#security-sharing.`,
        );
      }
    }
  }
};
