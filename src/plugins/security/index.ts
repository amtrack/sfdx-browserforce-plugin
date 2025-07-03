import { BrowserforcePlugin } from '../../plugin.js';
import {
  AuthenticationConfiguration,
  Config as AuthenticationConfigurationConfig,
} from './authentication-configuration/index.js';
import {
  CertificateAndKeyManagement,
  Config as CertificateAndKeyManagementConfig,
} from './certificate-and-key-management/index.js';
import {
  IdentityProvider,
  Config as IdentityProviderConfig,
} from './identity-provider/index.js';
import { Sharing, Config as SharingConfig } from './sharing/index.js';

type Config = {
  certificateAndKeyManagement?: CertificateAndKeyManagementConfig;
  identityProvider?: IdentityProviderConfig;
  sharing?: SharingConfig;
  authenticationConfiguration?: AuthenticationConfigurationConfig;
};

export class Security extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {};
    if (definition) {
      if (definition.certificateAndKeyManagement) {
        const pluginCKM = new CertificateAndKeyManagement(this.browserforce);
        response.certificateAndKeyManagement = await pluginCKM.retrieve(
          definition.certificateAndKeyManagement
        );
      }
      if (definition.identityProvider) {
        const pluginIdentityProvider = new IdentityProvider(this.browserforce);
        response.identityProvider = await pluginIdentityProvider.retrieve();
      }
      if (definition.sharing) {
        const pluginSharing = new Sharing(this.browserforce);
        response.sharing = await pluginSharing.retrieve();
      }
      if (definition.authenticationConfiguration) {
        response.authenticationConfiguration =
          await new AuthenticationConfiguration(this.browserforce).retrieve(
            definition.authenticationConfiguration
          );
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const certificateAndKeyManagement = new CertificateAndKeyManagement(
      this.browserforce
    ).diff(
      state.certificateAndKeyManagement,
      definition.certificateAndKeyManagement
    );
    const identityProvider = new IdentityProvider(this.browserforce).diff(
      state.identityProvider,
      definition.identityProvider
    ) as IdentityProviderConfig | undefined;
    const sharing = new Sharing(this.browserforce).diff(
      state.sharing,
      definition.sharing
    ) as SharingConfig | undefined;
    const authenticationConfiguration = new AuthenticationConfiguration(
      this.browserforce
    ).diff(
      state.authenticationConfiguration,
      definition.authenticationConfiguration
    ) as AuthenticationConfigurationConfig | undefined;
    const response: Config = {};
    if (certificateAndKeyManagement !== undefined) {
      response.certificateAndKeyManagement = certificateAndKeyManagement;
    }
    if (identityProvider !== undefined) {
      response.identityProvider = identityProvider;
    }
    if (sharing !== undefined) {
      response.sharing = sharing;
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
    if (plan.identityProvider) {
      const pluginIdentityProvider = new IdentityProvider(this.browserforce);
      await pluginIdentityProvider.apply(plan.identityProvider);
    }
    if (plan.sharing) {
      const pluginSharing = new Sharing(this.browserforce);
      await pluginSharing.apply(plan.sharing);
    }
    if (plan.authenticationConfiguration) {
      const pluginAuthConfig = new AuthenticationConfiguration(
        this.browserforce
      );
      await pluginAuthConfig.apply(plan.authenticationConfiguration);
    }
  }
}
