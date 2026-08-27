import { ActivitySettings as activitySettings } from './activity-settings/index.js';
import { AuthProviders as authProviders } from './auth-providers/index.js';
import { CompanyInformation as companyInformation } from './company-information/index.js';
import { CustomerPortal as customerPortal } from './customer-portal/index.js';
import { DensitySettings as densitySettings } from './density-settings/index.js';
import { EmailDeliverability as emailDeliverability } from './email-deliverability/index.js';
import { HighVelocitySalesSettings as highVelocitySalesSettings } from './high-velocity-sales-settings/index.js';
import { HistoryTracking as historyTracking } from './history-tracking/index.js';
import { HomePageLayouts as homePageLayouts } from './home-page-layouts/index.js';
import { LightningExperienceSettings as lightningExperienceSettings } from './lightning-experience-settings/index.js';
import { ListViewCustomButtons as listViewCustomButtons } from './list-view-custom-buttons/index.js';
import { LinkedInSalesNavigatorSettings as linkedInSalesNavigatorSettings } from './linkedin-sales-navigator-settings/index.js';
import { OmniChannelSettings as omniChannelSettings } from './omni-channel-settings/index.js';
import { OpportunitySplits as opportunitySplits } from './opportunity-splits/index.js';
import { PermissionSets as permissionSets } from './permission-sets/index.js';
import { Picklists as picklists } from './picklists/index.js';
import { RecordTypes as recordTypes } from './record-types/index.js';
import { RelateContactToMultipleAccounts as relateContactToMultipleAccounts } from './relate-contact-to-multiple-accounts/index.js';
import { ReportsAndDashboards as reportsAndDashboards } from './reports-and-dashboards/index.js';
import { SalesforceCpqConfig as salesforceCpqConfig } from './salesforce-cpq-config/index.js';
import { SalesforceToSalesforce as salesforceToSalesforce } from './salesforce-to-salesforce/index.js';
import { Security as security } from './security/index.js';
import { ServiceChannels as serviceChannels } from './service-channels/index.js';
import { Slack as slack } from './slack/index.js';
import { UserAccessPolicies as userAccessPolicies } from './user-access-policies/index.js';

export {
  activitySettings,
  authProviders,
  companyInformation,
  customerPortal,
  densitySettings,
  emailDeliverability,
  highVelocitySalesSettings,
  historyTracking,
  homePageLayouts,
  lightningExperienceSettings,
  listViewCustomButtons,
  linkedInSalesNavigatorSettings,
  omniChannelSettings,
  opportunitySplits,
  permissionSets,
  picklists,
  recordTypes,
  relateContactToMultipleAccounts,
  reportsAndDashboards,
  salesforceCpqConfig,
  salesforceToSalesforce,
  security,
  serviceChannels,
  slack,
  userAccessPolicies,
};

import { z } from 'zod';
import { schema as activitySettingsSchema } from './activity-settings/schema.js';
import { schema as authProvidersSchema } from './auth-providers/schema.js';
import { schema as companyInformationSchema } from './company-information/schema.js';
import { schema as customerPortalSchema } from './customer-portal/schema.js';
import { schema as densitySettingsSchema } from './density-settings/schema.js';
import { schema as emailDeliverabilitySchema } from './email-deliverability/schema.js';
import { schema as highVelocitySalesSettingsSchema } from './high-velocity-sales-settings/schema.js';
import { schema as historyTrackingSchema } from './history-tracking/schema.js';
import { schema as homePageLayoutsSchema } from './home-page-layouts/schema.js';
import { schema as lightningExperienceSettingsSchema } from './lightning-experience-settings/schema.js';
import { schema as listViewCustomButtonsSchema } from './list-view-custom-buttons/schema.js';
import { schema as linkedInSalesNavigatorSettingsSchema } from './linkedin-sales-navigator-settings/schema.js';
import { schema as omniChannelSettingsSchema } from './omni-channel-settings/schema.js';
import { schema as opportunitySplitsSchema } from './opportunity-splits/schema.js';
import { schema as permissionSetsSchema } from './permission-sets/schema.js';
import { schema as picklistsSchema } from './picklists/schema.js';
import { schema as recordTypesSchema } from './record-types/schema.js';
import { schema as relateContactToMultipleAccountsSchema } from './relate-contact-to-multiple-accounts/schema.js';
import { schema as reportsAndDashboardsSchema } from './reports-and-dashboards/schema.js';
import { schema as salesforceCpqConfigSchema } from './salesforce-cpq-config/schema.js';
import { schema as salesforceToSalesforceSchema } from './salesforce-to-salesforce/schema.js';
import { schema as securitySchema } from './security/schema.js';
import { schema as serviceChannelsSchema } from './service-channels/schema.js';
import { schema as slackSchema } from './slack/schema.js';
import { schema as userAccessPoliciesSchema } from './user-access-policies/schema.js';

const drivers = {
  activitySettings,
  authProviders,
  companyInformation,
  customerPortal,
  densitySettings,
  emailDeliverability,
  highVelocitySalesSettings,
  historyTracking,
  homePageLayouts,
  lightningExperienceSettings,
  listViewCustomButtons,
  linkedInSalesNavigatorSettings,
  omniChannelSettings,
  opportunitySplits,
  permissionSets,
  picklists,
  recordTypes,
  relateContactToMultipleAccounts,
  reportsAndDashboards,
  salesforceCpqConfig,
  salesforceToSalesforce,
  security,
  serviceChannels,
  slack,
  userAccessPolicies,
} as const;

export const schemas: Record<keyof typeof drivers, z.ZodType> = {
  activitySettings: activitySettingsSchema,
  authProviders: authProvidersSchema,
  companyInformation: companyInformationSchema,
  customerPortal: customerPortalSchema,
  densitySettings: densitySettingsSchema,
  emailDeliverability: emailDeliverabilitySchema,
  highVelocitySalesSettings: highVelocitySalesSettingsSchema,
  historyTracking: historyTrackingSchema,
  homePageLayouts: homePageLayoutsSchema,
  lightningExperienceSettings: lightningExperienceSettingsSchema,
  listViewCustomButtons: listViewCustomButtonsSchema,
  linkedInSalesNavigatorSettings: linkedInSalesNavigatorSettingsSchema,
  omniChannelSettings: omniChannelSettingsSchema,
  opportunitySplits: opportunitySplitsSchema,
  permissionSets: permissionSetsSchema,
  picklists: picklistsSchema,
  recordTypes: recordTypesSchema,
  relateContactToMultipleAccounts: relateContactToMultipleAccountsSchema,
  reportsAndDashboards: reportsAndDashboardsSchema,
  salesforceCpqConfig: salesforceCpqConfigSchema,
  salesforceToSalesforce: salesforceToSalesforceSchema,
  security: securitySchema,
  serviceChannels: serviceChannelsSchema,
  slack: slackSchema,
  userAccessPolicies: userAccessPoliciesSchema,
};
