import { BrowserforcePlugin } from '../../plugin';
import { removeEmptyValues } from '../utils';
import {
  Config as CertificateAndKeyManagementConfig,
  CertificateAndKeyManagement
} from './certificate-and-key-management';
import {
  Config as IdentityProviderConfig,
  IdentityProvider
} from './identity-provider';
import {
  Config as LoginAccessPoliciesConfig,
  LoginAccessPolicies
} from './login-access-policies';
import { Config as SharingConfig, Sharing } from './sharing';

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
        const pluginCKM = new CertificateAndKeyManagement(
          this.browserforce,
          this.org
        );
        response.certificateAndKeyManagement = await pluginCKM.retrieve(
          definition.certificateAndKeyManagement
        );
      }
      if (definition.identityProvider) {
        const pluginIdentityProvider = new IdentityProvider(
          this.browserforce,
          this.org
        );
        response.identityProvider = await pluginIdentityProvider.retrieve(
          definition.identityProvider
        );
      }
      if (definition.loginAccessPolicies) {
        const pluginLoginAccessPolicies = new LoginAccessPolicies(
          this.browserforce,
          this.org
        );
        response.loginAccessPolicies = await pluginLoginAccessPolicies.retrieve(
          definition.loginAccessPolicies
        );
      }
      if (definition.sharing) {
        const pluginSharing = new Sharing(this.browserforce, this.org);
        response.sharing = await pluginSharing.retrieve(definition.sharing);
      }
    }
    return response;
  }

  public diff(state: Config, definition: Config): Config {
    const pluginCKM = new CertificateAndKeyManagement(null, null);
    const pluginIdentityProvider = new IdentityProvider(null, null);
    const pluginLoginAccessPolicies = new LoginAccessPolicies(null, null);
    const pluginSharing = new Sharing(null, null);
    const response = {
      certificateAndKeyManagement: pluginCKM.diff(
        state.certificateAndKeyManagement,
        definition.certificateAndKeyManagement
      ),
      identityProvider: pluginIdentityProvider.diff(
        state.identityProvider,
        definition.identityProvider
      ),
      loginAccessPolicies: pluginLoginAccessPolicies.diff(
        state.loginAccessPolicies,
        definition.loginAccessPolicies
      ),
      sharing: pluginSharing.diff(state.sharing, definition.sharing)
    };
    return removeEmptyValues(response);
  }

  public async apply(plan: Config): Promise<void> {
    if (plan.certificateAndKeyManagement) {
      const pluginCKM = new CertificateAndKeyManagement(
        this.browserforce,
        this.org
      );
      await pluginCKM.apply(plan.certificateAndKeyManagement);
    }
    if (plan.identityProvider) {
      const pluginIdentityProvider = new IdentityProvider(
        this.browserforce,
        this.org
      );
      await pluginIdentityProvider.apply(plan.identityProvider);
    }
    if (plan.loginAccessPolicies) {
      const pluginLoginAccessPolicies = new LoginAccessPolicies(
        this.browserforce,
        this.org
      );
      await pluginLoginAccessPolicies.apply(plan.loginAccessPolicies);
    }
    if (plan.sharing) {
      const pluginSharing = new Sharing(this.browserforce, this.org);
      await pluginSharing.apply(plan.sharing);
    }
  }
}
