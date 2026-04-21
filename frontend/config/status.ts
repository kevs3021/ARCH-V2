// Request Status Definitions
// "The Financial Atelier" - Status configuration for financial requests

export type RequestStatusType = 
  | 'open'
  | 'for_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'for_crediting'
  | 'credited'
  | 'for_liquidation'
  | 'liquidated'
  | 'validated'
  | 'closed';

export interface RequestStatusConfig {
  value: RequestStatusType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  nextStatuses: RequestStatusType[];
}

export const REQUEST_STATUSES: Record<RequestStatusType, RequestStatusConfig> = {
  open: {
    value: 'open',
    label: 'Open',
    description: 'Request is open and being prepared',
    color: '#C0392B',
    bgColor: '#FDECEA',
    icon: 'file-edit',
    nextStatuses: ['for_approval', 'cancelled'],
  },
  for_approval: {
    value: 'for_approval',
    label: 'For Approval',
    description: 'Awaiting approval',
    color: '#E67E22',
    bgColor: '#FEF3E2',
    icon: 'clock',
    nextStatuses: ['approved', 'rejected', 'cancelled'],
  },
  approved: {
    value: 'approved',
    label: 'Approved',
    description: 'Request has been approved',
    color: '#E65C00',
    bgColor: '#FFF0E6',
    icon: 'check-circle',
    nextStatuses: ['for_liquidation', 'closed', 'rejected', 'cancelled'],
  },
  rejected: {
    value: 'rejected',
    label: 'Rejected',
    description: 'Request was not approved',
    color: '#C0392B',
    bgColor: '#FDECEA',
    icon: 'x-circle',
    nextStatuses: ['cancelled'],
  },
  cancelled: {
    value: 'cancelled',
    label: 'Cancelled',
    description: 'Request was cancelled',
    color: '#95A5A6',
    bgColor: '#F2F3F4',
    icon: 'trash',
    nextStatuses: [],
  },
  for_liquidation: {
    value: 'for_liquidation',
    label: 'For Liquidation',
    description: 'Awaiting liquidation',
    color: '#2980B9',
    bgColor: '#EBF5FB',
    icon: 'file-text',
    nextStatuses: ['liquidated', 'cancelled'],
  },
  liquidated: {
    value: 'liquidated',
    label: 'Liquidated',
    description: 'Liquidation has been submitted',
    color: '#1A5276',
    bgColor: '#D6EAF8',
    icon: 'check-double',
    nextStatuses: ['validated', 'for_liquidation', 'cancelled'],
  },
  validated: {
    value: 'validated',
    label: 'Validated',
    description: 'Liquidation has been validated',
    color: '#27AE60',
    bgColor: '#EAFAF1',
    icon: 'shield-check',
    nextStatuses: ['closed', 'cancelled'],
  },
  for_crediting: {
    value: 'for_crediting',
    label: 'For Crediting',
    description: 'Awaiting crediting',
    color: '#D4AC0D',
    bgColor: '#FEF9E7',
    icon: 'credit-card',
    nextStatuses: ['credited', 'cancelled'],
  },
  credited: {
    value: 'credited',
    label: 'Credited',
    description: 'Funds have been credited',
    color: '#9C7C00',
    bgColor: '#FFF3CD',
    icon: 'banknote',
    nextStatuses: ['for_liquidation', 'cancelled'],
  },
  closed: {
    value: 'closed',
    label: 'Closed',
    description: 'Request has been fully processed and closed',
    color: '#2C3E50',
    bgColor: '#EAECEE',
    icon: 'lock',
    nextStatuses: [],
  },
};

// Liquidation Status Definitions
export type LiquidationStatusType = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'reconciled';

export interface LiquidationStatusConfig {
  value: LiquidationStatusType;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  nextStatuses: LiquidationStatusType[];
}

export const LIQUIDATION_STATUSES: Record<LiquidationStatusType, LiquidationStatusConfig> = {
  draft: {
    value: 'draft',
    label: 'Draft',
    description: 'Liquidation is being prepared',
    color: '#49454F',
    bgColor: '#E8E8E8',
    icon: 'file-edit',
    nextStatuses: ['pending_review'],
  },
  pending_review: {
    value: 'pending_review',
    label: 'Pending Review',
    description: 'Awaiting financial review',
    color: '#5E2BC3',
    bgColor: '#EDE7F6',
    icon: 'clock',
    nextStatuses: ['approved', 'rejected'],
  },
  approved: {
    value: 'approved',
    label: 'Approved',
    description: 'Liquidation has been approved',
    color: '#0F7B4A',
    bgColor: '#D6F5E5',
    icon: 'check-circle',
    nextStatuses: ['reconciled'],
  },
  rejected: {
    value: 'rejected',
    label: 'Rejected',
    description: 'Liquidation was not approved',
    color: '#B3261E',
    bgColor: '#FFDDD6',
    icon: 'x-circle',
    nextStatuses: ['draft'],
  },
  reconciled: {
    value: 'reconciled',
    label: 'Reconciled',
    description: 'Funds have been reconciled',
    color: '#0F7B4A',
    bgColor: '#D6F5E5',
    icon: 'check-double',
    nextStatuses: [],
  },
};

// Priority Definitions
export type PriorityType = 'low' | 'medium' | 'high' | 'urgent';

export interface PriorityConfig {
  value: PriorityType;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const PRIORITIES: Record<PriorityType, PriorityConfig> = {
  low: {
    value: 'low',
    label: 'Low',
    color: '#49454F',
    bgColor: '#E8E8E8',
    icon: 'arrow-down',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: '#5E2BC3',
    bgColor: '#EDE7F6',
    icon: 'minus',
  },
  high: {
    value: 'high',
    label: 'High',
    color: '#DC6803',
    bgColor: '#FFF4E5',
    icon: 'arrow-up',
  },
  urgent: {
    value: 'urgent',
    label: 'Urgent',
    color: '#B3261E',
    bgColor: '#FFDDD6',
    icon: 'alert-triangle',
  },
};

// Request Type Definitions
export type RequestType = 
  | 'advance_request'
  | 'reimbursement'
  | 'purchase_request'
  | 'budget_request'
  | 'other';

export interface RequestTypeConfig {
  value: RequestType;
  label: string;
  description: string;
  icon: string;
  defaultPriority: PriorityType;
}

export const REQUEST_TYPES: Record<RequestType, RequestTypeConfig> = {
  advance_request: {
    value: 'advance_request',
    label: 'Advance Request',
    description: 'Request for funds in advance',
    icon: 'wallet',
    defaultPriority: 'medium',
  },
  reimbursement: {
    value: 'reimbursement',
    label: 'Reimbursement',
    description: 'Expense reimbursement claim',
    icon: 'receipt',
    defaultPriority: 'medium',
  },
  purchase_request: {
    value: 'purchase_request',
    label: 'Purchase Request',
    description: 'Request to purchase goods/services',
    icon: 'shopping-cart',
    defaultPriority: 'medium',
  },
  budget_request: {
    value: 'budget_request',
    label: 'Budget Request',
    description: 'Request for budget allocation',
    icon: 'pie-chart',
    defaultPriority: 'high',
  },
  other: {
    value: 'other',
    label: 'Other',
    description: 'Other types of requests',
    icon: 'file-text',
    defaultPriority: 'low',
  },
};

// Helper function to get status color
export const getStatusColor = (status: RequestStatusType): string => {
  return REQUEST_STATUSES[status]?.color || '#95A5A6';
};

export const getStatusBgColor = (status: RequestStatusType): string => {
  return REQUEST_STATUSES[status]?.bgColor || '#F2F3F4';
};

// Helper function to get priority color
export const getPriorityColor = (priority: PriorityType): string => {
  return PRIORITIES[priority]?.color || '#49454F';
};

export const getPriorityBgColor = (priority: PriorityType): string => {
  return PRIORITIES[priority]?.bgColor || '#E8E8E8';
};

// Helper function to check if status can transition
export const canTransition = (
  currentStatus: RequestStatusType,
  newStatus: RequestStatusType
): boolean => {
  return REQUEST_STATUSES[currentStatus]?.nextStatuses.includes(newStatus) || false;
};