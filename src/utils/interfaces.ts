export interface ApiResponse<T = any> {
  executed: boolean;
  message: string;
  data: T | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  is_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id?: string;
  table_name: string;
  operation: string;
  record_id: string;
  changed_data: any;
  changed_by: string;
  created_at: Date;
  updated_at: Date;
}
