import { z } from 'zod';
import { BrowserforcePlugin } from '../../plugin.js';
import {
  AuthenticationConfiguration,
  authenticationConfigurationSchema,
  AuthenticationConfigurationConfig,
} from './authentication-configuration/index.js';
import {
  CertificateAndKeyManagement,
  certificateAndKeyManagementSchema,
  CertificateAndKeyManagementConfig,
} from './certificate-and-key-management/index.js';

export const securitySchema = z
  .object({
    certificateAndKeyManagement: certificateAndKeyManagementSchema.optional(),
    authenticationConfiguration: authenticationConfigurationSchema.optional(),
  })
  .meta({
    id: 'security',
    title: 'Security Controls',
    description: [
      '**Certificate and Key Management**: Setup **Security → Certificate and Key Management** (`/lightning/setup/CertificatesAndKeysManagement/home`). Imports certificates from a Java Keystore (JKS) and creates self-signed certificates.',
      '',
      '![Import Certificate from Keystore](docs/assets/settings/security-certificate-and-key-management.png)',
      '',
      '**Authentication Configuration**: Setup **Company Settings → My Domain** (`/lightning/setup/OrgDomain/home`). Toggles the authentication services of the Authentication Configuration section.',
      '',
      '![Authentication Configuration](docs/assets/settings/security-authentication-configuration.png)',
    ].join('\n'),
    examples: [
      {
        certificateAndKeyManagement: {
          certificates: [{ name: 'MySelfSignedCert', label: 'My Self Signed Cert', keysize: 2048, exportable: true }],
        },
      },
      {
        certificateAndKeyManagement: {
          importFromKeystore: [{ name: 'MyCert', filePath: 'certs/keystore.jks', password: '${KEYSTORE_PASSWORD}' }],
        },
      },
    ],
  });

type SecurityConfig = {
  certificateAndKeyManagement?: CertificateAndKeyManagementConfig;
  authenticationConfiguration?: AuthenticationConfigurationConfig;
};

export class Security extends BrowserforcePlugin {
  public async retrieve(definition?: SecurityConfig): Promise<SecurityConfig> {
    const response: SecurityConfig = {};
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

  public diff(state: SecurityConfig, definition: SecurityConfig): SecurityConfig | undefined {
    const certificateAndKeyManagement = new CertificateAndKeyManagement(this.browserforce).diff(
      state.certificateAndKeyManagement,
      definition.certificateAndKeyManagement,
    );
    const authenticationConfiguration = new AuthenticationConfiguration(this.browserforce).diff(
      state.authenticationConfiguration,
      definition.authenticationConfiguration,
    ) as AuthenticationConfigurationConfig | undefined;
    const response: SecurityConfig = {};
    if (certificateAndKeyManagement !== undefined) {
      response.certificateAndKeyManagement = certificateAndKeyManagement;
    }
    if (authenticationConfiguration !== undefined) {
      response.authenticationConfiguration = authenticationConfiguration;
    }
    return Object.keys(response).length ? response : undefined;
  }

  public async apply(plan: SecurityConfig): Promise<void> {
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
