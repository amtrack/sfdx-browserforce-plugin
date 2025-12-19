import { BrowserforcePlugin } from '../../plugin.js';
import {
  AuthenticationConfiguration,
  Config as AuthenticationConfigurationConfig,
} from './authentication-configuration/index.js';
import {
  CertificateAndKeyManagement,
  Config as CertificateAndKeyManagementConfig,
} from './certificate-and-key-management/index.js';

type Config = {
  certificateAndKeyManagement?: CertificateAndKeyManagementConfig;
  authenticationConfiguration?: AuthenticationConfigurationConfig;
};

export class Security extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {};
    if (definition) {
      if (definition.certificateAndKeyManagement) {
        const pluginCKM = new CertificateAndKeyManagement(this.browserforce);
        response.certificateAndKeyManagement = await pluginCKM.retrieve(definition.certificateAndKeyManagement);
      }
      if (definition.authenticationConfiguration) {
        response.authenticationConfiguration = await new AuthenticationConfiguration(this.browserforce).retrieve(
          definition.authenticationConfiguration,
        );
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const certificateAndKeyManagement = new CertificateAndKeyManagement(this.browserforce).diff(
      state.certificateAndKeyManagement,
      definition.certificateAndKeyManagement,
    );
    const authenticationConfiguration = new AuthenticationConfiguration(this.browserforce).diff(
      state.authenticationConfiguration,
      definition.authenticationConfiguration,
    ) as AuthenticationConfigurationConfig | undefined;
    const response: Config = {};
    if (certificateAndKeyManagement !== undefined) {
      response.certificateAndKeyManagement = certificateAndKeyManagement;
    }
    if (authenticationConfiguration !== undefined) {
      response.authenticationConfiguration = authenticationConfiguration;
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.certificateAndKeyManagement) {
      const pluginCKM = new CertificateAndKeyManagement(this.browserforce);
      await pluginCKM.apply(plan.certificateAndKeyManagement);
    }
    if (plan.authenticationConfiguration) {
      const pluginAuthConfig = new AuthenticationConfiguration(this.browserforce);
      await pluginAuthConfig.apply(plan.authenticationConfiguration);
    }
  }
}
