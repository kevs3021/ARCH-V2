// Breakdown Types
export interface Breakdown {
  breakdown_id: string;
  particulars: string;
  amount: number | null;
  purpose: string | null;
  store: string | null;
  status: string;
  recorded: boolean;
  request_id: string;
  requestor_id: string;
  submitted_at: string | null;
  created_at: string;
}

// History Entry Types
export interface HistoryEntry {
  action: string;
  user: string;
  timestamp: string;
  from_status?: string;
  to_status?: string;
}

// Request Document Types
export interface RequestDocument {
  document_id: string;
  request_id: string;
  name: string;
  file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar_url?: string;
  lark_user_id?: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer';

export interface UserProfile extends Omit<User, 'department'> {
  department?: Department;
}

// Department Types
export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager_id?: string;
  created_at: string;
}

// Request Types
export interface Request {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  status: RequestStatus;
  priority: Priority;
  requested_by: string;
  requested_to?: string;
  assigned_to?: string;
  amount?: number;
  currency?: string;
  department_id: string;
  attachments?: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type RequestType = 
  | 'advance_request'
  | 'reimbursement'
  | 'purchase_request'
  | 'budget_request'
  | 'other';

export type RequestStatus = 
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// Liquidation Types
export interface Liquidation {
  id: string;
  request_id: string;
  amount: number;
  currency: string;
  status: LiquidationStatus;
  submitted_by: string;
  reviewed_by?: string;
  attachments: LiquidationAttachment[];
  notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export type LiquidationStatus = 
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'reconciled';

export interface LiquidationAttachment {
  id: string;
  filename: string;
  file_type: string;
  file_path: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  request_id?: string;
  liquidation_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  reference_number?: string;
  recorded_by: string;
  created_at: string;
}

export type TransactionType = 
  | 'advance'
  | 'reimbursement'
  | 'adjustment';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LarkUserInfo {
  union_id: string;
  user_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

// File Upload Types
export interface UploadedFile {
  id: string;
  filename: string;
  original_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface FileUploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

// Dashboard Types
export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  totalLiquidations: number;
  pendingLiquidations: number;
  totalAmount: number;
  pendingAmount: number;
}

export interface RecentActivity {
  id: string;
  type: 'request' | 'liquidation' | 'transaction';
  action: string;
  description: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

// Filter and Sort Types
export interface FilterOptions {
  status?: RequestStatus[];
  type?: RequestType[];
  priority?: Priority[];
  department_id?: string;
  requested_by?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Form Types
export interface RequestFormData {
  title: string;
  description: string;
  type: RequestType;
  priority: Priority;
  amount?: number;
  currency?: string;
  department_id: string;
  requested_to?: string;
  due_date?: string;
  attachments?: File[];
}

export interface LiquidationFormData {
  request_id: string;
  amount: number;
  currency: string;
  notes?: string;
  attachments: File[];
}