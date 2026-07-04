export interface Company {
  id: number;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyCreatePayload {
  name: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  comment?: string | null;
}

export interface CompanyUpdatePayload {
  name?: string;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  comment?: string | null;
  is_active?: boolean;
}
