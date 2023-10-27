import { BrowserforcePlugin } from '../../plugin';
import {
  CertificateAndKeyManagement,
  Config as CertificateAndKeyManagementConfig
} from './certificate-and-key-management';
import { IdentityProvider, Config as IdentityProviderConfig } from './identity-provider';
import { LoginAccessPolicies, Config as LoginAccessPoliciesConfig } from './login-access-policies';
import { Sharing, Config as SharingConfig } from './sharing';

type Config = {
  certificateAndKeyManagement?: CertificateAndKeyManagementConfig;
  identityProvider?: IdentityProviderConfig;
  loginAccessPolicies?: LoginAccessPoliciesConfig;
  sharing?: SharingConfig;
};

export class Security extends BrowserforcePlugin {
  public async retrieve(definition?: Config): Promise<Config> {
    const response: Config = {};
    if (definition) {
      if (definition.certificateAndKeyManagement) {
        const pluginCKM = new CertificateAndKeyManagement(this.browserforce);
        response.certificateAndKeyManagement = await pluginCKM.retrieve(definition.certificateAndKeyManagement);
      }
      if (definition.identityProvider) {
        const pluginIdentityProvider = new IdentityProvider(this.browserforce);
        response.identityProvider = await pluginIdentityProvider.retrieve();
      }
      if (definition.loginAccessPolicies) {
        const pluginLoginAccessPolicies = new LoginAccessPolicies(this.browserforce);
        response.loginAccessPolicies = await pluginLoginAccessPolicies.retrieve();
      }
      if (definition.sharing) {
        const pluginSharing = new Sharing(this.browserforce);
        response.sharing = await pluginSharing.retrieve();
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config | undefined {
    const certificateAndKeyManagement = new CertificateAndKeyManagement(this.browserforce).diff(
      state.certificateAndKeyManagement,
      definition.certificateAndKeyManagement
    );
    const identityProvider = new IdentityProvider(this.browserforce).diff(
      state.identityProvider,
      definition.identityProvider
    ) as IdentityProviderConfig | undefined;
    const loginAccessPolicies = new LoginAccessPolicies(this.browserforce).diff(
      state.loginAccessPolicies,
      definition.loginAccessPolicies
    ) as LoginAccessPoliciesConfig | undefined;
    const sharing = new Sharing(this.browserforce).diff(state.sharing, definition.sharing) as SharingConfig | undefined;
    const response: Config = {};
    if (certificateAndKeyManagement !== undefined) {
      response.certificateAndKeyManagement = certificateAndKeyManagement;
    }
    if (identityProvider !== undefined) {
      response.identityProvider = identityProvider;
    }
    if (loginAccessPolicies !== undefined) {
      response.loginAccessPolicies = loginAccessPolicies;
    }
    if (loginAccessPolicies !== undefined) {
      response.loginAccessPolicies = loginAccessPolicies;
    }
    if (sharing !== undefined) {
      response.sharing = sharing;
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
    if (plan.loginAccessPolicies) {
      const pluginLoginAccessPolicies = new LoginAccessPolicies(this.browserforce);
      await pluginLoginAccessPolicies.apply(plan.loginAccessPolicies);
    }
    if (plan.sharing) {
      const pluginSharing = new Sharing(this.browserforce);
      await pluginSharing.apply(plan.sharing);
    }
  }
}
