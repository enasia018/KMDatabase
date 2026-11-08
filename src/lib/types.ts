export type MembershipStatus = 'Active' | 'Inactive' | 'Pending' | 'Suspended';
export type UnitStatus = 'Active' | 'Maintenance' | 'Inactive';
export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';
export type PaymentType =
  | 'Membership Fee'
  | 'Franchise Processing Fee'
  | 'Monthly Dues'
  | 'Monthly Franchise Due'
  | 'Terminal / Dispatch Fee'
  | 'Franchise Renewal'
  | 'GPS Dues'
  | 'IDs'
  | 'Uniform'
  | 'Corporate Jacket'
  | 'T-Shirts'
  | 'Insurance / TPL'
  | 'Penalty / Surcharge'
  | 'Other';

export type PaymentMethod =
  | 'Cash'
  | 'GCash'
  | 'Maya'
  | 'Bank Transfer (BDO)'
  | 'Bank Transfer (BPI)'
  | 'Bank Transfer (Other)'
  | 'Check'
  | 'Other';

export type DocumentCategory =
  | 'OR_CR'
  | 'FRANCHISE_PERMIT'
  | 'DRIVER_LICENSE'
  | 'INSURANCE'
  | 'VALID_ID'
  | 'PAYMENT_RECEIPT'
  | 'MEMBERSHIP_CONTRACT'
  | 'OTHER';

export interface Member {
  id: string;
  member_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  contact_number: string;
  id_number?: string;
  authorized_driver_ids?: string;
  address: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_number?: string;
  status: MembershipStatus;
  join_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Included relations when loaded with details
  units?: Unit[];
  payments?: Payment[];
  documents?: DocumentAttachment[];
}

export interface Unit {
  id: string;
  member_id: string;
  unit_name: string; // e.g. Toyota HiAce Grandia, Nissan Urvan
  plate_number: string; // e.g. NAA 1234
  model_year?: string;
  color?: string;
  engine_number?: string;
  chassis_number?: string;
  mv_file_number?: string;
  seating_capacity?: number;
  franchise_case_number?: string;
  pami_renewal_date?: string;
  lto_registration_renewal_date?: string;
  route_details?: string;
  status: UnitStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  member_id: string;
  unit_id?: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  amount: number;
  reference_number?: string;
  coverage_period?: string; // e.g., "Nov 2026"
  payment_date: string;
  status: PaymentStatus;
  notes?: string;
  receipt_doc_id?: string;
  created_at: string;
  // joined member info
  member_name?: string;
  unit_name?: string;
}

export interface DocumentAttachment {
  id: string;
  member_id: string;
  unit_id?: string;
  title: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data?: string; // Stored by the server; list responses omit the file contents.
  expiry_date?: string;
  notes?: string;
  uploaded_at: string;
  member_name?: string;
}

export interface DashboardStats {
  totalMembers: number;
  totalUnits: number;
  totalCollectedThisMonth: number;
  pendingPaymentsCount: number;
  upcomingRenewalsCount: number;
}
