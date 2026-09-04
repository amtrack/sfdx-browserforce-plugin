import { z } from 'zod';
import { composePlugin } from '../../plugin.js';
import {
  AuthenticationConfiguration,
  AuthenticationConfigurationConfig,
  authenticationConfigurationSchema,
} from './authentication-configuration/index.js';
import {
  CertificateAndKeyManagement,
  CertificateAndKeyManagementConfig,
  certificateAndKeyManagementSchema,
} from './certificate-and-key-management/index.js';

export const securitySchema = z
  .object({
    certificateAndKeyManagement: certificateAndKeyManagementSchema.optional(),
    authenticationConfiguration: authenticationConfigurationSchema.optional(),
  })
  .meta({ id: 'security', title: 'Security Controls' });

type SecurityConfig = {
  certificateAndKeyManagement?: CertificateAndKeyManagementConfig;
  authenticationConfiguration?: AuthenticationConfigurationConfig;
};

export const Security = composePlugin<SecurityConfig>('Security', {
  certificateAndKeyManagement: CertificateAndKeyManagement,
  authenticationConfiguration: AuthenticationConfiguration,
});
