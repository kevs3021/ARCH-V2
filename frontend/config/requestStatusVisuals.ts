// config/requestStatusVisuals.ts
// Request status visual configuration for the advances-requests workflow

export type RequestStatusCode =
  | 'OPEN'
  | 'FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FOR_CREDITING'
  | 'CREDITED'
  | 'FOR_LIQUIDATION'
  | 'LIQUIDATED'
  | 'VALIDATED'
  | 'CLOSED';

export interface StatusVisual {
  label: string;
  color: string;
  bgColor: string;
}

export const REQUEST_STATUS_VISUALS: Record<RequestStatusCode, StatusVisual> = {
  OPEN: {
    label: 'Open',
    color: '#B3261E',
    bgColor: '#FFDAD6',
  },
  FOR_APPROVAL: {
    label: 'For Approval',
    color: '#DC6803',
    bgColor: '#FFF4E5',
  },
  APPROVED: {
    label: 'Approved',
    color: '#E87800',
    bgColor: '#FFE0B2',
  },
  REJECTED: {
    label: 'Rejected',
    color: '#D32F2F',
    bgColor: '#FFCDD2',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: '#79747E',
    bgColor: '#E8E8E8',
  },
  FOR_LIQUIDATION: {
    label: 'For Liquidation',
    color: '#1565C0',
    bgColor: '#E3F2FD',
  },
  LIQUIDATED: {
    label: 'Liquidated',
    color: '#0D47A1',
    bgColor: '#BBDEFB',
  },
  VALIDATED: {
    label: 'Validated',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
  },
  CLOSED: {
    label: 'Closed',
    color: '#1B5E20',
    bgColor: '#C8E6C9',
  },
  FOR_CREDITING: {
    label: 'For Crediting',
    color: '#F9A825',
    bgColor: '#FFF9C4',
  },
  CREDITED: {
    label: 'Credited',
    color: '#9C7C00',
    bgColor: '#FFF3CD',
  },
};

export const getRequestStatusVisual = (status: string): StatusVisual => {
  const normalized = status.replace(/\s+/g, '_').toUpperCase() as RequestStatusCode;
  return REQUEST_STATUS_VISUALS[normalized] ?? {
    label: status,
    color: '#79747E',
    bgColor: '#E8E8E8',
  };
};
