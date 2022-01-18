import STANDARDVALUESET_MAPPING from '@mdapi-issues/listmetadata-standardvalueset/lib/mapping';

const editUrl = (id: string, type: string) =>
  `_ui/common/config/field/StandardFieldAttributes/d?id=${id}&type=${type}`;
const editUrlMasterDetail = (tid: string, pt: string) =>
  `setup/ui/picklist_masterdetail.jsp?tid=${tid}&pt=${pt}`;

const mapping = {
  AccountContactMultiRoles: editUrl('Roles', 'AccountContactRelation'),
  AccountContactRole: editUrlMasterDetail('02Z', '38'),
  AccountOwnership: editUrl('Ownership', 'Account'),
  AccountRating: editUrl('Rating', 'Account'),
  AccountType: editUrl('Type', 'Account'),
  AssetStatus: editUrl('Status', 'Asset'),
  CampaignMemberStatus: editUrl('Status', 'CampaignMember'),
  CampaignStatus: editUrl('Status', 'Campaign'),
  CampaignType: editUrl('Type', 'Campaign'),
  CareItemStatus2: '',
  CaseContactRole: editUrlMasterDetail('03j', '45'),
  CaseOrigin: editUrl('Origin', 'Case'),
  CasePriority: editUrl('Priority', 'Case'),
  CaseReason: editUrl('Reason', 'Case'),
  CaseStatus: editUrl('Status', 'Case'),
  CaseType: editUrl('Type', 'Case'),
  ContactRole: editUrlMasterDetail('00K', '11'),
  ContractContactRole: editUrlMasterDetail('021', '39'),
  ContractStatus: editUrl('Status', 'Contract'),
  EntitlementType: editUrl('Type', 'Entitlement'),
  EventSubject: editUrl('Subject', 'Event'),
  EventType: editUrl('Type', 'Event'),
  FiscalYearPeriodName: '',
  FiscalYearPeriodPrefix: '',
  FiscalYearQuarterName: '',
  FiscalYearQuarterPrefix: '',
  ForecastCategoryName: editUrl('ForecastCategoryName', 'Opportunity'),
  IdeaMultiCategory: editUrl('Categories', 'Idea'),
  IdeaStatus: editUrl('Status', 'Idea'),
  IdeaThemeStatus: editUrl('Status', 'IdeaTheme'),
  Industry: editUrl('Industry', 'Lead'),
  LeadSource: editUrl('LeadSource', 'Lead'),
  LeadStatus: editUrl('Status', 'Lead'),
  OpportunityCompetitor: editUrlMasterDetail('00J', '35'),
  OpportunityStage: editUrl('StageName', 'Opportunity'),
  OpportunityType: editUrl('Type', 'Opportunity'),
  OrderType: editUrl('Type', 'Order'),
  PartnerRole: editUrlMasterDetail('00I', '17'),
  Product2Family: editUrl('Family', 'Product2'),
  QuickTextCategory: editUrl('Category', 'QuickText'),
  QuickTextChannel: editUrl('Channel', 'QuickText'),
  QuoteStatus: editUrl('Status', 'Quote'),
  RoleInTerritory2: '',
  ResourceAbsenceType: editUrl('Type', 'ResourceAbsence'),
  SalesTeamRole: editUrl('TeamMemberRole', 'OpportunityTeamMember'),
  Salutation: editUrlMasterDetail('003', '8'),
  ServiceAppointmentStatus: editUrl('Status', 'ServiceAppointment'),
  ServiceContractApprovalStatus: editUrl('ApprovalStatus', 'ServiceContract'),
  ServTerrMemRoleType: '',
  SocialPostClassification: '',
  SocialPostEngagementLevel: '',
  SocialPostReviewedStatus: '',
  SolutionStatus: editUrl('Status', 'Solution'),
  TaskPriority: editUrl('Priority', 'Task'),
  TaskStatus: editUrl('Status', 'Task'),
  TaskSubject: editUrl('Subject', 'Task'),
  TaskType: editUrl('Type', 'Task'),
  WorkOrderLineItemStatus: editUrl('Status', 'WorkOrderLineItem'),
  WorkOrderPriority: editUrl('Priority', 'WorkOrder'),
  WorkOrderStatus: editUrl('Status', 'WorkOrder'),
  WorkTypeDefApptType: '',
  WorkTypeGroupAddInfo: ''
};

export function determineStandardValueSetEditUrl(
  standardValueSet: string
): string {
  if (mapping[standardValueSet] !== '') {
    return mapping[standardValueSet];
  } else {
    const standardField = Object.keys(STANDARDVALUESET_MAPPING).find(
      key => STANDARDVALUESET_MAPPING[key] === standardValueSet
    );
    if (!standardField) {
      throw new Error(
        `Could not determine Edit URL for StandardValueSet:${standardValueSet}`
      );
    }
    return editUrl(standardValueSet, standardField.split('.')[0]);
  }
}
